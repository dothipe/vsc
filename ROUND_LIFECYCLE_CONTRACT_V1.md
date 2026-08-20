# VSC Platform V3 – Round Lifecycle Contract
Version: 1.0 (Frozen)

## 1. Core Architectural Contract
This document establishes a permanent business and mathematical contract within the VSC Platform V3. 
- **Solo** and **ReSolo** are **NOT** independent Tournament Stages.
- **Solo** and **ReSolo** are **NOT** independent competition Rounds.
- **Solo** and **ReSolo** are **NOT** standalone workflows.

They are strictly defined as **OPTIONAL tie-break resolution mechanisms owned exclusively by their parent Round**. Under no circumstances can Solo or ReSolo exist in isolation, bypass parent stage gates, or form detached tournament stages.

---

## 2. Complete Competition Round Lifecycle Flow
Each competition round must strictly proceed through the following pipeline:

```
                  ┌──────────────────────┐
                  │  Competition Round   │
                  └──────────┬───────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │    Normal Score Entry    │
                └──────────┬───────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │     Score Validation     │
                └──────────┬───────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │       Score Commit       │
                └──────────┬───────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │    Score Aggregation     │
                └──────────┬───────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │ Temporary Ranking Eval   │
                └──────────┬───────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │  Boundary Tie Detection  │
                └──────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       [Boundary Tie Found]        [No Boundary Tie]
              │                             │
              ▼                             ▼
   ┌──────────────────────┐      ┌──────────────────────┐
   │ Solo Tie-Break       │      │    Finalize Round    │
   │ (Owned by Parent Rd) │      └──────────┬───────────┘
   └──────────┬───────────┘                 │
              │                             ▼
              ▼                  ┌──────────────────────┐
   ┌──────────────────────┐      │ - Ranking Standings  │
   │ Recalculate Round    │      │ - Qualifications     │
   └──────────┬───────────┘      │ - Official Results   │
              │                  └──────────────────────┘
       ┌──────┴──────┐
       ▼             ▼
   [Tie Exists] [Tie Resolved]
       │             │
       ▼             ▼
   ┌──────────┐  ┌──────────┐
   │ ReSolo   │  │ Finalize │
   └────┬─────┘  └──────────┘
        │
        ▼
   ┌──────────┐
   │ Recalc   │
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │ Finalize │
   └──────────┘
```

---

## 3. Official Score Ledger Integration Rule
The hierarchical nesting of the Official Score Ledger must align directly with the round hierarchy. All tie-breaking events must reside within their parent rounds:

```
🏆 Tournament Ledger
 ├── 📅 Round 1
 │    ├── 🎯 Normal Scores (Knockdown / Paper Target / Team)
 │    ├── 🎖️ Solo Tie-breaker (Optional)
 │    └── 🎖️ ReSolo Tie-breaker (Optional)
 │
 └── 📅 Round 2
      ├── 🎯 Normal Scores
      ├── 🎖️ Solo Tie-breaker (Optional)
      └── 🎖️ ReSolo Tie-breaker (Optional)
```

### Constraints:
- **No Isolated Queues**: Separate Solo queues or pages detached from the round's score records are strictly forbidden.
- **Unified Scoreboard Consumption**: Downstream analytical, statistics, and career engines must consume ONLY the final normalized, resolved score package output after the completion of the parent round's lifecycle.
- **Zero Phase Drift Guarantee**: A tournament cannot transition from its `live` stage until all round lifecycle contracts (including any required Solo/ReSolo) are completed and officially finalized.
