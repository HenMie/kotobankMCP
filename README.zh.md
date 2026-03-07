# kotobankMCP

简体中文 | [English](README.md)

![Node >=20](https://img.shields.io/badge/node-%3E%3D20-43853d)
![License MIT](https://img.shields.io/badge/license-MIT-blue)
![MCP](https://img.shields.io/badge/MCP-stdio-7b61ff)

一个可直接安装的 MCP 服务端，以及随仓库交付的日语查词 workflow
skills，用于从 [Kotobank](https://kotobank.jp) 获取结构化日语词典结果。

## 项目简介

`kotobankMCP` 提供一条面向本机使用的日语查词链路：

- `kotobank_search`：搜索 Kotobank 并排序候选词条
- `kotobank_lookup`：把查询解析成结构化词典条目
- `skills/`：提供查词、消歧、中文释义整理的工作流文档

首版链路固定为：

`Kotobank search → 候选排序 → canonical 词条页抓取 → article / anchor 解析 → 结构化结果`

项目不会做静默 fallback。无结果、候选歧义、网络异常、DOM 结构变化，都会显式返回错误或 `needsDisambiguation`。

## 仓库内容

- `src/`：MCP 服务端、抓取器、解析器、排序逻辑、skills 安装器
- `skills/`：项目级 workflow 资产，不依赖平台专属技能协议
- `tests/`：解析 fixture、排序测试、服务测试、真实站点烟测

## 关键能力

- 提供 `kotobank_search`，输入支持 `query`、`dictionaryScope`、`maxResults`
- 提供 `kotobank_lookup`，支持 `preferredDictionaries`、`maxEntries`、`includeExcerpt`，以及显式选择用的 `canonicalUrl` / `anchorId`
- 默认优先 `/word/` 路径和日语单语辞典结果
- 当高分候选过于接近时返回 `needsDisambiguation: true`，而不是替用户猜词
- 解析词条页中的 `page_link_marker` 与 `article.dictype` 映射关系
- 仅保留进程内短 TTL 缓存与请求去重，不做持久化全文缓存

## 系统组件

- `src/index.ts`：`stdio` MCP 入口
- `src/server.ts`：工具注册与结构化错误输出
- `src/kotobank/search-parser.ts`：搜索结果解析
- `src/kotobank/word-parser.ts`：词条页解析
- `src/install-skills.ts`：把仓库内 skills 安装到任意目录

## 快速开始

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

## 工具说明

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

如果候选存在歧义，工具会返回 `needsDisambiguation: true` 和排好序的 `candidates`。宿主可把选中的 `canonicalUrl` 与可选 `anchorId` 再传回 `kotobank_lookup`，实现精确解析。

## 项目内 Skills

这些 skills 是仓库交付物的一部分，可安装到任意目录。它们是给宿主 Agent 用的工作流文档，不是 Codex 专属技能清单。

内置文件：

- `lookup-japanese-word.md`
- `disambiguate-kotobank-result.md`
- `explain-japanese-word-in-chinese.md`

### 安装 skills

```bash
kotobank-mcp-install-skills --target ./skills
```

如果不想先全局安装，可直接一次性执行：

```bash
npm exec --yes --package=github:HenMie/kotobankMCP \
  kotobank-mcp-install-skills -- --target ./skills
```

如需覆盖已有文件：

```bash
kotobank-mcp-install-skills --target ./skills --force
```

## 开发与验证

```bash
npm install
npm run build
npm test
```

本地启动服务：

```bash
npm run start
```

运行真实站点烟测：

```bash
npm run test:live
```

## 目录结构

```text
kotobankMCP/
├── skills/
├── src/
│   ├── install-skills.ts
│   ├── server.ts
│   └── kotobank/
├── tests/
├── package.json
└── README.md
```

## 说明

- 项目首要目标是个人、本机 MCP 查词使用场景
- 搜索适配层当前直接读取 Kotobank 搜索页，并已与解析逻辑隔离，方便后续替换
- v1 不附带持久化缓存，也不内置离线词库

## 许可证

MIT，见 [LICENSE](LICENSE)。
