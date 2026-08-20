# VSC Platform V3 – Domain Event Contracts
Version: 1.0 (Frozen)

## 1. Event Envelope Schema
All domain events published within the platform conform to a standard, structured payload envelope to guarantee safety, traceability, and schema evolution compatibility.

```json
{
  "eventId": "UUIDv4",
  "name": "EVENT_NAME",
  "version": "1.0",
  "timestamp": "ISO_8601",
  "producer": "MODULE_NAME",
  "payload": {}
}
```

---

## 2. Frozen Event Contract Manifest

### 1. `TournamentCreated`
- **Name**: `tournament.created`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; creatorId: string; matchName: string; ruleTemplateId: string; timestamp: number }
  ```
- **Producer**: `Tournament Repository`
- **Consumers**: `Audit Engine`, `Platform Core`
- **Ordering Rules**: Sequential (must execute before any member/stage adjustments).
- **Idempotency Requirements**: Idempotent based on `tournamentId`.

### 2. `TournamentUpdated`
- **Name**: `tournament.updated`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; changedFields: string[]; updatedConfig: any; operatorId: string }
  ```
- **Producer**: `Tournament Repository`
- **Consumers**: `Workflow Engine`, `Rules Engine`, `Dashboard Engine`
- **Ordering Rules**: Executed sequentially following `TournamentCreated`.
- **Idempotency Requirements**: Cumulative patches are applied.

### 3. `TournamentArchived`
- **Name**: `tournament.archived`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; operatorId: string; archiveDate: number }
  ```
- **Producer**: `Tournament Repository`
- **Consumers**: `Statistics Engine`, `Audit Log Repository`
- **Ordering Rules**: Terminal event. Prevents all subsequent score entry operations.
- **Idempotency Requirements**: Once archived, subsequent requests are silently ignored.

### 4. `ParticipantRegistered`
- **Name**: `participant.registered`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; athleteId: string; name: string; club: string; isPrimaryTeam: boolean }
  ```
- **Producer**: `Tournament Repository`
- **Consumers**: `Workflow Engine`, `Official Ledger Repository`
- **Ordering Rules**: Bound to tournament's `registration` workflow stage.
- **Idempotency Requirements**: Prevent duplicate entry checks by storing mapping of `tournamentId_athleteId`.

### 5. `ParticipantCheckedIn`
- **Name**: `participant.checked_in`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; athleteId: string; targetLane: string; squadId: string; checkedInBy: string }
  ```
- **Producer**: `Tournament Repository`
- **Consumers**: `Assignment Engine`, `Live Score Input Engine`
- **Ordering Rules**: Must precede `AssignmentGenerated` and target scoring.
- **Idempotency Requirements**: Overrides any active lane/squad state.

### 6. `ParticipantWithdrawn`
- **Name**: `participant.withdrawn`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; athleteId: string; reason: string; operatorId: string }
  ```
- **Producer**: `Tournament Repository`
- **Consumers**: `Ranking Calculation Engine`, `Assignment Engine`
- **Ordering Rules**: Disqualifies or terminates competitor lane occupancy immediately.
- **Idempotency Requirements**: Safe to call repeatedly.

### 7. `AssignmentGenerated`
- **Name**: `assignment.generated`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; totalSquads: number; assignmentDetails: any[]; operatorId: string }
  ```
- **Producer**: `Assignment Engine`
- **Consumers**: `Live Score Input Engine`, `Mission Control Core`
- **Ordering Rules**: Generated only when the tournament workflow stage is `ready`.
- **Idempotency Requirements**: Re-generation clears unstarted lanes.

### 8. `HeatStarted`
- **Name**: `heat.started`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; heatId: string; roundId: string; targetLaneIds: string[] }
  ```
- **Producer**: `Mission Control Core`
- **Consumers**: `Live Score Input Engine`, `LiveBoard`
- **Ordering Rules**: Gated to live operations.
- **Idempotency Requirements**: Prevent starting a heat already in progress.

### 9. `HeatCompleted`
- **Name**: `heat.completed`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; heatId: string; roundId: string; totalTargetsScored: number }
  ```
- **Producer**: `Live Score Input Engine`
- **Consumers**: `Score Validation Engine`, `Mission Control Core`
- **Ordering Rules**: Occurs once all lanes in a heat submit scorecard scores.
- **Idempotency Requirements**: Safe to re-trigger if scorecard validation undergoes correction.

### 10. `ScoreSubmitted`
- **Name**: `score.submitted`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; athleteId: string; distanceId: string; shots: (number | boolean | null)[]; refereeEmail: string }
  ```
