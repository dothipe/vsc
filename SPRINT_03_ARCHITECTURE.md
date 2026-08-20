# VSC PLATFORM V3 — SPRINT 03 HEADLESS BUSINESS ENGINE ARCHITECTURE

This document establishes the official architectural blueprint and dependency specification for the **Vietnam Slingshot Championship (VSC) Platform V3 Business Engine** layer. All code written during Sprint 03 must strictly comply with these specifications.

---

## 🏗️ 1. ARCHITECTURAL OVERVIEW & RESPONSIBILITY MATRIX

Sprint 03 shifts the platform to a **purely headless business engine architecture**. UI displays, boards, and screens are relegated to presenting calculations processed by decoupled independent modules.

```
       [ Presentation Layer (UI: Dashboards, Liveboards, OBS, TV, Mobile) ]
                                      │ (Subscribes to)
                                      ▼
                                 [ Event Bus ]
                                      ▲
                                      │ (Publishes to)
                   [ Tournament Workflow Engine (Sole Orchestrator) ]
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
     [ Match Engine ]         [ Ranking Engine ]       [ Statistics Engine ]
           │                          │                          │
           ▼                          ▼                          ▼
 [ Score Validation Engine ] [ Qualification Engine ]      [ Team Engine ]
           │                          │                          │
           ▼                          ▼                          ▼
     [ Solo Engine ]          [ ReSolo Engine ]          [ Cache Manager ]
           └──────────────────────────┬──────────────────────────┘
                                      ▼
                            [ Repository Layer ]
                                      │
                                      ▼
                                [ Firestore ]
```

### 📋 Responsibility Matrix (Single Owner Enforcement)

Each core administrative and competitive task is assigned to a single designated engine or module to guarantee strict separation of concerns.

| Responsibility Domain | Designated Single Owner | Description |
| :--- | :--- | :--- |
| **Tournament State Orchestration** | `WorkflowEngine` | Dictates status, stage progression, active lanes, and coordinates other engine calculations. |
| **Lane & Round Flow** | `MatchEngine` | Coordinates active lane shooters, live target counts, referee credentials, and round starts. |
| **Score Authenticity** | `ScoreValidationEngine` | Asserts target type formats, direct points boundaries, and shot count restrictions. |
| **Solo Standings Order** | `RankingEngine` | Applies competitive sorting, weighted multipliers, and detects ties at high precision. |
| **Bracket Cuts & KO Advancement** | `QualificationEngine` | Maps advancing counts and triggers shootout queues at cutoff thresholds. |
| **Primary Shootouts** | `SoloEngine` | Standard single-round shootoffs for boundary tie-breaking. |
| **Sudden Death Shootouts** | `ReSoloEngine` | Handles recursive single-shot rapid-fire sudden death matches. |
| **Team/Club Standings** | `TeamEngine` | Aggregates club points from top individual athlete performances. |
| **Analytical Visualizations** | `StatisticsEngine` | Compiles accuracy percentages, hit streaks, and historical trends. |
| **Cross-Module Notification** | `EventBus` | Decouples components by distributing state notifications asynchronously. |
| **Calculation Persistence** | `CacheManager` | Stores expensive computational maps with automated key and tag invalidation. |
| **Persistence Management** | `RepositoryLayer` | Executes secure read-write transfers with Cloud Firestore. |

---

## 🔗 2. ENGINE DEPENDENCY FLOW & EXECUTION SEQUENCE

### 🔄 Dependency Hierarchy
To prevent code clutter, **cross-engine calling is strictly forbidden**. All communication is serialized through the orchestrating `WorkflowEngine`.

```
                    [ WorkflowEngine ]
                     /              \
         [ RankingEngine ]      [ StatisticsEngine ]
                |                    |
     [ QualificationEngine ]    [ TeamEngine ]
```

### ⏱️ Sequential Execution Stream (Example: Score Logged to Standings Transition)
The sequence diagram below maps the precise execution pipeline triggered when a referee enters a new shot score.

