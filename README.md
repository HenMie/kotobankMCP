# kotobankMCP

[简体中文](README.zh.md) | English

![Node >=20](https://img.shields.io/badge/node-%3E%3D20-43853d)
![License MIT](https://img.shields.io/badge/license-MIT-blue)
![MCP](https://img.shields.io/badge/MCP-stdio-7b61ff)

An installable Kotobank MCP server plus a platform-agnostic agent skill package
for Japanese dictionary lookup.

## Overview

`kotobankMCP` ships two artifacts:

- `kotobank-mcp`: a `stdio` MCP server exposing `kotobank_search` and
  `kotobank_lookup`
- `.agents/skills/kotobank-japanese-dictionary/`: a reusable skill package with
  `SKILL.md` that teaches agents when and how to use the MCP

The skill is not a platform-specific manifest. It is a generic skill folder that
can be copied into any AI platform that supports agent-style skills.

The lookup pipeline stays explicit:

`Kotobank search → candidate ranking → canonical word page fetch → article / anchor parsing → structured result`

No silent fallback is added. Empty results, ambiguity, network failures, and DOM
changes are surfaced as explicit errors or disambiguation responses.

## Key Capabilities

- Exposes `kotobank_search` for ranked Kotobank candidate discovery
- Exposes `kotobank_lookup` for structured Japanese dictionary entries
- Bundles one generic skill for lookup, disambiguation, and Chinese answer
  formatting
- Keeps MCP and skill responsibilities separate: MCP provides tools, skill
  provides usage guidance
- Preserves explicit disambiguation with `canonicalUrl` and optional `anchorId`

## Install the MCP

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

## Install the Skill Package

The packaged skill source of truth is:

```text
.agents/skills/kotobank-japanese-dictionary/
```

The minimum structure is:

```text
kotobank-japanese-dictionary/
├── SKILL.md
├── references/        # optional
└── scripts/           # optional
```

This repository currently ships one skill directory with a required `SKILL.md`
and no platform-specific metadata.

### Copy the packaged skill into a skills root

```bash
kotobank-mcp-install-skills --target ~/.agents/skills
```

After installation, the target root contains:

```text
~/.agents/skills/
└── kotobank-japanese-dictionary/
    └── SKILL.md
```

### One-shot install from GitHub

```bash
npm exec --yes --package=github:HenMie/kotobankMCP \
  kotobank-mcp-install-skills -- --target ~/.agents/skills
```

### Overwrite an existing installed skill

```bash
kotobank-mcp-install-skills --target ~/.agents/skills --force
```

## MCP Tools

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

## Development

```bash
npm install
npm run build
npm test
```

Run the live smoke tests against the real site:

```bash
npm run test:live
```

## Project Structure

```text
kotobankMCP/
├── .agents/
│   └── skills/
│       └── kotobank-japanese-dictionary/
│           └── SKILL.md
├── src/
│   ├── install-skills.ts
│   └── kotobank/
├── tests/
├── package.json
├── README.md
└── README.zh.md
```

## License

MIT. See [LICENSE](LICENSE).
