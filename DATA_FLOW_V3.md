# VSC Platform V3 — Central Data Flow Specification (DATA_FLOW_V3)
Version: 1.0 (Official Standard)

This document specifies the pipeline, processing rules, and synchronization boundaries for the flow of data inside the Vietnam Slingshot Championship (VSC) Platform V3. 

To maintain low read/write overhead and keep client responsiveness high, data propagates through a strict, unidirectional execution flow. Raw data is stored once, aggregated by specialized engines, and consumed as static, pre-calculated snapshots.

---

## 1. The VSC Core Data Pipeline

```
               [Referee Terminal]
                       │
                       ▼ (Write Raw Record)
             [official_score_ledger]
                       │
                       ▼ (Trigger Execution)
                [Ranking Engine]
                       │
                       ▼ (Calculate Standings)
              [Statistics Engine]
                       │
                       ▼ (Aggregate Metrics)
                [Career Engine]
                       │
                       ▼ (Compile Tally Snapshot)
              [Achievement Engine]
                       │
                       ▼ (Verify Milestones & Badges)
               [Athlete Domain]
                       │
                       ▼ (Propagate Event)
                [Club Domain]
                       │
                       ▼ (Propagate Event)
              [Province Domain]
                       │
                       ▼ (Propagate Event)
                [Season Domain]
                       │
                       ▼ (Compile Season Snapshots)
              [Hall of Fame] ──────► [Home Dashboard]
                       │                     │
                       ▼                     ▼
               [Public Website]  ──►  [Mobile App / Public API]
```

---

## 2. Pipeline Segment Specifications

### 2.1 Segment 1: Ingestion & Verification (`/official_score_ledger`)
*   **Actor**: Referee Terminal.
*   **Mechanism**: The referee registers targets shot-by-shot or round-by-round. On entry lock, a flat record is written to `/official_score_ledger`.
*   **Key Design**: Key format is structured as `${tournamentId}_${roundId}_${athleteId}_${distanceId}` to prevent duplicate score overwriting.

### 2.2 Segment 2: Standings Calculations (`RankingEngine`)
*   **Trigger**: Event `EVENT_SCORE_PUBLISHED` or end-of-round state finalization.
*   **Action**: The `RankingEngine` subscribes to ledger updates, groups records by `competitionMode` and `roundId`, executes target-hit tie-breaker and shoot-off rules, and writes standing results into `/ranking_snapshots`.

### 2.3 Segment 3: Performance Metrification (`StatisticsEngine`)
*   **Trigger**: Event `EVENT_RANKING_FINALIZED`.
*   **Action**: The `StatisticsEngine` pulls the athlete's latest `/statistics_snapshots` document, applies incremental aggregation math (best/worst scores, lifetime hit/miss ratio, highest hit-streak stability), and publishes updated records back to the database.

### 2.4 Segment 4: Athlete Profile Synthesis (`CareerEngine` & `AchievementEngine`)
*   **Trigger**: Event `EVENT_STATS_UPDATED`.
*   **Action**: 
    1.  The `CareerEngine` records year-over-year tournament entries, club participation histories, and podium finishes inside the central `/career_snapshots` collection.
    2.  The `AchievementEngine` reads the newly updated statistics and checks them against rules registered in `/templates`. Matching achievement identifiers are appended to the athlete's badge record.

### 2.5 Segment 5: Sovereign Athlete Representation (`Athlete Domain`)
*   **Trigger**: Lifecycle completion events.
*   **Action**: The updated `career_snapshots` and `statistics_snapshots` are mapped to the core `/athletes` identity profile. Timeline entries are published into `/athlete_timeline_events`.

### 2.6 Segment 6: Club Domain Aggregation (`Club Domain`)
*   **Trigger**: Event `EVENT_ATHLETE_UPDATED` or roster transfer execution.
*   **Action**: Summarizes and maps athlete performance snapshots to the corresponding active `/clubs` record, updates rosters, and logs `/club_timeline_events`.

### 2.7 Segment 7: Province Domain Aggregation (`Province Domain`)
*   **Trigger**: Event `EVENT_CLUB_UPDATED` or geographic representation changes.
*   **Action**: Consolidates regional athlete performance snapshots, updates club rosters within the region, and logs `/province_timeline_events`.

### 2.8 Segment 8: Seasonal Domain Aggregation (`Season Domain`)
*   **Trigger**: Event `EVENT_PROVINCE_UPDATED` or conclusion of tournament activities.
*   **Action**: Summarizes and maps geographic performance snapshots into general `/seasons` statistics, records, and seasonal `/season_rankings` structures.

### 2.9 Segment 9: Consumer Consumption (`Hall Of Fame`, `Dashboard`, and `APIs`)
*   **Action**: The Hall Of Fame, Dashboard, and public-facing APIs subscribe exclusively to the pre-rendered `/seasons`, `/season_rankings`, and `/career_snapshots` collections. Clients do not parse raw transactional logs, preserving processing speed.

---

## 3. High-Performance Caching & Isolation Standards

1.  **Atomic Transactional Isolation**: Engine operations affecting a specific competitor only request documents belonging to that `athleteId`.
2.  **Debounced Recalls**: During high-intensity competitive tournaments, career compilation processes run on cooldown loops or background queues (recalculating at the completion of an entire distance or round rather than on every single shot).
3.  **Client-Side Lazy Loading**: Large historical arrays or timeline lists must be segmented and queried using limits and starting offset boundaries.