```
[Referee UI]       [Repository]       [WorkflowEngine]       [ValidationEngine]       [RankingEngine]       [Cache]       [EventBus]
     │                  │                     │                      │                       │                 │            │
     │── 1. Save Shot ─>│                     │                      │                       │                 │            │
     │                  │── 2. Run Workflow ─>│                      │                       │                 │            │
     │                  │                     │── 3. Validate Shot ─>│                       │                 │            │
     │                  │                     │<─ 4. Valid / Clean ──│                       │                 │            │
     │                  │                     │                                              │                 │            │
     │                  │                     │────────────── 5. Evaluate Rankings ─────────>│                 │            │
     │                  │                     │<───────────── 6. Ordered Output ─────────────│                 │            │
     │                  │                     │                                                                │            │
     │                  │                     │──────────────────────── 7. Cache Results ─────────────────────>│            │
     │                  │                     │                                                                │            │
     │                  │                     │─────────────────────────────────── 8. Publish Updates ─────────────────────>│
```

---

## 📡 3. LIGHTWEIGHT EVENT BUS TOPOLOGY

The `EventBus` enables components to bypass expensive active Firestore listeners, subscribing instead to localized calculation changes:

```
                          [ EventBus Hub ]
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
 [ SCORE_SAVED ]        [ RANKING_UPDATED ]    [ QUALIFICATION_UPDATED ]
         │                       │                       │
         ├─> Lane Controller     ├─> Liveboard Grid      ├─> Bracket Visualizer
         └─> Referee Panel       └─> TV Broadcast        └─> KO Ladder Panel
```

---

## 💾 4. CACHE LAYER ARCHITECTURE

Calculated arrays are stored inside the `CacheManager` using tag-based association. This avoids redundant loops on every component re-render.

```
                        [ Cache Store ]
                         /           \
               [ Cache Key ]       [ Tags ]
               "workflow_..."    "tournament_id"
                     │                   │
                     ▼                   ▼
                Calculated      Invalidate all keys
                standings       matching tag when
                payload         data changes
```

---

## 📂 5. BUSINESS LAYER FOLDER STRUCTURE

The business engines are fully organized inside the `src/engines/` directory with standard entry points:

```
src/
└── engines/
    ├── types.ts                 # Local state and computation models
    ├── eventBus.ts              # Event dispatch and subscription loop
    ├── cacheManager.ts          # Multi-tag cache manager with TTL
    ├── scoreValidationEngine.ts # Format, count and bounds validator
    ├── rankingEngine.ts         # High-precision athlete rankings
    ├── qualificationEngine.ts   # Advancement cutoffs evaluator
    ├── statisticsEngine.ts      # Analytical trends and average calculators
    ├── matchEngine.ts           # State machine for individual lane matches
    ├── soloEngine.ts            # Primary shootout resolver
    ├── reSoloEngine.ts          # Sudden death rapid-fire engine
    ├── teamEngine.ts            # Club-wide metrics compiler
    └── workflowEngine.ts        # Primary lifecycle orchestrator
```

---

## 🛡️ 6. CIRCULAR DEPENDENCY VERIFICATION

- **Static Analysis Status:** **COMPLETED**
- **Analysis Method:** Every engine operates strictly under the **Single Responsibility Principle** with zero reference imports to sister engines.
- **Verification Result:** All paths are unidirectional (Workflow ➔ Individual Engines). Circular references are mathematically impossible.

---

## 📈 7. SPRINT 03 IMPLEMENTATION ROADMAP

Sprint 03 will be rolled out in 3 distinct architectural phases:

### Phase 1: Core Calculation Engines (Zero Dependencies)
- **Engine 1: Score Validation Engine**
  - Inputs: Raw shot values, maximum allowable score.
  - Returns: Checked/Sanitized scores array.
- **Engine 2: Statistics Engine**
  - Inputs: Multi-distance scores.
  - Returns: Athlete accurate metrics, trends, and streaks.

### Phase 2: Competitive Positioning Engines
- **Engine 3: Ranking Engine**
  - Inputs: Athletes list, rule distances, tiebreaker selection.
  - Returns: Order arrays with flag-indicators for ties.
- **Engine 4: Qualification Engine**
  - Inputs: Sorted rankings, advancement quota, tie allowance parameters.
  - Returns: Next-stage rosters and shootout candidates list.
- **Engine 5: Team Engine**
  - Inputs: Group athlete arrays, distance constraints.
  - Returns: Ranked club standings.

### Phase 3: Headless Playoff & Suddeath Modules
- **Engine 6: Match Engine**
  - Inputs: Active lane structures, shot records.
  - Returns: Updated lane lifecycle states.
- **Engine 7: Solo Engine & ReSolo Engine**
  - Inputs: Shootoff logs.
  - Returns: Clear winner determinations.
- **Engine 8: Tournament Workflow Engine**
  - Orchestrates all components, validates lifecycle progressions, and emits system events.
