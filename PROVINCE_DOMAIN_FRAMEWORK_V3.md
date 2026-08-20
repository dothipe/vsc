# VSC Platform V3 — Province Domain Framework Specification
Version: 1.0 (Official Standard)

This document specifies the architecture, data models, registry integrations, and data pipeline of the **Province Domain Framework** inside the Vietnam Slingshot Championship (VSC) Platform V3.

In the VSC ecosystem, Provinces/Cities represent the geographic foundation of the sport. Under VSC Platform V3, the Province Domain is established as a sovereign **Passive Aggregator** that maps localized clubs, registers local athlete identities, and stores pre-compiled historical records without running dynamic calculation algorithms on read requests.

---

## 1. Domain Principles & Guidelines

1. **Geographic Sovereignty**:
   A Province (Tỉnh/Thành) is an invariant regional entity. Its identity and historical performance are persistent and do not shift across tournament seasons.
2. **Registry Aggregation (No Data Duplication)**:
   Provinces do not duplicate athlete or club profiles. The Province Domain relies entirely on reference registries (`athleteId` and `clubId`) to fetch details dynamically or render structured aggregates.
3. **Passive Metric Compilation**:
   The Province Domain is strictly forbidden from parsing raw shot ledgers or running sorting arrays dynamically at the UI layer. All statistics, medal tallies, and rankings are computed by specialized engines and written back to dedicated province snapshot structures.
4. **Historical Immutability**:
   Once tournament records are locked, a province's competitive achievements, timeline events, and ranking points for that event/season are permanently sealed.

---

## 2. Province Identity Core Schema (`/provinces`)

The `/provinces` collection acts as the Single Source of Truth for a province's identity, geographic context, and cached performance milestones.

```json
{
  "provinceId": "prov_hanoi",
  "provinceName": "Hà Nội",
  "provinceCode": "HN",
  "region": "Bắc", // Bắc, Trung, Nam
  "status": "active", // active, inactive, suspended
  "statistics": {
    "totalClubs": 4,
    "totalAthletes": 38,
    "totalChampions": 5,
    "totalPodiums": 14,
    "totalTournamentsParticipated": 12
  },
  "rankings": {
    "currentSeasonPoints": 520,
    "currentSeasonRank": 1,
    "allTimePoints": 2150,
    "allTimeRank": 2
  },
  "createdAt": "2024-01-10T00:00:00Z",
  "updatedAt": "2026-06-28T04:30:00Z"
}
```

---

## 3. Reference Registries & Integrations

Rather than storing arrays of user or club details directly inside the `/provinces` document (which risks hitting document size limits), relationships are maintained as queryable reference indices:

### 3.1 Athlete-to-Province Registry Mapping
Athletes are mapped to a province via the `province` or `provinceId` attribute on their primary `/athletes` document (see `ATHLETE_IDENTITY_V3.md`). 
*   **Query Pattern**: To render a province's active roster:
    ```javascript
    const activeAthletesQuery = query(
      collection(db, "athletes"),
      where("province", "==", "Hà Nội"),
      where("status", "==", "active")
    );
    ```

### 3.2 Club-to-Province Registry Mapping
Clubs are mapped to a province via the `province` property inside their `/clubs` record (see `CLUB_DOMAIN_FRAMEWORK_V3.md`).
*   **Query Pattern**: To render all registered slingshot clubs within a province:
    ```javascript
    const localClubsQuery = query(
      collection(db, "clubs"),
      where("province", "==", "Hà Nội"),
      where("status", "==", "active")
    );
    ```

---

## 4. Province Competitive History & Rankings

A Province's athletic trajectory is mapped chronologically per-season and per-tournament. 

### 4.1 Competitive History Array Schema (`/province_competition_history`)
Stores specific seasonal and tournament summaries for historical lookups:

```json
{
  "historyId": "hist_prov_hanoi_season_2026_tour_national",
  "provinceId": "prov_hanoi",
  "seasonId": "season_2026",
  "tournamentId": "tour_national_2026",
  "competitionMode": "individual",
  "pointsContributed": 120,
  "topRankAchieved": 1,
  "medalsCount": {
    "gold": 1,
    "silver": 2,
    "bronze": 0
  },
  "updatedAt": "2026-06-28T04:30:00Z"
}
```

---

## 5. Province Timeline Events (`/province_timeline_events`)

The province timeline tracks historical milestones of the region, automatically published via down-stream system hooks on key achievements.

```json
{
  "eventId": "evt_prov_tml_hanoi_003",
  "provinceId": "prov_hanoi",
  "timestamp": "2026-06-15T18:30:00Z",
  "eventType": "PROVINCE_CHAMPION_ESTABLISHED",
  "title": "Vô địch quốc gia đầu tiên thuộc về Hà Nội",
  "description": "VĐV Nguyễn Văn A xuất sắc lập kỷ lục quốc gia mới, đưa đoàn thể thao Hà Nội dẫn đầu bảng xếp hạng tỉnh thành.",
  "metadata": {
    "athleteId": "ath_990124",
    "athleteName": "Nguyễn Văn A",
    "tournamentId": "tour_national_2026",
    "score": 99
  }
}
```

### 5.1 Automated Timeline Events
*   `PROVINCE_CLUB_FOUNDED`: Triggered when the first club in a province is approved.
*   `PROVINCE_TOURNAMENT_ENTERED`: Triggered when athletes represent the province in an official tournament.
*   `PROVINCE_CHAMPION_ESTABLISHED`: Triggered when a province's representative wins a Gold Medal (1st Place).
*   `PROVINCE_HOF_ENTRY`: Triggered when a province representative is inducted into the Hall of Fame.

---

## 6. Province Unidirectional Data Flow

The Province Domain acts as a downstream consumer of the main VSC processing engines, collecting aggregated results to compile geographical statistics.

```
[Referee Terminal (Raw Shots)]
             │
             ▼ (Write)
   [Official Score Ledger]
             │
             ▼ (Calculate)
      [Ranking Engine]
             │
             ▼ (Emits EVENT_RANKING_FINALIZED)
    [Statistics Engine] ───► Calculates Athlete/Club Averages
             │
             ▼ (Emits EVENT_STATS_UPDATED)
     [Athlete Domain]   ───► Pins Active Representative Affiliations
             │
             ▼
      [Club Domain]     ───► Bundles Club-to-Province Contributions
             │
             ▼
    [Province Domain]   ───► Compiles Province Standings, Stats, and Timeline
             │
             ▼ (Emits EVENT_PROVINCE_UPDATED)
     [Season Domain]    ───► Calculates Year-End General Standings
             │
             ▼
      [Hall of Fame]    ───► Materialized Client Dashboards
```

---

## 7. Performance & Indexing Standards

1.  **Registry Pagination**: List renders of active provincial athletes or clubs must enforce limits of `limit(20)` to prevent DOM bloat on dense provinces.
2.  **No High-Frequency Writes**: Province statistics update strictly upon the locking of a tournament or round, avoiding hotkey errors on the Firestore province document during live firing.
3.  **Composite Index Alignment**: Queries filtering by region and status (e.g., `where("region", "==", "Bắc").where("status", "==", "active")`) must align with standard Composite Indexes configured in `firestore.indexes.json`.
