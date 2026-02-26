# Mermaid Viewer (OSS)

Mermaid viewer and CLI designed for humans and AI agents.

- Static web viewer (`@mermaid-viewer/viewer`)
- Agent-friendly CLI (`@mermaid-viewer/cli`, executable `mmdv`)
- Shared codec + style contracts (`@mermaid-viewer/shared`)

## Requirements

- Node.js 20+
- Playwright Chromium for PNG/SVG rendering from CLI

## Install

```bash
npm install
npx playwright install chromium
```

## Build

```bash
npm run build
```

## CLI Usage

Render SVG from stdin to stdout:

```bash
cat diagram.mmd | npm run mmdv -- render --format svg > /tmp/diagram.svg
```

Render PNG to file:

```bash
cat diagram.mmd | npm run mmdv -- render --format png --out /tmp/diagram.png --json
```

Create share URL:

```bash
cat diagram.mmd | npm run mmdv -- url encode --base-url http://127.0.0.1:4173/ --json
```

Decode share URL:

```bash
npm run mmdv -- url decode --url 'http://127.0.0.1:4173/#<payload>'
```

## Style Config Example

```yaml
theme: forest
themeVariables:
  primaryColor: "#16a34a"
css: |
  .node rect { rx: 8px; }
```

## Documentation

See `/docs` for decisions, domain language, contracts, and acceptance tests.
