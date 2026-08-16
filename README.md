# Pactlio MCP — Contract Tools for AI Agents

Remote [Model Context Protocol](https://modelcontextprotocol.io) server exposing [Pactlio](https://www.pactlio.com)'s AI contract engine to agents. Free, anonymous, no API key.

**Endpoint:** `https://www.pactlio.com/api/mcp` (Streamable HTTP)

Docs: https://www.pactlio.com/mcp

## Connect

**Claude Code**
```bash
claude mcp add --transport http pactlio https://www.pactlio.com/api/mcp
```

**Cursor / VS Code / any MCP client (`mcp.json`)**
```json
{
  "mcpServers": {
    "pactlio": { "url": "https://www.pactlio.com/api/mcp" }
  }
}
```

**Claude.ai / ChatGPT** — add as a custom connector with the endpoint URL.

**OpenClaw** — see [`openclaw-plugin/`](./openclaw-plugin) and [`skills/pactlio/`](./skills/pactlio).

## Tools

| Tool | What it does | Limits |
|---|---|---|
| `list_contract_types` | 20 contract/policy types with use cases and pricing | 30/min |
| `get_jurisdiction_requirements` | Statute-cited requirements per contract type × US state / country | 30/min |
| `check_non_compete_enforceability` | Non-compete status for all 50 states + DC | 30/min |
| `get_intake_questions` | Fields needed to draft each contract type | 30/min |
| `start_contract_draft` | Multi-agent AI drafting (async, 3–5 min); requires `accept_terms: true` | 2/day |
| `get_draft_status` | Poll a draft; returns free preview + unlock link | 30/min |
| `get_checkout_link` | URL where a human unlocks the full contract ($19–49) | 30/min |
| `analyze_contract` | Risk analysis of pasted contract text | 2/day |

## Typical agent flow

1. `list_contract_types` → pick the document
2. `get_jurisdiction_requirements` → check state-specific rules
3. `get_intake_questions` → collect details from your user
4. Confirm with your user that they accept the [Terms of Use](https://www.pactlio.com/terms) and understand the output is an AI-generated draft for review
5. `start_contract_draft` with `accept_terms: true` → kick off generation (rejected without it)
6. `get_draft_status` → poll until complete, show the free preview
7. `get_checkout_link` → hand your user the unlock URL

## Freemium model

Knowledge tools are free and fast (pure data, no LLM). Drafting and analysis are free with daily per-IP limits. Drafts return the opening sections; a human unlocks the full contract via checkout.

## Legal

Pactlio is not a law firm and does not provide legal advice; using these tools creates no attorney-client relationship. Every output is an AI-generated draft for review — have it reviewed before relying on it. Drafting requires the end user's acceptance of the [Terms of Use](https://www.pactlio.com/terms) (`accept_terms: true`), and draft-returning tools repeat the disclaimer and terms link in every response. Agents integrating these tools must surface that disclaimer to their users rather than strip it.

## What's in this repo

- [`server.json`](./server.json) — MCP registry manifest
- [`openclaw-plugin/`](./openclaw-plugin) — OpenClaw plugin exposing the same tools as `pactlio_contracts_*`
- [`skills/pactlio/`](./skills/pactlio) — OpenClaw skill describing the contract workflow

The server itself runs inside the Pactlio app; this repo holds the client-side wrappers and manifests.

## Support

https://www.pactlio.com/contact
