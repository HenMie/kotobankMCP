# kotobankMCP

简体中文 | [English](README.md)

![Node >=20](https://img.shields.io/badge/node-%3E%3D20-43853d)
![License MIT](https://img.shields.io/badge/license-MIT-blue)
![MCP](https://img.shields.io/badge/MCP-stdio-7b61ff)

一个可安装的 Kotobank MCP 服务端，加上一份平台无关的通用 agent skill
包，用于日语查词。

## 项目简介

`kotobankMCP` 交付两类成果：

- `kotobank-mcp`：一个 `stdio` MCP server，提供 `kotobank_search` 与
  `kotobank_lookup`
- `.agents/skills/kotobank-japanese-dictionary/`：一个通用 skill 目录，
  通过 `SKILL.md` 告诉 agent 何时以及如何调用这个 MCP

这里的 skill 不是平台私有 manifest，而是可复制到支持 agent-style
skills 的 AI 平台中的通用技能包。

查词链路保持显式：

`Kotobank search → 候选排序 → canonical 词条页抓取 → article / anchor 解析 → 结构化结果`

项目不会做静默 fallback。无结果、候选歧义、网络异常、DOM 结构变化，
都会显式返回错误或消歧响应。

## 关键能力

- 提供 `kotobank_search` 用于搜索并排序 Kotobank 候选
- 提供 `kotobank_lookup` 用于解析结构化日语词典条目
- 内置 1 个通用 skill，覆盖查词、消歧和中文答案整理
- 严格区分 MCP 与 skill 职责：MCP 提供工具，skill 提供调用策略
- 保留显式消歧能力，支持 `canonicalUrl` 和可选 `anchorId`

## 安装 MCP

### 直接从 GitHub 运行

```bash
npx --yes --package=github:HenMie/kotobankMCP kotobank-mcp
```

### 全局安装

```bash
npm install -g github:HenMie/kotobankMCP
kotobank-mcp
```

### MCP 宿主配置示例

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

## 安装通用 Skill 包

包内 skill 的正式目录是：

```text
.agents/skills/kotobank-japanese-dictionary/
```

最小结构是：

```text
kotobank-japanese-dictionary/
├── SKILL.md
├── references/        # 可选
└── scripts/           # 可选
```

当前仓库只交付 1 个 skill 目录，包含必须的 `SKILL.md`，不包含平台专属
metadata。

### 复制到宿主的 skills 根目录

```bash
kotobank-mcp-install-skills --target ~/.agents/skills
```

安装后，目标目录结构如下：

```text
~/.agents/skills/
└── kotobank-japanese-dictionary/
    └── SKILL.md
```

### 直接从 GitHub 一次性安装

```bash
npm exec --yes --package=github:HenMie/kotobankMCP \
  kotobank-mcp-install-skills -- --target ~/.agents/skills
```

### 覆盖已安装 skill

```bash
kotobank-mcp-install-skills --target ~/.agents/skills --force
```

## MCP 工具

### `kotobank_search`

输入示例：

```json
{
  "query": "科学",
  "dictionaryScope": "jp-monolingual",
  "maxResults": 8
}
```

输出结构：

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

输入示例：

```json
{
  "query": "食べる",
  "maxEntries": 2,
  "includeExcerpt": false
}
```

如果查询存在歧义，工具会返回 `needsDisambiguation: true` 和排序后的
`candidates`。宿主可把选中的 `canonicalUrl` 与可选 `anchorId` 再传回
`kotobank_lookup`，实现精确解析。

## 开发与验证

```bash
npm install
npm run build
npm test
```

运行真实站点烟测：

```bash
npm run test:live
```

## 目录结构

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

## 许可证

MIT，见 [LICENSE](LICENSE)。
