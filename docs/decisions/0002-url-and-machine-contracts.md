# ADR 0002: Local-First URLs and Versioned JSON Output

## Status
Accepted

## Decision
- Use local-first share URLs with hash payloads (`deflate + base64`).
- Expose machine output with schemaVersion `1.0` for CLI automation.

## Rationale
- Eliminates mandatory backend for sharing in v1.
- Makes CLI safe for agent pipelines and CI integrations.

## Consequences
- URL length remains a practical limit for very large diagrams.
- JSON contract must remain backward compatible within 1.x.
