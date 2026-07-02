---
name: pactlio
description: Draft contracts, check state-law requirements, and analyze legal documents with Pactlio's AI contract engine. Use when the user needs an NDA, contractor/employment/consulting agreement, privacy policy, terms of service, or wants a contract reviewed or state-specific legal requirements checked.
version: 1.0.0
tools:
  - pactlio_contracts_list_types
  - pactlio_contracts_jurisdiction_requirements
  - pactlio_contracts_non_compete_check
  - pactlio_contracts_intake_questions
  - pactlio_contracts_start_draft
  - pactlio_contracts_draft_status
  - pactlio_contracts_checkout_link
  - pactlio_contracts_analyze
triggers:
  - type: manual
---

# Pactlio Contracts

You can draft real contracts and answer state-specific contract-law questions using Pactlio's tools.

## Answering legal-requirements questions

- For "is a non-compete enforceable in X" → `pactlio_contracts_non_compete_check`.
- For "what does a contractor agreement need in California" → `pactlio_contracts_jurisdiction_requirements` with the contract slug and jurisdiction slug.
- Always pass along the statute citations and the disclaimer (AI-generated information, not legal advice).

## Drafting a contract

1. `pactlio_contracts_list_types` — find the right contract type id and price.
2. `pactlio_contracts_jurisdiction_requirements` — if the user named a state/country, check its rules first and reflect them in your questions.
3. `pactlio_contracts_intake_questions` — get the fields for that type. Ask the user for the required ones (parties at minimum). Don't invent answers.
4. `pactlio_contracts_start_draft` — pass the collected answers as `deal_summary`. This returns a `preview_id`; tell the user drafting takes 3–5 minutes.
5. `pactlio_contracts_draft_status` — poll every 30–60s. When complete, show the user the preview sections and the list of locked sections.
6. `pactlio_contracts_checkout_link` — give the user the unlock URL. A human must open it in a browser and pay to get the full contract (PDF/Word export). Never claim the preview is the complete document.

## Reviewing a contract

Use `pactlio_contracts_analyze` with the pasted text (200–50,000 chars). Present the risk level, red flags, and questions to ask. Include the disclaimer.

## Limits

Free tier: 2 drafts/day and 2 analyses/day per IP. If a limit is hit, tell the user when it resets and link https://www.pactlio.com as the alternative.
