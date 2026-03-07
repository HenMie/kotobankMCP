# Lookup Japanese Word

## 目的

为宿主 Agent 提供标准查词路径，优先直接调用 `kotobank_lookup`。

## 何时使用

- 用户要查日语词义、读音、用法、词典来源
- 用户已经给出明确词面，希望直接得到结果

## 工作流

1. 先调用 `kotobank_lookup`
2. 必填 `query`
3. 如用户指定偏好词典，再传入 `preferredDictionaries`
4. 默认把 `maxEntries` 控制在 `2` 到 `3`
5. 如果 `needsDisambiguation` 为 `false`，整理最终回答

## 输出约束

- 先给中文概括，再给日文原表记和读音
- 保留 `dictionaryName` 与 `canonicalUrl`
- 避免大段复制 `summaryText`

