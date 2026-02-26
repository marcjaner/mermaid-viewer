# Context Map

```mermaid
flowchart LR
    CLI["CLI Context"]
    VIEWER["Viewer Context"]
    RENDER["Rendering Context"]
    CONFIG["Config Context"]
    CODEC["Codec Contract"]

    CLI -- "CS" --> RENDER
    CLI -- "CS" --> CONFIG
    VIEWER -- "CS" --> CONFIG
    CLI -- "SK" --- CODEC
    VIEWER -- "CF" --> CODEC
```

Relationship notes:
- `CLI -> Rendering` uses Customer-Supplier: CLI defines execution contract; renderer supplies artifact capability.
- `CLI/Viewer -> Config` centralizes style interpretation.
- `CLI + Viewer` rely on a shared codec contract so generated URLs remain interoperable.
