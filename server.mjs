#!/usr/bin/env node
/**
 * pactlio-mcp — stdio bridge to the hosted Pactlio MCP server.
 *
 * Runs a local stdio MCP server (so it can be built, launched, and inspected
 * anywhere) and forwards tool calls to the hosted endpoint at
 * https://www.pactlio.com/api/mcp (stateless JSON-RPC over Streamable HTTP).
 * The tool list ships embedded (tools.json) so discovery works even offline;
 * live tool calls require network access.
 *
 * No API key, no configuration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENDPOINT = process.env.PACTLIO_MCP_URL || 'https://www.pactlio.com/api/mcp';
const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC_TOOLS = JSON.parse(readFileSync(join(HERE, 'tools.json'), 'utf-8'));

let rpcId = 0;

/** Forward one JSON-RPC request to the hosted endpoint and parse the SSE-framed response. */
async function forward(method, params) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  if (!res.ok) throw new Error(`Pactlio endpoint returned HTTP ${res.status}`);
  const text = await res.text();

  // Response is either plain JSON or an SSE frame ("event: message\ndata: {...}")
  let payload = text.trim();
  if (payload.includes('data: ')) {
    const dataLine = payload.split('\n').find((l) => l.startsWith('data: '));
    payload = dataLine.slice(6);
  }
  const parsed = JSON.parse(payload);
  if (parsed.error) throw new Error(parsed.error.message || 'Upstream MCP error');
  return parsed.result;
}

const server = new Server(
  { name: 'pactlio-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Prefer the live list (stays current); fall back to the embedded manifest
  try {
    const result = await forward('tools/list', {});
    if (result?.tools?.length) return { tools: result.tools };
  } catch {
    // offline or upstream unavailable — embedded manifest keeps discovery working
  }
  return { tools: STATIC_TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return await forward('tools/call', request.params);
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Could not reach the Pactlio API (${err.message}). This bridge forwards calls to ${ENDPOINT} — check network access and try again.`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[pactlio-mcp] stdio bridge running — forwarding to', ENDPOINT);
