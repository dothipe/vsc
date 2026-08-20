# VSC Platform V3 – Domain Event Architecture Specification
Version: 1.0 (Frozen)

## 1. Architectural Philosophy
VSC Platform V3 is a highly decoupled, reactive, event-driven ecosystem. Rather than direct, tight invocation coupling between independent business modules, state changes within the application trigger structured domain events. The event-driven backbone isolates repositories, validation logic, calculation engines, and presentation components.

```
                  ┌──────────────────────┐
                  │      Event Bus       │
                  └──────────┬───────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     [Score Committed]  [Round Finalized]  [Audit Created]
            │                │                │
            ▼                ▼                ▼
     [Score Aggregator] [Ranking Engine] [Activity Tracker]
```

## 2. The Core Backbone (`EventBus`)
The communication backbone is managed by `src/engines/eventBus.ts`. It acts as a synchronous/asynchronous broker that registers subscriber callbacks and manages event dispatching with strict sequence guarantees where required.

### Core Domain Events Catalog:
Every critical business operation must publish a structured message to the `EventBus`:

1. **`TournamentCreated`**: Emitted when a new tournament is provisioned.
2. **`TournamentUpdated`**: Emitted when tournament parameters (distances, lanes, targets) are edited.
3. **`TournamentArchived`**: Emitted when a tournament enters its terminal lifecycle phase.
4. **`ParticipantRegistered`**: Emitted when a competitor is successfully added to the registry.
5. **`ParticipantCheckedIn`**: Emitted during lane assignment and credential verification.
6. **`ParticipantWithdrawn`**: Emitted when an athlete resigns from active competition.
7. **`AssignmentGenerated`**: Emitted when lanes, targets, and squad rotations are calculated.
8. **`HeatStarted`**: Emitted when a shooting rotation begins active fire.
9. **`HeatCompleted`**: Emitted when a squad's round scores are submitted to the referee.
10. **`ScoreSubmitted`**: Emitted when a line referee enters initial target hits.
11. **`ScoreCorrected`**: Emitted when a Head Referee issues a correction to a score log.
12. **`ScoreCommitted`**: Emitted when scores are locked and appended to the ledger.
13. **`RankingCalculated`**: Emitted when the calculation engine outputs revised leaderboard standings.
14. **`QualificationCalculated`**: Emitted when qualification thresholds are computed.
15. **`OfficialResultPublished`**: Emitted when final, audited results are frozen.
16. **`CareerUpdated`**: Emitted when an athlete's national career standings are updated.
17. **`StatisticsRebuilt`**: Emitted when historical and analytical datasets are updated.
18. **`LiveBoardUpdated`**: Emitted when real-time presenter view models are pushed to displays.
19. **`AuditCreated`**: Emitted when a transaction or correction is registered.

---

## 3. Asynchronous vs. Synchronous Boundaries
- **Synchronous Execution**: Core calculation flows (Score Committed -> Score Aggregated -> Temporary Ranking Calculation) run synchronously to ensure instant feedback to referees on tie states.
- **Asynchronous Execution**: Auxiliary pipelines (Career Standings Update, National Statistics Compilation, Push Notifications) run asynchronously behind background queues to prevent locking the main render loop.
