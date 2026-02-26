# Domain Narrative: Mermaid Viewer

## The Problem
Teams use Mermaid as text-first documentation, but rendering and sharing are fragmented. One tool edits text, another renders diagrams, and another captures export images. That adds manual steps and breaks automation.

AI agents also need deterministic command contracts. A human-oriented CLI that mixes logs with outputs is hard to automate, so pipelines become brittle.

## The Domain
This project provides two coordinated capabilities: a static web viewer for human interaction and a CLI for automated workflows. The viewer consumes share URLs and renders diagrams with consistent style settings. The CLI transforms Mermaid source into either shareable URLs or image artifacts.

The domain focus is reproducible rendering and transportability. A diagram should carry enough information to render similarly across environments, with configurable theme and CSS.

## Subdomains

### Core: Diagram Rendering and Shareability
- Convert Mermaid source into rendered output.
- Encode and decode share payloads.
- Preserve style intent across CLI and viewer.

### Supporting: Theme and Style Configuration
- Express theme settings as portable profiles.
- Merge defaults, config files, and command overrides.

### Supporting: Agent CLI Contract
- Stable machine-readable JSON outputs.
- stdin-first automation with predictable exit behavior.

### Generic: Platform Infrastructure
- Static hosting.
- Chromium runtime for headless rendering.
- Node package distribution.

## Key Constraints
- No required backend service for v1 share URLs.
- OSS release under MIT.
- PNG/SVG generation must run from CLI.
- CLI machine output must be schema-versioned.
