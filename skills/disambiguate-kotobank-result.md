# Disambiguate Kotobank Result

## 目的

在 `kotobank_lookup` 返回 `needsDisambiguation: true` 时，指导宿主 Agent 缩小候选范围。

## 何时使用

- 用户输入过短或语义过泛
- `kotobank_lookup` 返回空 `entries` 且附带 `candidates`
- 用户需要在多个词条、多个表记或相关词之间选择

## 工作流

1. 调用 `kotobank_search`
2. 阅读排序后的 `candidates`
3. 优先解释 `/word/` 路径的高分候选
4. 用自然语言比较候选差异
5. 等用户确认后，把候选里的 `canonicalUrl` 和可选 `anchorId`
   传回 `kotobank_lookup`

## 输出约束

- 不要替用户擅自拍板
- 默认展示前 `3` 个候选
- 每个候选至少说明 `title`、`dictionaryName`、`canonicalUrl`
