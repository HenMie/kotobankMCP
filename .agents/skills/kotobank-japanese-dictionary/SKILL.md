---
name: kotobank-japanese-dictionary
description: Use this skill when the user wants to look up a Japanese word / 日语查词, reading, meaning, usage, dictionary source, Kotobank candidate disambiguation, or a Chinese explanation by running the bundled Kotobank CLI directly from this skill package.
---

# Kotobank Japanese Dictionary

## When to use

Use this skill when the user wants any of the following:

- Look up a Japanese word, phrase, reading, or dictionary meaning
- Understand usage or nuance differences across Kotobank dictionaries
- Disambiguate multiple Kotobank candidates before choosing one
- Get the final explanation in Chinese with the original Japanese headword

## Runtime requirement

- Node.js 20+

## Built-in program

Run the bundled CLI in `scripts/kotobank-cli.mjs`.

- Main entry: `node scripts/kotobank-cli.mjs lookup --query <text>`
- Candidate search: `node scripts/kotobank-cli.mjs search --query <text>`
- For flag details, read `references/cli-usage.md`

## Default workflow

1. Start with `node scripts/kotobank-cli.mjs lookup --query <text>`.
2. Always pass `--query`.
3. Default `--max-entries` to `3` unless the user wants fewer or more dictionary entries.
4. Keep `--include-excerpt` off unless the user explicitly asks for longer excerpts.
5. If `needsDisambiguation` is `false`, write the final answer directly from the returned JSON.

## Disambiguation workflow

When `lookup` returns `needsDisambiguation: true`:

1. Run `node scripts/kotobank-cli.mjs search --query <text>` for the same query.
2. Compare the top candidates by `title`, `dictionaryName`, `canonicalUrl`, and, when useful, `anchorId`.
3. Prefer explaining differences between candidates instead of picking one silently.
4. Ask the user to choose when multiple candidates remain plausible.
5. After the user chooses, run `lookup` again with `--canonical-url` and optional `--anchor-id`.

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
