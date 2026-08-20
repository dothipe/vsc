# VSC Platform V3 — Club Domain Framework Specification
Version: 1.0 (Official Standard)

This document specifies the architecture, data models, aggregation mechanisms, and lifecycle rules of the **Club Domain Framework** inside the Vietnam Slingshot Championship (VSC) Platform V3.

Clubs represent the regional organizational pillars of the VSC. Under Platform V3, the Club Domain is established as a **Passive Aggregator**, pulling compiled statistics, standings, and competitive historical metrics from the core engines and Athlete Domain to avoid redundant database lookups.

---

## 1. Domain Principles & Guidelines

1. **Sovereign Profile Principle**:
   A Slingshot Club is an independent organizational entity. Its identity remains intact year-over-year, regardless of seasonal status, league transitions, or member roster churn.
2. **Passive Consumption Strategy**:
   The Club Domain does not dynamically compute aggregate performance metrics (e.g., total accuracy, hit counts, or podium points) during read operations. All numerical metrics are aggregated by the `Statistics Engine` and `Ranking Engine` and written directly into persistent snapshots.
3. **Audit-Safe Historical Tracking**:
   Historical rosters, leadership tenures, and territorial changes are preserved via append-only ledgers to prevent retroactive breakage of past tournament results.
4. **Zero-Duplicate Architecture**:
   Club structures refer to the central `Athlete Identity` or `User ID` via reference keys instead of duplicating core demographic fields like names, dates of birth, or avatar paths.

---

## 2. Club Identity Core (`/clubs`)

The primary `/clubs` collection is the Single Source of Truth for a club’s administrative identity.

```json
{
  "clubId": "club_hanoi",
  "clubName": "Câu lạc bộ Slingshot Hà Nội",
  "shortName": "HN Slingshot",
  "logo": "local-media:club_hanoi_logo",
  "banner": "local-media:club_hanoi_banner",
  "province": "Hà Nội",
  "address": "Sân vận động Mỹ Đình, Hà Nội",
  "description": "Câu lạc bộ đại diện khu vực Hà Nội, thành lập từ năm 2024.",
  "managerUserId": "usr_hanoi_mgr_001",
  "foundedDate": "2024-03-15",
  "status": "active", // active, inactive, suspended, merged, dissolved
  "statistics": {
    "totalAthletes": 24,
    "totalChampions": 4,
    "totalPodium": 12,
    "totalTournamentsParticipated": 8,
    "totalMedals": {
      "gold": 4,
      "silver": 5,
      "bronze": 3
    }
  },
  "rankings": {
    "currentSeasonPoints": 380,
    "currentSeasonRank": 1,
    "allTimePoints": 1250,
    "allTimeRank": 2
  },
  "createdAt": "2024-03-15T08:00:00Z",
  "updatedAt": "2026-06-28T04:00:00Z"
}
```

---

## 3. Club Member Ledger (`/club_members`)

A separate ledger manages club affiliations to allow tracking historical, active, and pending statuses without overloading the master `/clubs` file.

```json
{
  "memberId": "mem_club_hanoi_ath_990124",
  "clubId": "club_hanoi",
  "athleteId": "ath_990124",
  "userId": "usr_771892",
  "role": "member", // leader, deputy, manager, member, coach
  "status": "active", // active, pending_approval, left, suspended
  "joinedAt": "2025-01-01T00:00:00Z",
  "leftAt": null
}
```

### 3.1 Roster Status Lifecycle
*   **`pending_approval`**: An athlete has submitted a request to join the club, waiting for the Club Manager or Admin approval.
*   **`active`**: Fully verified competitor representing the club in ongoing Tournaments.
*   **`left`**: Archival state. Tracks previous club affiliation, ensuring historical records for previous seasons remain correct.

---

## 4. Club Competition History & Rankings

Club Standings are calculated per-tournament and accumulated per-season.

### 4.1 Data Pipeline for Standings
1.  **Ingestion**: Individual athlete scores are locked in the `/official_score_ledger`.
2.  **Engine Computation**: The `Ranking Engine` calculates team/individual performance and assigns points to the corresponding `clubId`.
3.  **Snapshot Update**: The `Statistics Engine` updates the club's rankings node inside `/clubs` and `/season_rankings` structures.

```
[Official Score Ledger] ──► [Ranking Engine] ──► [Statistics Engine] ──► [Club Domain Snapshots]
```

---

## 5. Club Timeline Events (`/club_timeline_events`)

Timeline segments are automatically appended when important club milestones occur. No manual entries are allowed.

```json
{
  "eventId": "evt_club_timeline_hanoi_001",
  "clubId": "club_hanoi",
  "timestamp": "2025-06-15T18:30:00Z",
  "eventType": "CLUB_CHAMPION_UNLOCKED",
  "title": "Vô địch cá nhân đầu tiên",
  "description": "Vận động viên Nguyễn Văn A giành Huy chương Vàng quốc gia cá nhân đầu tiên cho CLB.",
  "metadata": {
    "athleteId": "ath_990124",
    "athleteName": "Nguyễn Văn A",
    "tournamentId": "tour_national_2025"
  }
}
```

---

## 6. High-Performance Caching & Lazy Loading

To protect the server against high-frequency database operations:
*   **Roster Fetching**: Roster lookups query `/club_members` where `clubId == targetId` and `status == 'active'`, returning paginated lists of 20 members at a time.
*   **Timeline Feeds**: Rendered on lazy scroll, fetching timeline events in increments of 10.
