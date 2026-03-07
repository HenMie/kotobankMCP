# kotobankMCP

[简体中文](README.zh.md) | English

![Node >=20](https://img.shields.io/badge/node-%3E%3D20-43853d)
![License MIT](https://img.shields.io/badge/license-MIT-blue)
![MCP](https://img.shields.io/badge/MCP-stdio-7b61ff)

An installable MCP server and bundled workflow skills for looking up Japanese
words from [Kotobank](https://kotobank.jp).

## Overview

`kotobankMCP` provides a practical, local-first Japanese dictionary workflow:

- `kotobank_search` searches Kotobank and ranks likely matches.
- `kotobank_lookup` resolves a query into structured dictionary entries.
- `skills/` ships reusable workflow docs for lookup, disambiguation, and
  Chinese explanations.

The v1 pipeline is fixed and explicit:

`Kotobank search → candidate ranking → canonical word page fetch → article / anchor parsing → structured result`

No silent fallback is added. Empty results, ambiguity, network failures, and DOM
changes are surfaced as explicit errors or disambiguation responses.

## Contents

- `src/` — MCP server, fetcher, parsers, ranking logic, and skill installer
- `skills/` — project-level workflow assets, not platform-specific skill bundles
- `tests/` — parser fixtures, ranking tests, service tests, and live smoke tests

## Key Capabilities

- Exposes `kotobank_search` with `query`, `dictionaryScope`, and `maxResults`
- Exposes `kotobank_lookup` with `preferredDictionaries`, `maxEntries`,
  `includeExcerpt`, plus optional `canonicalUrl` / `anchorId` for explicit
  selection
- Prefers `/word/` results and Japanese monolingual dictionaries by default
- Returns `needsDisambiguation: true` instead of guessing when candidates stay
  too close
- Parses `page_link_marker` and `article.dictype` relationships from word pages
- Keeps a short in-memory HTML cache and request de-duplication only

## Components

- `src/index.ts` — `stdio` MCP entrypoint
- `src/server.ts` — tool registration and structured error responses
- `src/kotobank/search-parser.ts` — Kotobank search result parsing
- `src/kotobank/word-parser.ts` — canonical word page parsing
- `src/install-skills.ts` — installs bundled skills into any target directory

## Quick Start

### Run directly from GitHub

```bash
npx --yes --package=github:HenMie/kotobankMCP kotobank-mcp
```

### Install globally

```bash
npm install -g github:HenMie/kotobankMCP
kotobank-mcp
```

### Example MCP host config

```json
{
  "mcpServers": {
    "kotobank": {
      "command": "npx",
      "args": [
        "--yes",
        "--package=github:HenMie/kotobankMCP",
        "kotobank-mcp"
      ]
    }
  }
}
```

## Tools

### `kotobank_search`

Input:

```json
{
  "query": "科学",
  "dictionaryScope": "jp-monolingual",
  "maxResults": 8
}
```

Output shape:

```json
{
  "query": "科学",
  "totalCandidates": 3,
  "candidates": [
    {
      "title": "科学【かがく】",
      "dictionaryName": "デジタル大辞泉",
      "canonicalUrl": "https://kotobank.jp/word/科学-43288",
      "anchorId": "w-1234567",
      "pathType": "word",
      "score": 12345
    }
  ]
}
```

### `kotobank_lookup`

Input:

```json
{
  "query": "食べる",
  "maxEntries": 2,
  "includeExcerpt": false
}
```

If the query is ambiguous, the tool returns `needsDisambiguation: true` and a
ranked `candidates` array. Pass the chosen `canonicalUrl` and optional
`anchorId` back into `kotobank_lookup` to resolve the exact target.

## Bundled Skills

These skills are part of the repository output and can be installed anywhere.
They are workflow documents for the host agent, not Codex-only skill manifests.

Included files:

- `lookup-japanese-word.md`
- `disambiguate-kotobank-result.md`
- `explain-japanese-word-in-chinese.md`

### Install bundled skills

```bash
kotobank-mcp-install-skills --target ./skills
```

One-shot install without global package installation:

```bash
npm exec --yes --package=github:HenMie/kotobankMCP \
  kotobank-mcp-install-skills -- --target ./skills
```

Overwrite existing files if needed:

```bash
kotobank-mcp-install-skills --target ./skills --force
```

## Development

```bash
npm install
npm run build
npm test
```

Run the server locally:

```bash
npm run start
```

Run live smoke tests against the real site:

```bash
npm run test:live
```

## Project Structure

```text
kotobankMCP/
├── skills/
├── src/
│   ├── install-skills.ts
│   ├── server.ts
│   └── kotobank/
├── tests/
├── package.json
└── README.zh.md
```

## Notes

- This project targets personal, local MCP use first.
- The search adapter currently reads Kotobank search pages and is isolated for
  future replacement if needed.
- No persistent cache or offline corpus is bundled in v1.

## License

MIT. See [LICENSE](LICENSE).
