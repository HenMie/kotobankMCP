# kotobankMCP

简体中文 | [English](README.md)

![Node >=20](https://img.shields.io/badge/node-%3E%3D20-43853d)
![License MIT](https://img.shields.io/badge/license-MIT-blue)
![Skill](https://img.shields.io/badge/skill-self--contained-7b61ff)

一个自包含的 Kotobank 通用 skill 包，外加一个可选的 MCP 兼容服务端。

## 项目简介

`kotobankMCP` 现在同时交付两类成果，但定位不同：

- `.agents/skills/kotobank-japanese-dictionary/`：主交付物，一个带内置
  Node CLI 的通用 skill 包
- `kotobank-mcp`：可选的 `stdio` MCP server，给仍然偏好 MCP 接入的平台
  使用

skill 现在已经不再依赖外部 MCP tools 才能查词。只要 skill 目录被安装好，
其中的 CLI 就能直接完成 Kotobank 搜索和查词。

查词链路保持显式：

`Kotobank search → 候选排序 → canonical 词条页抓取 → article / anchor 解析 → 结构化结果`

项目不会做静默 fallback。无结果、候选歧义、网络异常、DOM 结构变化，
都会显式返回错误或消歧响应。

## 安装 Skill 包

包内 skill 的正式目录是：

```text
.agents/skills/kotobank-japanese-dictionary/
```

当前交付结构为：

```text
kotobank-japanese-dictionary/
├── SKILL.md
├── references/
│   └── cli-usage.md
└── scripts/
    └── kotobank-cli.mjs
```

### 直接从 GitHub 一次性安装

```bash
npm exec --yes --package=github:HenMie/kotobankMCP \
  kotobank-mcp-install-skills -- --target ~/.agents/skills
```

安装后，目标目录结构如下：

```text
~/.agents/skills/
└── kotobank-japanese-dictionary/
    ├── SKILL.md
    ├── references/
    └── scripts/
```

### 已安装包时复制到宿主的 skills 根目录

```bash
kotobank-mcp-install-skills --target ~/.agents/skills
```

### 直接运行 skill 内置 CLI

```bash
node ~/.agents/skills/kotobank-japanese-dictionary/scripts/kotobank-cli.mjs \
  lookup --query 食べる --max-entries 2
```

```bash
node ~/.agents/skills/kotobank-japanese-dictionary/scripts/kotobank-cli.mjs \
  search --query 科学
```

CLI 成功时把 JSON 输出到 `stdout`；失败时把 JSON 错误输出到 `stderr`，并
返回非零退出码。

## Skill 行为

这个 skill 通过本地 CLI 工作，不再依赖外部 MCP tools。

- `lookup` 是默认入口
- `search` 用于显式查看候选并做消歧
- 歧义会以 `needsDisambiguation: true` 的结构化 JSON 返回
- 最终回答应整理成：中文释义 + 日文表记/读音 + 词典来源 + Kotobank 链接

CLI 支持的完整参数见 skill 包里的 `references/cli-usage.md`。

## 可选 MCP 兼容层

如果某个平台仍然更适合 MCP 接入，仓库里也保留了一个可选 MCP server：

```bash
npx --yes --package=github:HenMie/kotobankMCP kotobank-mcp
```

宿主配置示例：

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

## 开发与验证

```bash
npm install
npm run build
npm test
```

运行真实站点与打包 smoke test：

```bash
npm run test:live
npm run test:packaged-skill
```

## 目录结构

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

## 许可证

MIT，见 [LICENSE](LICENSE)。
