# Style Profile Schema

Accepted in JSON or YAML config files.

```yaml
theme: default # default | neutral | dark | forest | base
themeVariables:
  primaryColor: "#2563eb"
  fontSize: 14
  darkMode: false
css: |
  .node rect { rx: 6px; }
mermaidConfig:
  flowchart:
    curve: basis
```

## Merge Precedence
1. Built-in defaults.
2. Config file (`--config`).
3. CLI flags (`--theme`, `--css`, `--theme-variable`).

## URL Share Semantics
- Diagram source is encoded in URL hash (`deflate + base64`).
- Non-default style profiles are encoded in query param `style` as base64url JSON.
