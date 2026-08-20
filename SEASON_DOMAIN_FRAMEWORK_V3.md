# VSC Platform V3 — Season Domain Framework Specification
Version: 1.0 (Official Standard)

This document specifies the architecture, lifecycle, registries, and data flow of the **Season Domain Framework** inside the Vietnam Slingshot Championship (VSC) Platform V3.

The Season Domain acts as the supreme administrative and athletic bounding box for all competitive events, ranking snapshots, tournament registries, and seasonal legacy records. All downstream modules (Dashboard, Liveboard, Hall of Fame, and Public Website) query the Season Domain as the absolute **Single Source of Truth** for a given competitive year, eliminating redundant calculations.

---

## 1. Domain Principles & Core Guidelines

1. **Sovereign Boundary Principle**:
   A Season is an independent, top-level domain entity. Tournaments, registrations, and scores belong to exactly one Season, but the Season itself exists independently of any single competitive event.
2. **Locked Lifecycle Integrity**:
   Once a Season is marked as `completed` or `archived`, its rankings, statistics, and records are frozen. No retroactive scoring alterations, referee changes, or athlete transfers are permitted to modify the historical integrity.
3. **No Dynamic Calculations**:
   UI Views (Dashboard, Hall of Fame) must never dynamically calculate aggregate standings, medal tallies, or club points. All metrics are compiled into persistent, optimized snapshots owned by the Season Domain.
4. **Decoupled Architecture**:
   The Season Domain consumes pre-calculated outputs from the `Ranking Engine`, `Statistics Engine`, and `Athlete Domain` using an event-driven flow, ensuring isolated and performant data pathways.

---

## 2. Core Season Entity Schema (`/seasons`)

The `/seasons` collection contains the master definitions, parameters, and compiled stats/records for each competition season.

```json
{
  "seasonId": "season_2026",
  "name": "VSC Championship Season 2026",
  "year": 2026,
  "description": "Mùa giải vô địch Slingshot Việt Nam năm 2026 - Quy tụ các câu lạc bộ hàng đầu cả nước.",
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-12-31T23:59:59Z",
  "status": "active", // draft, registration, active, completed, archived
  "tournamentRegistry": [
    "tour_national_2026",
    "tour_thanh_hoa_2026",
    "tour_north_2026",
    "tour_south_2026"
  ],
  "statistics": {
    "totalTournaments": 4,
    "totalAthletes": 150,
    "totalClubs": 18,
    "totalShotsFired": 12500,
    "totalReferees": 24,
    "totalMatches": 48,
    "totalChampions": 6
  },
  "records": {
    "highestIndividualScore": 99,
    "highestIndividualScoreAthleteId": "ath_990124",
    "longestHitStreak": 28,
    "longestHitStreakAthleteId": "ath_990124",
    "mostChampionships": 2,
    "mostChampionshipsAthleteId": "ath_990124",
    "topClubPoints": 156,
    "topClubId": "club_hanoi"
  },
  "createdAt": "2025-12-15T08:00:00Z",
  "updatedAt": "2026-06-28T04:00:00Z"
}
```

### 2.1 Season Lifecycle States

*   **`draft`**: The season is being planned. Tournaments are being created and registered. No scores can be recorded yet.
*   **`registration`**: Athlete registration and club submissions are open.
*   **`active`**: Tournaments are actively taking place. Points are accumulating. Real-time ranking snapshots are recalculating.
*   **`completed`**: All registered tournaments have concluded. Rankings, achievements, and records are calculated, compiled, and **Frozen**.
*   **`archived`**: Historical state. The season is read-only, archived in the database for future lookups.

---

## 3. High-Performance Event-Driven Data Flow

The Season Domain updates itself incrementally using lightweight domain events published by concluding tournaments.

```
[Official Score Ledger]
       │
       ▼ (Referee Lock)
[Ranking Engine] Recalculates Tournament Rankings
       │
       ▼ (Emits EVENT_RANKING_FINALIZED)
[Statistics Engine] Compiles Athlete/Club Season Standings
       │
       ▼ (Emits EVENT_STATS_UPDATED)
[Season Domain] Recalculates Season Rankings, Aggregates Stats & Records
       │
       ▼ (Emits EVENT_SEASON_COMPLETED - Triggered on Season Lock)
[Passive UI Views] Hall of Fame, Dashboard, Public Site
```

### 3.1 Recalculation Optimization
*   To avoid scanning `/official_score_ledger` repeatedly, the Season statistics increment atomically using Firestore `increment()` operations when tournament snapshots are committed.
*   The Season Rankings are generated from tournament snapshot aggregates rather than raw ledger records, reducing Firestore read operations by up to 98%.
