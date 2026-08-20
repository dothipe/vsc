# VSC Platform V3 — Season Ranking Specification (SEASON_RANKING_V3)
Version: 1.0 (Official Standard)

This document specifies the schema, scoring accumulation standards, and calculation logic for **Season Rankings** inside the Vietnam Slingshot Championship (VSC) Platform V3.

Season Rankings aggregate competitor performances across all registered tournaments in a given competitive season, dividing outcomes into four primary standing boards: Individual, Team, Club, and Province.

---

## 1. Season Ranking Architecture

To ensure high performance and prevent database read bottlenecks, all Season Rankings are pre-calculated and stored in the `/season_rankings` collection.

```
                    ┌─────────────────────────┐
                    │     SEASON RANKINGS     │
                    └────────────┬────────────┘
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    Individual    │    │       Team       │    │  Club / Province │
│   Rankings Map   │    │   Rankings Map   │    │   Rankings Map   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 2. Data Schema (`/season_rankings`)

Each document represents a specific ranking category within a season.

```json
{
  "rankingId": "season_rank_season_2026_individual",
  "seasonId": "season_2026",
  "type": "individual", // individual, team, club, province
  "rankings": [
    {
      "rank": 1,
      "id": "ath_990124",
      "name": "Nguyễn Văn A",
      "vscNumber": "VSC-HB-0023",
      "clubId": "club_hanoi",
      "clubName": "CLB Slingshot Hà Nội",
      "points": 380,
      "goldCount": 3,
      "silverCount": 1,
      "bronzeCount": 0,
      "totalShots": 120,
      "accuracy": 92.5
    },
    {
      "rank": 2,
      "id": "ath_883011",
      "name": "Trần Văn C",
      "vscNumber": "VSC-HB-0044",
      "clubId": "club_thanhhoa",
      "clubName": "CLB Slingshot Thanh Hóa",
      "points": 350,
      "goldCount": 1,
      "silverCount": 2,
      "bronzeCount": 1,
      "totalShots": 120,
      "accuracy": 89.1
    }
  ],
  "updatedAt": "2026-06-28T04:00:00Z"
}
```

---

## 3. Accumulation & Tie-Breaker Rules

### 3.1 Point Accumulation Matrix
Points are awarded based on an athlete's finish in each registered tournament. The standard VSC Point Matrix is defined as:

| Standing | Points Awarded |
| :--- | :--- |
| **1st Place (Gold)** | 100 Points |
| **2nd Place (Silver)** | 80 Points |
| **3rd Place (Bronze)** | 60 Points |
| **4th Place** | 50 Points |
| **5th Place** | 45 Points |
| **6th to 10th Place** | 35 Points |
| **Participation** | 10 Points |

### 3.2 Individual Rankings
*   **Formula**: $\text{Total Season Points} = \sum (\text{Tournament Points})$.
*   **Tie-Breaker Hierarchy**:
    1.  **Championship Count**: Total number of 1st-place (Gold) finishes.
    2.  **Podium Finishes**: Total number of Top 3 finishes.
    3.  **Accuracy Average**: Overall accuracy percentage across all rounds of the season.

### 3.3 Club Rankings
*   **Formula**: A Club's seasonal score is the sum of points accumulated by its registered members in all tournaments.
*   **Tie-Breaker Hierarchy**:
    1.  **Total Club Gold Medals** inside Team and Individual events.
    2.  **Total Active Members** contributing points.

### 3.4 Province Rankings
*   **Formula**: Cumulative points of all athletes representing the province.

---

## 4. Lifecycle & Immutability Rules

1.  **Real-Time Accumulation (Active State)**:
    When a season is `active`, concluding a tournament triggers the `Ranking Engine` to update `/season_rankings` documents.
2.  **Deep-Freeze Rule (Completed/Archived State)**:
    When the season status is updated to `completed`:
    *   The `/season_rankings` are locked.
    *   Any late corrections to previous tournament results will write auditing logs but are **forbidden** from modifying the finalized seasonal standing ledger.
