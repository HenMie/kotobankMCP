# kotobankMCP

[简体中文](README.zh.md) | English

![Node >=20](https://img.shields.io/badge/node-%3E%3D20-43853d)
![License MIT](https://img.shields.io/badge/license-MIT-blue)
![Skill](https://img.shields.io/badge/skill-self--contained-7b61ff)

A self-contained Kotobank skill package for Japanese dictionary lookup, plus an
optional MCP compatibility server.

## Overview

`kotobankMCP` now ships two artifacts with different roles:

- `.agents/skills/kotobank-japanese-dictionary/`: the primary deliverable, a
  generic skill package with a bundled Node CLI
- `kotobank-mcp`: an optional `stdio` MCP server for platforms that still prefer
  an MCP integration

The skill no longer depends on external MCP tools to perform lookup. After the
skill folder is installed, the bundled CLI can search and look up Kotobank
entries directly.

The lookup pipeline stays explicit:

`Kotobank search → candidate ranking → canonical word page fetch → article / anchor parsing → structured result`

No silent fallback is added. Empty results, ambiguity, network failures, and DOM
changes are surfaced as explicit errors or disambiguation responses.

## Install the Skill Package

The packaged skill source of truth is:

```text
.agents/skills/kotobank-japanese-dictionary/
```

The delivered structure is:

```text
kotobank-japanese-dictionary/
├── SKILL.md
├── references/
│   └── cli-usage.md
└── scripts/
    └── kotobank-cli.mjs
```

### One-shot install from GitHub

```bash
npm exec --yes --package=github:HenMie/kotobankMCP \
  kotobank-mcp-install-skills -- --target ~/.agents/skills
```

After installation, the target root contains:

```text
~/.agents/skills/
└── kotobank-japanese-dictionary/
    ├── SKILL.md
    ├── references/
    └── scripts/
```

### Copy into a skills root after package install

```bash
kotobank-mcp-install-skills --target ~/.agents/skills
```

### Run the bundled CLI directly

```bash
node ~/.agents/skills/kotobank-japanese-dictionary/scripts/kotobank-cli.mjs \
  lookup --query 食べる --max-entries 2
```

```bash
node ~/.agents/skills/kotobank-japanese-dictionary/scripts/kotobank-cli.mjs \
  search --query 科学
```

The CLI prints JSON to `stdout`. On failure, it prints a JSON error payload to
`stderr` and exits with a non-zero status.

## Skill Behavior

The bundled skill uses the local CLI instead of external MCP tools.

- `lookup` is the default entrypoint
- `search` is used for explicit candidate comparison and disambiguation
- ambiguity is returned as structured JSON with `needsDisambiguation: true`
- final answers should be organized as Chinese explanation + Japanese headword /
  reading + source dictionaries + Kotobank link

See `references/cli-usage.md` inside the skill package for the supported CLI
flags.

## Optional MCP Compatibility

If a platform still prefers MCP, this repository also ships an optional MCP
server:

```bash
npx --yes --package=github:HenMie/kotobankMCP kotobank-mcp
```

Example host config:

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

## Development

```bash
npm install
npm run build
npm test
```

Run live smoke tests against the real site:

```bash
npm run test:live
npm run test:packaged-skill
```

## Project Structure

```text
kotobankMCP/
├── .agents/
│   └── skills/
│       └── kotobank-japanese-dictionary/
│           ├── SKILL.md
│           ├── references/
│           └── scripts/
├── scripts/
├── src/
├── tests/
├── package.json
├── README.md
└── README.zh.md
```

## License

MIT. See [LICENSE](LICENSE).
