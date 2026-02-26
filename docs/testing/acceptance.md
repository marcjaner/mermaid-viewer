# Acceptance Test Matrix

## CLI Behavior
- `render --format svg` accepts stdin and writes SVG to stdout by default.
- `render --format png --out <path>` accepts stdin and writes PNG artifact.
- `url encode` and `url decode` round-trip Mermaid source.
- `--json` output conforms to schema version `2.0` and is emitted to `stderr`.
- Invalid options produce `ok:false` and non-zero exit code.

## Share URL Behavior
- Hash payload decodes in viewer and renders the same diagram.
- Style query parameter applies theme/themeVariables/CSS.
- Invalid style query is ignored with user-visible warning.

## Viewer Behavior
- Renders default diagram when URL hash is missing.
- Copy URL action includes current source and style state.

## Rendering Quality
- PNG output is non-empty and matches diagram bounds.
- SVG output includes injected custom CSS when provided.
