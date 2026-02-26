---
name: mmdv-cli
description: Render Mermaid diagrams to SVG/PNG files and generate/decode share URLs using the `mmdv` CLI. Use when the user asks to render a diagram to a file, export a diagram as SVG or PNG, generate a shareable Mermaid URL, or decode a Mermaid share URL. Triggers include "render this diagram", "export as PNG/SVG", "save diagram to file", "generate share URL", "decode mermaid URL", or any task requiring Mermaid artifact generation via CLI. Recommend using the `mermaid-diagrams` skill first to author the Mermaid syntax, then this skill to render or share.
---

# mmdv CLI

Render Mermaid diagrams to SVG/PNG artifacts and encode/decode share URLs via the `mmdv` CLI.

**Recommended workflow:** Use the `mermaid-diagrams` skill to author the Mermaid syntax, then use this skill to render or share.

## Prerequisites

- Node.js 20+
- Playwright Chromium: `npx playwright install chromium`
- Install: `npm install @mermaid-viewer/cli` (or run from repo via `npx mmdv`)

## Render

### SVG to stdout (preferred for pipelines)

```bash
echo 'graph LR; A-->B' | mmdv render --format svg > /tmp/diagram.svg
```

### SVG to file

```bash
echo 'graph LR; A-->B' | mmdv render --format svg --out /tmp/diagram.svg
```

### PNG to file (--out required)

```bash
echo 'graph LR; A-->B' | mmdv render --format png --out /tmp/diagram.png
```

PNG **always** requires `--out <path>`. Omitting it exits with code 2.

### From file input

```bash
mmdv render --format svg --in diagram.mmd --out /tmp/diagram.svg
```

### With style overrides

```bash
echo 'graph LR; A-->B' | mmdv render --format svg \
  --theme forest \
  --theme-var primaryColor="#16a34a" \
  --css custom.css \
  --config style.yaml
```

Style config file example (YAML or JSON):

```yaml
theme: forest
themeVariables:
  primaryColor: "#16a34a"
css: |
  .node rect { rx: 8px; }
```

Precedence: `--config` < `--theme` / `--css` / `--theme-var` flags (flags win).

## Machine-Readable Output (`--json`)

Append `--json` to any command. JSON is emitted to **stderr**, not stdout. Stdout remains the artifact.

```bash
echo 'graph LR; A-->B' | mmdv render --format svg --json 2>/tmp/result.json > /tmp/diagram.svg
```

Parse the JSON from stderr:

```bash
RESULT=$(echo 'graph LR; A-->B' | mmdv render --format svg --out /tmp/d.svg --json 2>&1 >/dev/null)
echo "$RESULT" | jq '.ok'
```

### Schema (v2)

```json
{
  "schemaVersion": "2.0",
  "ok": true,
  "command": "render",
  "format": "svg",
  "output": { "kind": "file", "path": "/tmp/diagram.svg" },
  "bytes": 8421,
  "sha256": "abc123..."
}
```

Key fields by command:

| Field | render | url.encode | url.decode |
|---|---|---|---|
| `format` | svg/png | - | - |
| `output` | stdout/file | stdout/file | stdout/file |
| `bytes` | artifact size | - | - |
| `sha256` | artifact hash | - | - |
| `shareUrl` | - | the URL | - |
| `diagramHash` | - | hash payload | hash payload |
| `diagramSourceBytes` | - | - | decoded size |

On failure: `ok: false` with `error: { code, message, details? }`.

## URL Encode / Decode

### Encode (generate share URL)

```bash
echo 'graph LR; A-->B' | mmdv url encode --base-url https://mermaid.example.com/
```

With style:

```bash
echo 'graph LR; A-->B' | mmdv url encode --base-url https://mermaid.example.com/ --theme dark --json
```

### Decode (extract Mermaid source from URL)

```bash
mmdv url decode --url 'https://mermaid.example.com/#eNpLzs...'
```

Or via stdin:

```bash
echo 'https://mermaid.example.com/#eNpLzs...' | mmdv url decode
```

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 2 | Usage/validation error (bad flags, PNG without --out) |
| 3 | Input read error or empty input |
| 4 | Render failure |
| 5 | Output write error |
| 6 | Encode/decode error |

## Flags Reference

| Flag | Commands | Description |
|---|---|---|
| `--format <svg\|png>` | render (required) | Output format |
| `--in <path>` | render, url encode | Input file (default: stdin) |
| `--out <path>` | render, url encode/decode | Output file (default: stdout for svg/text) |
| `--config <path>` | render, url encode | Style profile YAML/JSON |
| `--theme <name>` | render, url encode | Mermaid theme override |
| `--css <path>` | render, url encode | Custom CSS file |
| `--theme-var <k=v>` | render, url encode | Theme variable (repeatable) |
| `--base-url <url>` | url encode | Viewer base URL |
| `--url <value>` | url decode | URL or hash payload |
| `--json` | all | Machine JSON to stderr |

## Rules

- Prefer stdin-first flows (pipe diagram text in).
- For SVG pipelines: omit `--out` to get artifact on stdout.
- For PNG: always pass `--out <path>`.
- When using `--json`, parse **stderr** (not stdout).
- Legacy flags `--input`, `--output`, `--theme-variable` are **invalid** — use `--in`, `--out`, `--theme-var`.
