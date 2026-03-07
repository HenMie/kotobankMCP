# Kotobank CLI Usage

## Commands

### `lookup`

```bash
node scripts/kotobank-cli.mjs lookup --query 食べる
```

Optional flags:

- `--max-entries <n>`: default `3`
- `--include-excerpt`: return longer excerpts
- `--canonical-url <url>`: resolve a chosen candidate
- `--anchor-id <id>`: resolve a chosen article anchor
- `--preferred-dictionary <name>`: repeatable dictionary preference

### `search`

```bash
node scripts/kotobank-cli.mjs search --query 科学
```

Optional flags:

- `--dictionary-scope <jp-monolingual|all>`: default `jp-monolingual`
- `--max-results <n>`: default `8`

## Output

Both commands print JSON to `stdout`.

On failure, the CLI prints a JSON error payload to `stderr` and exits with a
non-zero status.
