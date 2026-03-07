# Explain Japanese Word in Chinese

## 目的

把 `kotobank_lookup` 的结构化结果整理成中文用户能直接阅读的查词答案。

## 输入前提

- 已拿到 `kotobank_lookup` 结果
- `needsDisambiguation` 为 `false`

## 推荐结构

1. 第一行给中文总释义
2. 第二行给日文原表记与读音
3. 然后按词典来源补充说明
4. 最后给 Kotobank 链接

## 输出约束

- 优先意译，不机械直译
- 不长段照抄原文字典内容
- 若不同词典侧重点不同，要明确指出差异
