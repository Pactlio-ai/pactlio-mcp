/**
 * Pactlio OpenClaw plugin — exposes Pactlio's contract tools to OpenClaw agents.
 * Thin client: every handler POSTs a JSON-RPC tools/call to the public
 * Pactlio MCP endpoint. No auth, no dependencies.
 */
const MCP_URL = process.env.PACTLIO_MCP_URL || 'https://www.pactlio.com/api/mcp';

let rpcId = 0;

/** Call a tool on the remote MCP server and return its parsed payload. */
async function callMcpTool(name, args) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++rpcId,
      method: 'tools/call',
      params: { name, arguments: args || {} },
    }),
  });

  const raw = await res.text();
  // Streamable HTTP may answer as SSE ("event: message\ndata: {...}") or plain JSON.
  let message = raw.trim();
  if (message.includes('data:')) {
    const dataLine = message.split('\n').find((l) => l.startsWith('data:'));
    message = dataLine ? dataLine.slice(5).trim() : message;
  }

  let parsed;
  try {
    parsed = JSON.parse(message);
  } catch {
    return { success: false, error: `Unexpected MCP response (HTTP ${res.status})` };
  }
  if (parsed.error) return { success: false, error: parsed.error.message || 'MCP error' };

  const content = parsed.result && parsed.result.content;
  const textBlock = Array.isArray(content) && content.find((c) => c.type === 'text');
  let data = textBlock ? textBlock.text : null;
  try {
    data = data ? JSON.parse(data) : null;
  } catch {
    /* tool returned plain text — pass through */
  }
  if (parsed.result && parsed.result.isError) {
    return { success: false, error: (data && data.error) || data || 'Tool error' };
  }
  return { success: true, data };
}

const str = (description, extra) => ({ type: 'string', description, ...(extra || {}) });

const tools = [
  {
    name: 'pactlio_contracts_list_types',
    description:
      'List all contract and legal document types Pactlio can generate, with descriptions, use cases, and USD prices.',
    parameters: { type: 'object', properties: {}, required: [] },
    handler: () => callMcpTool('list_contract_types', {}),
  },
  {
    name: 'pactlio_contracts_jurisdiction_requirements',
    description:
      'Statute-cited legal requirements, pitfalls, and FAQs for a contract type in a US state or country.',
    parameters: {
      type: 'object',
      properties: {
        contract_slug: str('Contract slug, e.g. "non-compete", "contractor-agreement"'),
        jurisdiction_slug: str('Jurisdiction slug, e.g. "california", "us", "uk"'),
      },
      required: ['contract_slug', 'jurisdiction_slug'],
    },
    handler: (p) => callMcpTool('get_jurisdiction_requirements', p),
  },
  {
    name: 'pactlio_contracts_non_compete_check',
    description: 'Whether a non-compete is enforceable, limited, or void in a US state (all 50 + DC), with statutes.',
    parameters: {
      type: 'object',
      properties: { state: str('US state name, e.g. "California"') },
      required: ['state'],
    },
    handler: (p) => callMcpTool('check_non_compete_enforceability', p),
  },
  {
    name: 'pactlio_contracts_intake_questions',
    description: 'The questions/fields needed to draft a given contract type. Use before starting a draft.',
    parameters: {
      type: 'object',
      properties: {
        contract_type: str('Contract type id, e.g. "nda_mutual"'),
        jurisdiction: str('Optional jurisdiction filter, e.g. "california"'),
      },
      required: ['contract_type'],
    },
    handler: (p) => callMcpTool('get_intake_questions', p),
  },
  {
    name: 'pactlio_contracts_start_draft',
    description:
      'Start drafting a contract with Pactlio\'s multi-agent AI engine (3-5 min, async). Returns a preview_id to poll. Free preview; full contract unlocked by a human via checkout.',
    parameters: {
      type: 'object',
      properties: {
        contract_type: str('Contract type id from list_types, e.g. "nda_mutual"'),
        jurisdiction: str('Jurisdiction id, e.g. "california", "us_general"'),
        deal_summary: {
          type: 'object',
          description: 'Answers keyed by field from intake_questions, e.g. {"parties":{"you":"Acme","other":"Jane"}}',
        },
      },
      required: ['contract_type', 'deal_summary'],
    },
    handler: (p) => callMcpTool('start_contract_draft', p),
  },
  {
    name: 'pactlio_contracts_draft_status',
    description: 'Poll a draft started with start_draft. When complete returns the free preview + unlock link.',
    parameters: {
      type: 'object',
      properties: { preview_id: str('The preview_id from start_draft') },
      required: ['preview_id'],
    },
    handler: (p) => callMcpTool('get_draft_status', p),
  },
  {
    name: 'pactlio_contracts_checkout_link',
    description: 'Get the URL where a human pays to unlock the full drafted contract. Share it with your user.',
    parameters: {
      type: 'object',
      properties: { preview_id: str('The preview_id from start_draft') },
      required: ['preview_id'],
    },
    handler: (p) => callMcpTool('get_checkout_link', p),
  },
  {
    name: 'pactlio_contracts_analyze',
    description:
      'AI risk analysis of contract text: red flags, one-sided clauses, missing protections, questions to ask. 2/day.',
    parameters: {
      type: 'object',
      properties: {
        contract_text: str('Contract text to analyze (200-50,000 chars)'),
        focus: str('Optional focus, e.g. "IP ownership"'),
      },
      required: ['contract_text'],
    },
    handler: (p) => callMcpTool('analyze_contract', p),
  },
];

module.exports = function register(ctx) {
  for (const tool of tools) {
    ctx.registerTool(tool);
  }
};
module.exports.tools = tools;
