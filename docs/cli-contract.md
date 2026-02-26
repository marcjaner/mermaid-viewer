# CLI Contract (`mmdv`)

## Commands

### `mmdv render`
Render Mermaid into an artifact.

- Required: `--format <svg|png>`
- Optional: `--in <path>`, `--out <path>`, `--config <path>`, `--theme`, `--css <path>`, `--theme-var key=value`, `--json`
- Input default: stdin
- Output default:
  - `svg`: stdout (raw SVG)
  - `png`: requires `--out <path>`

### `mmdv url encode`
Generate share URL from Mermaid source.

- Optional: `--in <path>`, `--out <path>`, `--config <path>`, `--theme`, `--css <path>`, `--theme-var`, `--base-url <url>`, `--json`
- Input default: stdin
- Output default: stdout URL string

### `mmdv url decode`
Decode Mermaid source from URL/hash payload.

- Optional: `--url <value>`, `--out <path>`, `--json`
- Input default: stdin when `--url` is absent
- Output default: stdout Mermaid source

## Machine Result Schema (v2)
When `--json` is enabled, output is one JSON object to `stderr` per command execution.

```json
{
  "schemaVersion": "2.0",
  "ok": true,
  "command": "render",
  "format": "svg",
  "output": { "kind": "stdout" },
  "bytes": 8421,
  "sha256": "..."
}
```

Fields:
- `schemaVersion`: fixed string `2.0` in v2.
- `ok`: success flag.
- `command`: `render | url.encode | url.decode`.
- `format`: `svg | png` for `render` success.
- `output`: `{ kind: "stdout" }` or `{ kind: "file", path }`.
- `bytes`: present for `render` success.
- `sha256`: present for `render` success.
- `shareUrl`: present for `url.encode` success.
- `diagramHash`: present for URL encode/decode success.
- `diagramSourceBytes`: present for `url.decode` success.
- `warnings`: optional warning list.
- `error`: `{ code, message, details? }` on failure.

## Exit Codes
- `0`: success
- `2`: usage/validation errors
- `3`: input read/empty input errors
- `4`: render errors
- `5`: output write errors
- `6`: encode/decode errors
