# VSC Platform V3 — Athlete Competitive History Specification (ATHLETE_HISTORY_V3)
Version: 1.0 (Official Standard)

This document specifies the architecture, tracking schemas, and preservation guidelines for **Athlete Competitive History** in the Vietnam Slingshot Championship (VSC) Platform V3. 

To maintain system integrity, historical competitive data must be fully preserved. This specification ensures that whenever an athlete joins a season, represents a club, or enters a tournament, a permanent, non-overwritable historical entry is created.

---

## 1. Competitive History Hierarchy

Competitive data is tracked through a structured relational hierarchy from high-level seasons down to individual shot ledger logs:

```
SEASON HISTORY
└── Club Representation History (Province, Club transfers)
    └── Tournament Entry History (Active participation list)
        └── Competition Environment Contexts (Individual, Team, etc.)
            └── Result Records (Standings, Round scores, Shot statistics)
```

---

## 2. Club & Province Representation History

To prevent retroactively breaking past tournament results, changing an athlete's current club or province inside `/athletes` must **never** overwrite historic statistics. 

Instead, representation is tracked via:
1.  **Direct Stamp on Ledgers**: Every score submitted to `/official_score_ledger` and `/ranking_snapshots` explicitly contains the active `clubId` and `province` at the time of publication.
2.  **Affiliation Logs**: An athlete's structural history is maintained as an array of previous representations inside their `/career_snapshots` file:

```json
{
  "athleteId": "ath_990124",
  "affiliationHistory": [
    {
      "seasonId": "season_2024",
      "clubId": "club_36sc",
      "province": "Thanh Hóa",
      "validFrom": "2024-01-01T00:00:00Z",
      "validTo": "2024-12-31T23:59:59Z"
    },
    {
      "seasonId": "season_2025",
      "clubId": "club_hanoi",
      "province": "Hà Nội",
      "validFrom": "2025-01-01T00:00:00Z",
      "validTo": null
    }
  ]
}
```

---

## 3. Tournament Entry & Results History

Every time an athlete enters a tournament, their presence is captured inside the `/tournament_entries` collection. When results are finalized, the scoring metrics are committed to the overall ranking collection.

### 3.1 Tournament Entry Record Schema (`/tournament_entries`)
```json
{
  "entryId": "entry_tour_national_2025_ath_990124",
  "tournamentId": "tour_national_2025",
  "athleteId": "ath_990124",
  "registeredClubId": "club_hanoi",
  "registeredProvince": "Hà Nội",
  "status": "participated", // pending, active, participated, disqualified, dns (did not start)
  "registeredEnvironments": ["individual", "team"],
  "registeredAt": "2025-05-10T12:00:00Z"
}
```

### 3.2 Finalized Result Schema (`/tournament_results`)
Upon tournament closure, detailed standing summaries are compiled and cached permanently inside `/tournament_results` to prevent recalculation.

```json
{
  "resultId": "res_tour_national_2025_individual_ath_990124",
  "tournamentId": "tour_national_2025",
  "seasonId": "season_2025",
  "athleteId": "ath_990124",
  "competitionMode": "individual",
  "rank": 1,
  "score": 98,
  "totalHits": 10,
  "shotsCount": 10,
  "averageAccuracy": 100.0,
  "clubId": "club_hanoi",
  "province": "Hà Nội",
  "achievedAt": "2025-06-15T18:30:00Z"
}
```

---

## 4. Preservation & Compliance Standards

1.  **No Retroactive Corruption**: Even if an athlete retires or moves to a new club, their historical results in `/tournament_results` and `/official_score_ledger` must remain unaltered. This preserves historical club points and season-end rankings.
2.  **Audit Isolation**: Any manual administrative alterations to past scores must publish a record to `/audit_logs` identifying the actor, target athlete, previous score, and corrected score to maintain credibility.
3.  **Soft Disqualification Handling**: If an athlete is disqualified post-tournament, their status in `/tournament_entries` is changed to `disqualified` and their results in `/tournament_results` are marked with `rank: -1` (or equivalent status code) to flag them on public rankings while keeping the raw performance metrics stored for transparency.
