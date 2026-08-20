# VSC PLATFORM V3 — BUSINESS ENGINE CONTRACTS V1
**Vietnam Slingshot Championship (VSC) Platform V3 — Sprint 03 Architecture Baseline**

---

## 📜 1. ARCHITECTURAL DECREE

This document establishes the official, immutable structural contracts for all **VSC Platform V3 Business Engines**. These contracts serve as permanent engineering laws for the platform's backend and computational logic. 

Every engine specified herein must function as a strict **isolated black box**:
```
                       ┌─────────────────────────┐
                       │   Independent Engine    │
                       │                         │
     [ Inputs ] ──────>│  (Pure Computation /    │──────> [ Outputs ]
                       │   No Side Effects)      │
                       └─────────────────────────┘
```
Any future implementation, feature addition, or optimization must fully comply with these boundaries. Under no circumstances may an engine introduce side-effects, execute direct database calls, trigger UI changes, or establish circular dependencies.

---

## 💎 2. ENGINE CONTRACT SPECS

---

### 1. Workflow Engine (`WorkflowEngine`)
* **Responsibility:** The sole coordinator and state orchestrator of the tournament lifecycle. It directs phase transitions and sequences the execution of other computational engines.
* **Inputs:** `TournamentV3` structural object, state transition metadata, and rule config bounds.
* **Outputs:** Updated `TournamentV3` state representation.
* **Public Methods:**
  * `transitionLifecycle(tournament: TournamentV3, nextStatus: string): TournamentV3`
  * `executeStageCalculations(tournament: TournamentV3, advancingCount: number, allowTiesAtBoundary: boolean)`
* **Events Consumed:** None.
* **Events Published:** `TOURNAMENT_STARTED`, `RANKING_UPDATED`, `QUALIFICATION_UPDATED`.
* **Cache Dependencies:** Writes and invalidates entries via `CacheManager`.
* **Repository Dependencies:** Reads/writes via `TournamentRepository`.
* **Forbidden Responsibilities:** STRICTLY FORBIDDEN from performing direct sorting, mathematical calculations, qualification determinations, or UI rendering.
* **Failure Conditions:** Triggers failures on invalid lifecycle state transitions (e.g., trying to transition directly from `draft` to `completed`).
* **Unit Test Targets:**
  * Validate correct sequential transition sequence of `draft -> registration -> ready -> live -> completed`.
  * Ensure cache invalidation gets triggered properly during stage changes.

---

### 2. Match Engine (`MatchEngine`)
* **Responsibility:** Manages the game-flow state of individual bế bắn (lanes) and shooter progress.
* **Inputs:** `LaneState` structure, `MatchAction` (e.g., record shot, clear shot, reset).
* **Outputs:** Newly transitioned state of the active lane.
* **Public Methods:**
  * `reduce(state: LaneState, action: MatchAction): LaneState`
* **Events Consumed:** None.
* **Events Published:** None (Orchestrated by Workflow Engine).
* **Cache Dependencies:** None.
* **Repository Dependencies:** None.
* **Forbidden Responsibilities:** STRICTLY FORBIDDEN from writing to databases or modifying overall tournament status.
* **Failure Conditions:** Rejects incoming shot events if the target lane is not in an `active` state.
* **Unit Test Targets:**
  * Confirm active lane switches to `completed` once total shots reach the limit.
  * Verify that deleting or clearing a shot correctly decrements the shot index.

---

### 3. Score Validation Engine (`ScoreValidationEngine`)
* **Responsibility:** Validates direct points bounds, hit indicators, and shot limits against competition rules.
* **Inputs:** `ScoreValidationInput` (raw scores array, max shots, point bounds, and target mode).
* **Outputs:** Clean, sanitized scores array and an verification summary.
* **Public Methods:**
  * `validate(input: ScoreValidationInput): ScoreValidationResult`
* **Events Consumed:** None.
* **Events Published:** None.
* **Cache Dependencies:** None.
* **Repository Dependencies:** None.
* **Forbidden Responsibilities:** Cannot alter rankings, record stats, or update databases.
* **Failure Conditions:** Rejects scores containing values outside rules thresholds (e.g., scoring 11 points on a 10-point paper target).
* **Unit Test Targets:**
  * Verify validation failure when more shots are submitted than allowed.
  * Confirm correct normalization of invalid or blank shot values to `null`.

---

