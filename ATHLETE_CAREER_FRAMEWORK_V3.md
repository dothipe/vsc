# VSC Platform V3 — Athlete Career Framework & Statistics Engine Specification
Version: 1.0 (Official Standard)

This document specifies the architecture, data structures, and pipeline execution standards for the **Athlete Career Framework** and **Statistics Engine** inside the Vietnam Slingshot Championship (VSC) Platform V3. 

The primary goal of this framework is to establish an immutable, lifelong competitive record ("Single Source of Truth") for every athlete. These records power Athlete Profiles, Leaderboards, Dashboards, the Hall of Fame, and external consumers (Public Web, Mobile Apps, AI Analytics) without performing expensive client-side reductions or repeating queries against raw collections.

---

## 1. Core Architectural Guidelines

1. **Anti-Direct Compute Principle**:
   No Career or Statistics value may be computed on-the-fly inside React components or hooks. UI elements must strictly act as passive renderers of static pre-calculated snapshots.
2. **Deterministic Downstream Pipeline**:
   All metrics flow through a strict one-way event-driven pipeline:
   $$\text{Official Score Ledger} \rightarrow \text{Ranking Engine} \rightarrow \text{Statistics Engine} \rightarrow \text{Career Engine} \rightarrow \text{Achievement Engine} \rightarrow \text{Hall Of Fame} \rightarrow \text{Dashboard}$$
3. **No Database Pollution**:
   No redundant or duplicate collections should be created. The framework operates on standard V3 collections: `/athletes`, `/career_snapshots`, `/statistics_snapshots`, `/hall_of_fame`, `/event_logs`, `/ranking_snapshots`.
4. **Environment Isolation**:
   Metrics are aggregated independently per **Competition Environment** (Individual, Team, Duel, etc.) before being summarized into a unified Career Profile.

---

## 2. Dynamic Career & Statistics Hierarchy

Every competitor's lifelong narrative is represented in a nested logical hierarchy:

```
ATHLETE LIFETIME CAREER
└── Career Summary (Overall stats across all seasons)
    └── Season Records (Aggregated per year/season)
        └── Tournament Entries (Bound to active tournaments)
            └── Competition Environment Contexts
                ├── Individual (Accuracy, hits, streaks, round history)
                ├── Team (Club counts, average team scores, contribution rates)
                └── Duel / Future (Wins, losses, Elo/rating history, streak counters)
```

---

## 3. Athlete Career Profile Schema

Athlete career data is persisted inside `/career_snapshots` and `/athletes`. It represents the permanent overview of a competitor's legacy.

### 3.1 Overview Profile (`/athletes` Profile Extension)
*   **Athlete Identity**: Unique `athleteId`, national `vscNumber`, current Club (`currentClubId`), and personal info.
*   **Affiliations History**: A timeline map of clubs represented over past seasons.
*   **Status**: Active, Retired, Suspended, Pro/Amateur class.

### 3.2 Career Summary Schema (`/career_snapshots`)
```json
{
  "snapshotId": "career_overall_${athleteId}",
  "athleteId": "ath_990124",
  "vscNumber": "VSC-HB-0023",
  "fullName": "Nguyễn Văn A",
  "currentClubId": "club_hanoi",
  "province": "Hà Nội",
  "joinedDate": "2024-03-12T08:00:00Z",
  "environmentsParticipated": ["individual", "team"],
  "careerSummary": {
    "totalSeasons": 3,
    "totalTournaments": 12,
    "totalEvents": 36,
    "totalShotsFired": 360,
    "totalShotsHit": 298,
    "lifetimeAccuracy": 82.77
  },
  "achievements": {
    "goldCount": 4,
    "silverCount": 2,
    "bronzeCount": 1,
    "podiums": 7,
    "top5Finishes": 9,
    "top10Finishes": 11,
    "badges": ["CHAMPION_2025", "PERFECT_10M_ROUND", "LONGEST_STREAK_24"]
  },
  "rankingHistory": [
    {
      "seasonId": "season_2024",
      "tournamentId": "tour_national_2024",
      "environment": "individual",
      "rank": 3,
      "score": 94,
      "classification": "professional"
    },
    {
      "seasonId": "season_2025",
      "tournamentId": "tour_national_2025",
      "environment": "individual",
      "rank": 1,
      "score": 98,
      "classification": "professional"
    }
  ],
  "updatedAt": "2026-06-28T02:00:00Z"
}
```

---

## 4. Statistics Engine Specifications

The Statistics Engine partitions metric calculations per **Competition Environment** to prevent mathematical skewing. For example, a team score (aggregated over 3 or 4 club shooters) is never commingled with an individual competitor's personal scorecard.

### 4.1 Individual Statistics Context
*   **Average Score**: Cumulative total score divided by total rounds completed.
*   **Best Score & Worst Score**: Global boundaries for competitor performance under tournament pressure.
*   **Average Accuracy**: $(\text{Total Hits} / \text{Total Shots Fired}) \times 100$.
*   **Streak Metrics**: Highest continuous hit sequence across all distances (10m, 12m, 15m) without a miss.
*   **Distance Benchmarks**: Specific average and best scores segregated for 10m, 12m, and 15m lines.

### 4.2 Team Statistics Context
*   **Contribution Ratio**: Number of times an athlete's scorecard was selected to represent their Club's top counting score.
*   **Club Matches**: Total team occurrences represented in a season.
*   **Best Team Result**: Highest cumulative team score recorded in a single registered event.

