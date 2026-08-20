# VSC Platform V3 – Event Sequence Diagram
Version: 1.0 (Frozen)

## 1. Canonical Operational Sequence Flow
This diagram details the sequence of execution within the VSC Platform V3 ecosystem.
All downstream calculations (Ranking, Qualification, Career, Statistics) are strictly blocked from executing until the active competition round is finalized (including any required Solo or ReSolo tie-breakers).

```
[Score Submitted]
      │
      ▼
[Score Validation]
      │
      ▼
[Score Committed]
      │
      ▼
[Score Aggregation]
      │
      ▼
[Round Evaluation]
      │
      ▼
[Boundary Tie Detection]
      │
      ├──► [Tie Detected] ──► [Solo Conducted] ──► [Round Re-evaluated]
      │                                                │
      │                                                ▼
      │                                    [Tie Still Exists]
      │                                                │
      │                                                ▼
      │                                     [ReSolo Conducted]
      │                                                │
      │                                                ▼
      │                                       [Round Re-evaluated]
      │                                                │
      ▼                                                │
[Round Finalized] ◄────────────────────────────────────┘
      │
      ├───────────────────────┐
      ▼                       ▼
[Ranking Calculated]   [Qualification Calculated]
      │                       │
      └───────────┬───────────┘
                  ▼
    [Official Result Published]
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
[Career Upd] [Stats Rebuilt] [LiveBoard Upd]
      │           │           │
      └───────────┼───────────┘
                  ▼
            [Audit Created]
```

---

## 2. Dynamic Execution Matrix & Rules

- **Strict Finalization Block**: No engine or presentation dashboard is allowed to query rankings or publish results before the `Round Finalized` event. This prevents incomplete, fluctuating leaderboard records from leaking to public displays.
- **Unified Score Integration**: The `Score Aggregation` layer normalizes raw targets (knocks, points, hits, or solos) into unified scoring packages. Downstream consumers (Ranking Engine, Career Engine, etc.) only read these standardized packages, eliminating custom parsing implementations.
- **Asynchronous Audit Trailing**: Every step of the sequence triggers an append-only audit event. The `Audit Created` action runs asynchronously to ensure operations remain non-blocking.