### 4. Ranking Engine (`RankingEngine`)
* **Responsibility:** Evaluates athlete performance records, applies multipliers, and executes tie-breaker sorting.
* **Inputs:** Athletes list, current round distances configuration list, and tie-breaker rules selection.
* **Outputs:** Sorted array of ranked athletes with detailed tie metadata.
* **Public Methods:**
  * `calculate(input: RankingInput): RankedAthleteOutput[]`
* **Events Consumed:** `SCORE_SAVED`.
* **Events Published:** `RANKING_UPDATED`.
* **Cache Dependencies:** Read by Cache Manager.
* **Repository Dependencies:** None.
* **Forbidden Responsibilities:** STRICTLY FORBIDDEN from calling Firestore, rendering visual lists, or changing tournament statuses.
* **Failure Conditions:** Throws if input arrays are empty or if a referenced distance multiplier configuration is missing.
* **Unit Test Targets:**
  * Test precision sorted order based on `highest_distance_multiplier` rule.
  * Test fallback sorting rules such as accuracy and sudden-death last-shot evaluation.

---

### 5. Qualification Engine (`QualificationEngine`)
* **Responsibility:** Tracks tournament brackets, handles cutoff marks, and places tied borderline athletes into shootout queues.
* **Inputs:** Sorted rankings array, advancing count bounds, and tie allowance parameters.
* **Outputs:** Qualification status lists (qualified, eliminated, shootout candidates).
* **Public Methods:**
  * `evaluate(input: QualificationRuleInput): QualificationResult`
* **Events Consumed:** None.
* **Events Published:** `QUALIFICATION_UPDATED`.
* **Cache Dependencies:** Read by Cache Manager.
* **Repository Dependencies:** None.
* **Forbidden Responsibilities:** No sorting algorithms, no direct database edits, and no UI presentation components.
* **Failure Conditions:** Fails if the specified advancing threshold is zero or negative.
* **Unit Test Targets:**
  * Confirm correct separation of clear qualifiers from shootout candidates when ties occur exactly at the border.
  * Validate correct behavior when the total number of participants is less than the advancing threshold.

---

### 6. Team Engine (`TeamEngine`)
* **Responsibility:** Compiles team and club scores by aggregating top individual athlete scores.
* **Inputs:** Club arrays, individual athlete records, and team scoring parameters.
* **Outputs:** Aggregated club standings list.
* **Public Methods:**
  * `calculateStandings(teamsData: TeamScoreInput[], limitToTopContrib: number): CalculatedTeamStandings[]`
* **Events Consumed:** None.
* **Events Published:** `TEAM_UPDATED`.
* **Cache Dependencies:** None.
* **Repository Dependencies:** None.
* **Forbidden Responsibilities:** No individual rankings calculations, no database updates, and no direct UI lists.
* **Failure Conditions:** Rejects calculations if club structures are missing or malformed.
* **Unit Test Targets:**
  * Verify team score sum accurately selects only the top specified contributors (e.g., top 3).
  * Assert standard descending sorting of aggregated club scores.

---

### 7. Solo Engine & Re-Solo Engine (`SoloEngine`, `ReSoloEngine`)
* **Responsibility:** Evaluates and resolves boundary tie-breakers via standard single-round shootoffs or sudden-death rounds.
* **Inputs:** Tie-breaking athlete shot logs and target configurations.
* **Outputs:** Shootout resolutions (winner identified, unresolved ties list).
* **Public Methods:**
  * `SoloEngine.evaluate(input: SoloShootoutInput): SoloShootoutResult`
  * `ReSoloEngine.evaluate(input: ReSoloInput): ReSoloResult`
* **Events Consumed:** None.
* **Events Published:** `SOLO_FINISHED`.
* **Cache Dependencies:** None.
* **Repository Dependencies:** None.
* **Forbidden Responsibilities:** Must not write results directly to Firestore or manage general tournament rounds.
* **Failure Conditions:** Rejects inputs with zero shootout shots.
* **Unit Test Targets:**
  * Confirm single-round tie resolution returns `isResolved: true` when one shooter scores higher.
  * Validate sudden-death progression matches real sudden death criteria shot-by-shot.

---