### 4.3 Duel & Future Statistics Context (Future-Ready Platform Design)
*   **Match Record**: Win / Lose / Draw counters.
*   **Win Rate**: Percentage of overall matches won.
*   **Elo Rating Engine**: Numerical rating system tracking relative skill level. Updates after each Match outcome using standard formula:
    $$R_{\text{new}} = R_{\text{old}} + K \cdot (S - E)$$
*   **Streak Counters**: Current active consecutive match wins.

### 4.4 Statistics Document Schema (`/statistics_snapshots`)
```json
{
  "snapshotId": "stats_overall_${athleteId}",
  "athleteId": "ath_990124",
  "environments": {
    "individual": {
      "averageScore": 91.4,
      "bestScore": 99,
      "worstScore": 82,
      "averageAccuracy": 85.5,
      "totalShots": 240,
      "totalHits": 205,
      "highestHitStreak": 17,
      "byDistance": {
        "10m": { "average": 94.2, "best": 99 },
        "12m": { "average": 90.1, "best": 95 },
        "15m": { "average": 86.8, "best": 91 }
      }
    },
    "team": {
      "averageTeamScore": 274.5,
      "matchesContributed": 8,
      "contributionRate": 87.5
    },
    "duel": {
      "wins": 0,
      "losses": 0,
      "draws": 0,
      "winRate": 0.0,
      "currentRating": 1500,
      "highestRating": 1500,
      "streak": 0
    }
  },
  "updatedAt": "2026-06-28T02:00:00Z"
}
```

---

## 5. Pluggable Achievement Framework

To enable adding custom competitive milestones (e.g., promotional achievements, sponsor-driven goals) without changing core engine code, VSC Platform V3 uses a **Pluggable Achievement Specification**.

### 5.1 Achievement Rules Registry
Achievements are represented by a rule configuration mapping standard statistics parameters to targeted thresholds:

| Achievement ID | Icon / Badge | Target Environment | Metric Dependency | Trigger Threshold |
| :--- | :--- | :--- | :--- | :--- |
| `CHAMPION_VSC` | 🏆 | Global / Any | `rankingHistory[].rank` | `== 1` |
| `PERFECT_ROUND` | 🎯 | Individual | `official_score_ledger.shots` | `all elements == 10 (or Hit)` |
| `SHARPSHOOTER_15M` | ⚡ | Individual | `statistics.individual.byDistance.15m.best` | `== 100` |
| `STREAK_MASTER` | 🔥 | Individual | `statistics.individual.highestHitStreak` | `\ge 20` |
| `TEAM_ANCHOR` | ⚓ | Team | `statistics.team.contributionRate` | `\ge 90.0` |
| `ELITE_RATING` | ⭐ | Duel | `statistics.duel.currentRating` | `\ge 2000` |

### 5.2 Dynamic Evaluator Block
When a Statistics or Career update completes, the `AchievementEngine` loops through active templates registered inside the `/rule_templates` or `/templates` directory, evaluates the athlete's metrics against rules, and adds matching badge tags to `/career_snapshots`.

---

## 6. High-Performance Event-Driven Pipeline

To eliminate high processing costs and slow loading times from querying large collections (such as `/official_score_ledger`), the Athlete Career Framework relies on **Incremental Aggregation**.

### 6.1 State Flow Diagram
```
[Referee Terminal]
       │
       ▼ (Write)
[official_score_ledger]
       │
       ▼ (Triggers Real-time Sync)
[Ranking Engine]
       │
       ▼ (Calculates Round Standings & Emits EVENT_SCORE_AGGR)
[Statistics Engine] ──► Reads Current /statistics_snapshots & Increments Metrics
       │
       ▼ (Publishes EVENT_STATS_UPDATED)
[Career Engine] ───► Updates /career_snapshots (Season tally, Club history)
       │
       ▼
[Achievement Engine] ──► Applies Rules & Appends Badges
       │
       ▼
[Hall of Fame] ────► Evaluates Championship Medals / Legends Records
       │
       ▼
[Passive UI Views] ──► Home Dashboard, Public Profile, Mobile Apps
```

### 6.2 Processing Optimization (Cache-First Ingestion)
1. **Transaction Isolation**: Calculations for a specific athlete only fetch the athlete's own career documents rather than the full table of competitors.
2. **Atomic Increments**: Value counts (e.g., `totalShotsFired`, `totalShotsHit`) use Firestore `increment()` operations where applicable to avoid race conditions.
3. **Trigger Cooldowns (Debouncing)**: During high-frequency live shooting rounds, the Career Engine is decoupled via background queuing. Statistics and Career documents are recalculated at the end of each Heat or Distance, rather than shot-by-shot, saving read/write overhead.

---

## 7. Unified Presentation Layer (Passive Consumer Specs)

UI views read standardized collections directly:

1. **Dashboard Overview Screen**:
   * Displays the Top 3 Shooters by retrieving the latest static overall `ranking_snapshots` document.
   * Displays the Hall of Fame widget by pulling `/hall_of_fame` filtered by `awardType == 'champion'`.
2. **Athlete Profile Page**:
   * Resolves basic details from `/athletes`.
   * Loads career progress and awards directly from `career_snapshots/career_overall_${athleteId}`.
   * Renders the interactive radar chart or line graphs using values in `statistics_snapshots/stats_overall_${athleteId}`.
3. **Hall Of Fame Carousel**:
   * Reads from `/hall_of_fame` collection sorted chronologically by `achievedAt` timestamp.
   * No recalculation of historical tournament scores is done on-screen.
