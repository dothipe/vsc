# VSC Platform V3 — Complete Sample Workflow

This document illustrates the entire lifecycle of a competitive VSC season and tournament under the V3 database guidelines, modeling a concrete workflow.

---

## 1. PHASE 1: SEASON AND ORGANIZATIONAL INITIALIZATION
* **Action**: Director creates Season 2026.
  * **Document Path**: `/seasons/season_2026`
  * **Status**: `active`
* **Action**: 3 official Slingshot Clubs register in the system.
  * **Document Paths**:
    * `/clubs/36SC` (Thanh Hoa Slingshot Club)
    * `/clubs/HanoiSC` (Hanoi Slingshot Club)
    * `/clubs/SaigonSC` (Saigon Slingshot Club)
* **Action**: 20 Athletes are registered, and 8 link their physical profiles to application users.
  * **Document Paths**: `/athletes/athlete_1` to `/athletes/athlete_20`
  * **Verification**: Athletes 1 to 8 have `linkedUserId` set to their active user profile `uid` (e.g. `user_1` to `user_8`), and their `claimStatus` is set to `verified`.

---

## 2. PHASE 2: TOURNAMENT SETUP AND REGISTRATION
* **Action**: Tournament "VSC National Championship 2026" is established by the Director.
  * **Document Path**: `/tournaments/tournament_2026_national`
  * **Workflow Stage**: `registration`
  * **Status**: `active`
* **Action**: Athletes sign up.
  * **Check-In**: 20 competitors register, their profiles are snapshotted and assigned bib numbers (e.g., `BIB-101` to `BIB-120`).
  * **Referee Assignment**: 5 qualified referees (`referee_1` to `referee_5`) are assigned to supervise lanes 1 through 10.

---

## 3. PHASE 3: LANE ASSIGNMENTS AND SHOOTING FLOW
* **Action**: Lanes are assigned for the Qualification Round (10m Distance).
  * **Lane Assignments**:
    * Athlete 1 is assigned to Lane 1, Heat 1, supervised by Referee 1.
    * Athlete 2 is assigned to Lane 2, Heat 1, supervised by Referee 1.
    * ...

---

## 4. PHASE 4: OFFICIAL SCORING & IMMUTABLE LEDGER ENTRIES
* **Action**: Active Shooting & Live Scoring.
  * Referee 1 records shots on Lane 1 directly into the official, immutable score ledger.
  * **Score Ledger Document**: `/official_score_ledger/score_ath1_qual_10m`
  * **Shots**: `[10, 10, 10, 0, 10, 10, 10, 10, 10, 10]` (Accuracy: 90%, Total Score: 90)

---

## 5. PHASE 5: TIE-BREAKS (SOLO / RESOLO RULE INTEGRATION)
* **Rule Enforcement**: Solo and ReSolo are OPTIONAL tie-break mechanisms owned ONLY by their parent round. They are recorded inside the parent Round's ledger entry:
  * **Tie Scenario**: Athlete 1 and Athlete 2 both finish with 90 points.
  * **Solo Round**: Referee initiates a Solo tie-break.
    * Athlete 1 shoots: `10`
    * Athlete 2 shoots: `10`
    * The tie remains!
  * **ReSolo Round**: Referee initiates a ReSolo tie-break.
    * Athlete 1 shoots: `10`
    * Athlete 2 shoots: `0` (Miss!)
  * **Ledger Update**:
    * Athlete 1's score ledger document `/official_score_ledger/score_ath1_qual_10m` is updated:
      * `soloShots`: `[10]`
      * `reSoloShots`: `[10]`
    * Athlete 2's score ledger document `/official_score_ledger/score_ath2_qual_10m` is updated:
      * `soloShots`: `[10]`
      * `reSoloShots`: `[0]`
  * **Outcome**: Athlete 1 wins the tie-break and advances!

---

## 6. PHASE 6: ASYNCHRONOUS CALCULATIONS & SNAPSHOTS
Once the Round is fully finalized (including any Solo/ReSolo ties):
1. **Ranking Engine**:
   * Reads all official scores from `/official_score_ledger` for `tournament_2026_national` -> `qualification` -> `10m`.
   * Calculates standings and writes a single standing summary document to `/ranking_snapshots`.
2. **Statistics Engine**:
   * Analyzes hit percentages and streaks.
   * Updates individual athletic statistic snapshots at `/statistics_snapshots/{athleteId}`.
3. **Career Engine**:
   * Computes points and seasonal performance.
   * Updates `/career_snapshots/{athleteId}`.
4. **Liveboard Engine**:
   * Emits updated leaderboard lists to `/liveboard_snapshots/tournament_2026_national`.

---

## 7. PHASE 7: ACHIEVEMENTS & AUDITING
* **Hall of Fame**: At season end, the National Champion (Athlete 1 from Thanh Hoa Slingshot Club) is awarded a permanent legend status plaque:
  * **Document Path**: `/hall_of_fame/hof_2026_champ`
* **Compliance Audit Logs**: All state-changing operations (e.g. claim overrides, registration approvals, score certifications) are permanently logged into `/audit_logs` as unmodifiable trace evidence.
