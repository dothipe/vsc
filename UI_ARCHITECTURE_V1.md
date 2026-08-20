# VSC Platform V3 – UI Architecture Specification
Version: 1.0 (Frozen)

## 1. Overview
The UI Architecture of VSC Platform V3 is a highly deterministic, decentralized, and metadata-driven framework. Component visibility and navigation are completely decoupled from individual views and are managed by a centralized manifestation system.

### Core Architecture Layers:
1. **Workspace Manifest Layer**: The single source of truth registering all app workspace components, defining ownership, binding levels, and access boundaries.
2. **Permission Engine Layer**: A 4-layered framework evaluating Global Roles, Tournament-specific Roles, and granular system Capabilities.
3. **Workflow visibility Matrix Layer**: A temporal gate mapping the status (Workflow Stage) of a tournament to allowed UI screens.
4. **Navigation Manifest Layer**: The runtime engine combining all layers to generate active, visible, and enabled navigation controls for the user.

---

## 2. Dynamic Routing Flow
No screen or navigation tab decides its own visibility. The system evaluates the unified pipeline:

```
[User Context] + [Tournament Context]
       │                  │
       ▼                  ▼
[Layer 1: Global Role] * [Layer 2: Tournament Role]
       │
       ▼
[Layer 3: System Capabilities Checked]
       │
       ▼
[Layer 4: Current Workflow Stage Visited]
       │
       ▼
[Centralized Manifest Filtration]
       │
       ▼
[Rendered & Permitted Navigation Items]
```

This prevents duplicate ownership, unauthenticated tab access, or state leakage, maintaining robust isolation between Global and Tournament-bound workspaces.
