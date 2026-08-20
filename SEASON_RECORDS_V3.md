# VSC Platform V3 — Season Records Specification (SEASON_RECORDS_V3)
Version: 1.0 (Official Standard)

This document specifies the schema, identification rules, and tracking mechanism for **Season Records** inside the Vietnam Slingshot Championship (VSC) Platform V3.

Season Records preserve the peak historical athletic metrics established during a given competitive year, including score achievements, streak metrics, and club points records.

---

## 1. Season Records Philosophy

*   **No Manual Registry**: Records must never be declared or edited manually by administrators. They are derived directly from the official outputs of the `Official Score Ledger`, `Ranking Engine`, and `Statistics Engine`.
*   **Aesthetic Preservation**: Records are saved in the `/seasons` document and can be populated in the `Hall of Fame` to display the season's legacy.
*   **Traceable Integrity**: Each record must point to a specific `athleteId`, `tournamentId`, or `clubId`, allowing viewers to click through and view the original verified score sheet.

---

## 2. Core Record Attributes

Every Season tracks the following major milestones:

| Record ID | Type | Metric Field | Associated Entity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `PEAK_SCORE` | Individual | `score` | Athlete | Highest single-round score (e.g., 99/100). |
| `MAX_STREAK` | Individual | `highestHitStreak` | Athlete | Most consecutive hits across all distance lanes. |
| `CLUB_APEX` | Club | `totalPoints` | Club | Highest aggregated points accumulated by a club. |
| `MEDAL_DOMINANCE`| Individual | `goldCount` | Athlete | Competitor with the most Gold Medals in the season. |
| `PERFECT_ROUNDS` | Individual | `perfectRoundsCount`| Athlete | Number of 100% accurate rounds completed. |

---

## 3. Storage Schema & Integrity Contract

Records are saved inside the `records` nested map inside the `/seasons` schema:

```json
{
  "records": {
    "highestIndividualScore": {
      "value": 99,
      "athleteId": "ath_990124",
      "athleteName": "Nguyễn Văn A",
      "vscNumber": "VSC-HB-0023",
      "tournamentId": "tour_national_2026",
      "achievedAt": "2026-06-15T10:30:00Z"
    },
    "longestHitStreak": {
      "value": 28,
      "athleteId": "ath_990124",
      "athleteName": "Nguyễn Văn A",
      "vscNumber": "VSC-HB-0023",
      "tournamentId": "tour_north_2026",
      "achievedAt": "2026-04-12T14:20:00Z"
    },
    "topClubPoints": {
      "value": 450,
      "clubId": "club_hanoi",
      "clubName": "CLB Slingshot Hà Nội",
      "achievedAt": "2026-11-20T18:00:00Z"
    }
  }
}
```

---

## 4. Pipeline Trigger Logic

Record updates are fired at the end of each tournament run:

1.  **Read Active Record**: When a tournament is finalized, the `Season Engine` loads the existing `records` map for the active season.
2.  **Compare Metrics**: It queries the latest `ranking_snapshots` and `statistics_snapshots` of the participants.
3.  **Perform Atomic Update**: If a competitor’s metric exceeds the active season record, the document is updated with the new record holder details.
4.  **Emit Event**: Recalculations emit the `EVENT_SEASON_RECORD_BROKEN` event to trigger timeline entries.