- **Producer**: `Referee Terminal`
- **Consumers**: `Score Validation Engine`, `LiveBoard`
- **Ordering Rules**: Direct line entry during active heat.
- **Idempotency Requirements**: Generates transactional audit log entry to track modifications.

### 11. `ScoreCorrected`
- **Name**: `score.corrected`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; athleteId: string; distanceId: string; oldShots: any[]; newShots: any[]; headRefereeEmail: string; reason: string }
  ```
- **Producer**: `Official Score Ledger View / Head Referee Terminal`
- **Consumers**: `Score Validation Engine`, `ScoreAggregationLayer`
- **Ordering Rules**: Must be executed before finalizing a round.
- **Idempotency Requirements**: Auditable log entry, increments the score's semantic version.

### 12. `ScoreCommitted`
- **Name**: `score.committed`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; athleteId: string; scorePackage: any; committedBy: string }
  ```
- **Producer**: `Official Ledger Repository`
- **Consumers**: `ScoreAggregationLayer`, `Ranking Calculation Engine`
- **Ordering Rules**: Only committed scores can be consumed by downstream ranking layers.
- **Idempotency Requirements**: Safe database record upsert using atomic constraints.

### 13. `RankingCalculated`
- **Name**: `ranking.calculated`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; rankedList: any[]; tieBreakRuleUsed: string; updatedCount: number }
  ```
- **Producer**: `Ranking Calculation Engine`
- **Consumers**: `LiveBoard`, `Official Result Engine`
- **Ordering Rules**: Triggered following a Score Committed event.
- **Idempotency Requirements**: Calculates standings deterministically.

### 14. `QualificationCalculated`
- **Name**: `qualification.calculated`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; qualifiedAthleteIds: string[]; thresholds: any }
  ```
- **Producer**: `Ranking Calculation Engine`
- **Consumers**: `Official Result Engine`, `Workflow Engine`
- **Ordering Rules**: Can only be computed after all active round scores are finalized.
- **Idempotency Requirements**: Safe deterministic execution.

### 15. `OfficialResultPublished`
- **Name**: `official_result.published`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; finalStandings: any[]; operatorId: string; timestamp: number }
  ```
- **Producer**: `Official Result Engine`
- **Consumers**: `Career Engine`, `Statistics Engine`
- **Ordering Rules**: Fired once the tournament stage transitions to `completed`.
- **Idempotency Requirements**: Locked once published; requires admin override to unfreeze.

### 16. `CareerUpdated`
- **Name**: `career.updated`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { athleteId: string; pointsAwarded: number; updatedNationalRank: number }
  ```
- **Producer**: `Career Engine`
- **Consumers**: `Master Data Management`, `Athlete Registry`
- **Ordering Rules**: Asynchronous event processed in the background.
- **Idempotency Requirements**: Tracked via `officialResultId` to prevent duplicate point additions.

### 17. `StatisticsRebuilt`
- **Name**: `statistics.rebuilt`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { scope: "global" | "club" | "athlete"; timestamp: number }
  ```
- **Producer**: `Statistics Engine`
- **Consumers**: `Platform Core`
- **Ordering Rules**: Low-priority background calculation.
- **Idempotency Requirements**: Purely idempotent aggregate re-calculation.

### 18. `LiveBoardUpdated`
- **Name**: `liveboard.updated`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { tournamentId: string; currentLeaderboardState: any; activeHeats: any[] }
  ```
- **Producer**: `LiveBoard Engine`
- **Consumers**: `Presentation Layer`
- **Ordering Rules**: High-priority real-time broadcast.
- **Idempotency Requirements**: Real-time push; overrides previous views instantly.

### 19. `AuditCreated`
- **Name**: `audit.created`
- **Version**: `1.0`
- **Payload**:
  ```typescript
  { action: string; category: string; operator: string; description: string; details: any }
  ```
- **Producer**: `Audit Engine`
- **Consumers**: `System Log Repository`
- **Ordering Rules**: Executed alongside every database action.
- **Idempotency Requirements**: Append-only. Every log record is unique.