### 8. Statistics Engine (`StatisticsEngine`)
* **Responsibility:** Compiles statistical data (accuracies, averages, bullseyes, hot streaks).
* **Inputs:** Score data arrays and historical shot logs.
* **Outputs:** Consolidated analytical metrics reports.
* **Public Methods:**
  * `calculateAthleteMetrics(athlete: Athlete): AthletePerformanceMetrics`
  * `generateTrends(logs: ShotLogV2[]): { timestamp: number; accuracy: number }[]`
* **Events Consumed:** None.
* **Events Published:** `STATISTICS_UPDATED`.
* **Cache Dependencies:** Read by Cache Manager.
* **Repository Dependencies:** None.
* **Forbidden Responsibilities:** STRICTLY FORBIDDEN from rendering charts or updating datasets in the database.
* **Failure Conditions:** Gracefully handles null inputs, returning zeroed metrics rather than crashing.
* **Unit Test Targets:**
  * Assert accuracy percentage calculations yield correct precision decimal points.
  * Confirm trend graphs correctly compute incremental running metrics.

---

### 9. Event Bus (`eventBus`)
* **Responsibility:** Safe, loose asynchronous event dispatch system.
* **Inputs:** Event name and structured payload.
* **Outputs:** Dispatched payloads to all active subscriber callbacks.
* **Public Methods:**
  * `subscribe(event, callback): UnsubscribeFn`
  * `publish(event, payload)`
  * `clear()`
* **Forbidden Responsibilities:** Cannot run business logic or maintain persistent history.
* **Unit Test Targets:**
  * Verify all callbacks receive matching data during publish.
  * Ensure unsubscribe calls successfully detach listeners to prevent leaks.

---

### 10. Cache Manager (`cacheManager`)
* **Responsibility:** Temporarily persists expensive arrays with group tags and auto-expiry.
* **Inputs:** Keys, values, tags, and time-to-live seconds.
* **Outputs:** Cached object values or `null` if expired/missing.
* **Public Methods:**
  * `set(key, value, ttl, tags)`
  * `get(key)`
  * `invalidateByTag(tag)`
  * `clear()`
* **Forbidden Responsibilities:** Cannot execute database queries or perform calculations.
* **Unit Test Targets:**
  * Test automated TTL key eviction.
  * Test targeted multi-tag group eviction (e.g., clearing all keys linked to a specific tournament).

---

### 11. Repository Layer (`BaseRepository`, `TournamentRepository`)
* **Responsibility:** Handles all data persistence, operations change ledger logging, and offline synchronization.
* **Inputs:** Clean data payloads and database keys.
* **Outputs:** Completed database transfer acknowledgments.
* **Forbidden Responsibilities:** Cannot evaluate competitive ranking formulas, perform stats accumulation, or execute workflows.
* **Unit Test Targets:**
  * Verify that creating or updating records triggers operational audit logging.
  * Confirm that Firestore transfers successfully sanitize `undefined` keys to protect database integrity.

---

## 📊 3. DEPENDENCY VALIDATION MATRIX

To ensure complete architectural purity and prevent compiler errors, the dependency flows are strictly unidirectional:

| Source Module | Allowed Downstream Dependencies | Strictly Prohibited Dependencies |
| :--- | :--- | :--- |
| **Presentation (UI)** | `WorkflowEngine`, `EventBus`, `CacheManager` | `Firestore`, `RankingEngine`, `QualificationEngine` |
| **Workflow Engine** | `RankingEngine`, `MatchEngine`, `CacheManager`, `EventBus`, Repositories | Direct Firestore access, Presentation components |
| **Business Engines** | `EventBus` | Repositories, Firestore, Presentation, Other Engines |
| **Repositories** | `Firestore` | Business Engines, Presentation |
| **Event Bus** | None | All Engines (Acts purely as an event broker) |
| **Cache Manager** | None | All Engines |

---

## 🔒 4. ARCHITECTURE COMPLIANCE LOCK

We declare this architectural contract **OFFICIALLY FROZEN**.

1. **One-Directional Flow:** Every dependency is guaranteed to be one-directional. No circular dependency exists.
2. **Orchestration Lock:** `WorkflowEngine` is the sole orchestrator of the competitive pipeline.
3. **Purity Lock:** Business Engines are entirely stateless and do not communicate with Firestore or the UI directly.
4. **Data Isolation:** Direct Firestore writes occur exclusively via the Repository Layer, protected by automated `undefined` sanitizers.

*These guidelines are hereby locked as the official foundation for Vietnam Slingshot Championship Platform v3 Development.*
