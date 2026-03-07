---
name: kotobank-japanese-dictionary
description: Use this skill when the user wants to look up a Japanese word / 日语查词, reading, meaning, usage, dictionary source, Kotobank candidate disambiguation, or a Chinese explanation based on kotobank_lookup and kotobank_search.
---

# Kotobank Japanese Dictionary

## When to use

Use this skill when the user wants any of the following:

- Look up a Japanese word, phrase, reading, or dictionary meaning
- Understand usage or nuance differences across Kotobank dictionaries
- Disambiguate multiple Kotobank candidates before choosing one
- Get the final explanation in Chinese with the original Japanese headword

## Required tools

- `kotobank_lookup`
- `kotobank_search`

## Default workflow

1. Start with `kotobank_lookup`.
2. Always pass `query`.
3. Default `maxEntries` to `2` or `3`.
4. Keep `includeExcerpt` unset or `false` unless the user explicitly asks for longer excerpts.
5. If `needsDisambiguation` is `false`, write the final answer directly from the returned entries.

## Disambiguation workflow

When `kotobank_lookup` returns `needsDisambiguation: true`:

1. Run `kotobank_search` for the same query.
2. Compare the top candidates by `title`, `dictionaryName`, `canonicalUrl`, and, when useful, `anchorId`.
3. Prefer explaining differences between candidates instead of picking one silently.
4. Ask the user to choose when multiple candidates remain plausible.
5. After the user chooses, call `kotobank_lookup` again with the chosen `canonicalUrl` and optional `anchorId`.

## Output requirements

Structure the final answer in this order:

1. A concise Chinese explanation of the word
2. The Japanese headword and reading
3. Key dictionary-backed nuances or differences
4. The dictionary source names
5. The Kotobank link

## Output constraints

- Do not silently choose a candidate when ambiguity remains
- Do not paste long verbatim dictionary passages
- Summarize in natural Chinese instead of mechanically translating the entry text
- If different dictionaries emphasize different senses, say so explicitly
- Keep dictionary names and the Kotobank URL visible in the answer

## Failure handling

- If Kotobank returns no result, say that no entry was found
- If the page structure changes or parsing fails, say it clearly
- If the network request fails, surface the failure instead of fabricating an answer
- Never use silent fallback behavior
