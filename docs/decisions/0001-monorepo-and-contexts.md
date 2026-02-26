# ADR 0001: Monorepo with Shared Contracts

## Status
Accepted

## Decision
Use one workspace with three packages:
- `@mermaid-viewer/shared`
- `@mermaid-viewer/cli`
- `@mermaid-viewer/viewer`

## Rationale
- Keeps URL codec and style schema consistent across CLI and viewer.
- Allows independent build/test workflows while sharing versioned contracts.

## Consequences
- Build order must ensure shared package is available before dependents.
- Contract changes require synchronized updates in CLI and viewer.
