# VSC Platform V3 — System Dependency Map (SYSTEM_DEPENDENCY_MAP_V3)
Version: 1.0 (Official Core Freeze)

This document maps the architectural dependencies and real-time orchestration between the core **Engines** and **Domains** of the Vietnam Slingshot Championship (VSC) Platform V3. It serves as the standard blueprint for synchronization, event payloads, and locking order.

---

## 1. Engine-to-Domain Dependency Matrix

Engines drive execution logic and write state changes, while Domains store stable representations of core sport entities.

```
                  ┌────────────────────────┐
                  │    CORE ENGINES        │
                  │                        │
                  │   [Referee Terminal]   │
                  │   [Ranking Engine]     │
                  │   [Statistics Engine]  │
                  │   [Career Engine]      │
                  │   [Achievement Engine] │
                  └───────────┬────────────┘
                              │
                              ▼ (Event Orchestration)
                  ┌────────────────────────┐
                  │    SOVEREIGN DOMAINS   │
                  │                        │
                  │   [Athlete Domain]     │
                  │   [Club Domain]        │
                  │   [Province Domain]    │
                  │   [Season Domain]      │
                  └────────────────────────┘
```

---

## 2. Real-Time Event Orchestration (The Event Bus)

Decoupling is achieved through the system-wide Event Bus (`/src/engines/eventBus.ts`). Operational triggers publish standardized payloads, and downstream subscribers process changes asynchronously.

```
[Score Published] ──► EVENT_SCORE_PUBLISHED
                             │
                             ▼
                    [Ranking Engine] ──► EVENT_RANKING_FINALIZED
                                                 │
                                                 ▼
                                        [Statistics Engine] ──► EVENT_STATS_UPDATED
                                                                        │
                                                                        ▼
                                                                 [Career Engine] ──► EVENT_CAREER_UPDATED
                                                                                            │
                                                                                            ▼
                                                                                     [Sovereign Domains]
```

---

## 3. Core Event Lifecycle & Subscribers Matrix

The table below maps each major system event to its downstream subscriber actions.

| Event Type | Publisher | Primary Subscriber | Subscriber Action / Domain Update |
| :--- | :--- | :--- | :--- |
| `EVENT_SCORE_PUBLISHED` | Referee Terminal | Ranking Engine | Groups scores by environment, calculates standings, and writes `/ranking_snapshots`. |
| `EVENT_RANKING_FINALIZED` | Ranking Engine | Statistics Engine | Extracts finalized positions, calculates lifetime averages, and commits `/statistics_snapshots`. |
| `EVENT_STATS_UPDATED` | Statistics Engine | Career Engine / Achievement Engine | 1. Compiles year-over-year tournament summaries.<br>2. Evaluates credentials against rules to unlock achievements. |
| `EVENT_ACHIEVEMENT_UNLOCKED`| Achievement Engine | Athlete Domain | Appends new badges to athlete profile and logs a milestone to `/athlete_timeline_events`. |
| `EVENT_ATHLETE_UPDATED` | Athlete Domain | Club Domain | Recalculates club roster statistics, active athlete tallies, and logs `/club_timeline_events`. |
| `EVENT_CLUB_UPDATED` | Club Domain | Province Domain | Aggregates geographic club metrics and logs `/province_timeline_events`. |
| `EVENT_PROVINCE_UPDATED` | Province Domain | Season Domain | Recomputes overall season standings, total province points, and records peak achievements. |
| `EVENT_SEASON_COMPLETED` | Season Domain | All Read Views | Triggers the **Deep-Freeze** lock across the entire season's database node. |

---

## 4. State Synchronization & Locking Order

To prevent circular dependencies and dirty reads, state synchronization must adhere to a strict chronological locking sequence:

1. **Transactional Lock**:
   No scoring metrics can be modified during active `Ranking Engine` calculations. This is locked at the referee/director level inside `/tournaments/{id}.status`.
2. **Analytical Lock**:
   Once rankings are written to `/ranking_snapshots`, the raw scoring ledger `/official_score_ledger` for that round becomes read-only.
3. **Domain Lock (The Cascade)**:
   Calculations propagate strictly down the chain: **Athlete ──► Club ──► Province ──► Season**. A downstream domain must never update its snapshots until its direct upstream domain has emitted its completion event.
4. **Historical Lock (Season Freeze)**:
   When `status == 'completed'`, all write privileges are revoked for all related collections (`/official_score_ledger`, `/ranking_snapshots`, `/tournament_results`, `/season_rankings`) of that specific season. Only system auditors with specialized keys can view or append corrective records to `/audit_logs`.
