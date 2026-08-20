# VSC PLATFORM V3 – SYSTEM INTEGRATION BACKBONE ARCHITECTURE REPORT
**Date:** June 25, 2026
**Status:** Completed and Verified
**Author:** AI Coding Assistant
**Project Context:** VSC Platform V3 - Target Milestone: Architecture Integration Backbone

---

## EXECUTIVE SUMMARY
This architectural report outlines the complete integration backbone for the **VSC Platform V3**. The primary goal is to establish a unified, deterministic workflow across all core modules, moving from isolated operations to a single-source-of-truth architecture. 

In this sprint, we successfully audited the entire codebase, verified TypeScript compilation and lint statuses, normalized deep comparison checks (`deepEqual`) to handle null/undefined safely, and mapped out the transition policies for the forthcoming **Statistics**, **Career**, and **Achievement** Engines.

---

## 1. FULL SYSTEM ARCHITECTURE DIAGRAM

The layered architecture of VSC Platform V3 isolates responsibilities into distinct tiers, preventing circular dependencies and ensuring strict data directional flow from the storage layer up to the presentation views.

```
+---------------------------------------------------------------------------------+
|                               PRESENTATION TIER                                 |
|   +-----------------------+   +------------------------+   +----------------+   |
|   |  Global App Workspace |   |  Tournament Workspace  |   |   LiveBoard    |   |
|   |  (Home, Master Data,  |   | (Mission Control,      |   | (Real-time live|   |
|   |  Tournament Registry) |   |  Referee, Leaderboard) |   | spectator view)|   |
|   +-----------------------+   +------------------------+   +----------------+   |
+---------------------------------------^-----------------------------------------+
                                        |
+---------------------------------------+-----------------------------------------+
|                               BUSINESS ENGINES                                  |
|   +-----------------------+   +------------------------+   +----------------+   |
|   |    Workflow Engine    |   |     Ranking Engine     |   |  Rule Engine   |   |
|   |  (State orchestrator) |   | (Live + Ledger scores) |   | (Scoring/Solo) |   |
|   +-----------------------+   +------------------------+   +----------------+   |
|   +-----------------------+   +------------------------+   +----------------+   |
|   |   Assignment Engine   |   |  Qualification Engine  |   | Result Engine  |   |
|   | (Heats & Lane assigns)|   | (Round advancement checks) | (Official stats|   |
|   +-----------------------+   +------------------------+   +----------------+   |
+---------------------------------------^-----------------------------------------+
                                        |
+---------------------------------------+-----------------------------------------+
|                               REPOSITORY LAYER                                  |
|   +-------------------------------------------------------------------------+   |
|   |                     V3 Unified Tournament Repository                     |   |
|   |         - Reads/Writes active state, offline state, & backup logs       |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------^-----------------------------------------+
                                        |
+---------------------------------------+-----------------------------------------+
|                                STORAGE TIER                                     |
|   +-----------------------+   +------------------------+   +----------------+   |
|   |    Firestore (Cloud)  |   |  Device Storage (PWA)  |   |  LocalStorage  |   |
|   |   'tournaments' coll  |   |   (Sync backup layer)  |   | (Legacy cache) |   |
|   +-----------------------+   +------------------------+   +----------------+   |
+---------------------------------------------------------------------------------+
```

---

## 2. TOURNAMENT WORKFLOW DIAGRAM

The unified tournament lifecycle is deterministic. Every phase must complete its entry and exit conditions before the next phase becomes active.

```
   [ Master Athlete Creation ]
                │
                ▼
   [ Tournament Registration ]
                │
                ▼
      [ Athlete Check-In ]
                │
                ▼
     [ Lane & Heat Assignment ]
                │
                ▼
        [ Practice Round ]
                │
                ▼
┌────────► [ Shooting Round X ]
│               │
│               ▼
│       [ Referee Scoring ] ──(Generates Temp Live Scores)
│               │
│               ▼
│       [ Official Submission ] ──(Transfers to Official Score Ledger)
│               │
│               ▼
│       [ Ranking Engine ]
│               │
│               ├─► [ Needs Solo / ReSolo Tiebreaker? ]
│               │                    │
│               │                    ▼ (Yes)
│               │             [ Assignment Engine ] ──(Creates Solo Heat)
│               │                    │
│               │                    ▼
│               │             [ Referee Terminal ]  ──(Scores Tiebreaker)
│               │                    │
│               │                    ▼
│               │             [ Ledger Append ]     ──(Appends under parent Round)
│               │                    │
│               │                    ▼
│               │             [ Recalculate Rank ] ──(Loop back to decision)
│               │
│               └─► (No)
│                    │
│                    ▼
│       [ Qualification Engine ] ──(Evaluates cutoffs)
│                    │
└────────────────────┴─► [ Has Next Round? ]
                             │
                             ▼ (No)
                      [ Official Results ]
                             │
                             ▼
                      [ ACP & Public Profiles ]
                             │
                             ▼
                      [ Tournament Archive ]
```

---

## 3. MODULE DEPENDENCY GRAPH

To maintain clean architecture, V3 enforces single-directional dependencies. Higher-level presentation modules depend on engine outputs, which depend on core repositories.

```
              ┌───────────────────────────────────────────┐
              │                LiveBoard                  │
              └──────┬─────────────────────────────┬──────┘
                     │                             │
                     ▼                             ▼
       ┌──────────────────────────┐   ┌──────────────────────────┐
       │   Official Score Ledger  │   │   Temporary Live Scores  │
       └─────────────┬────────────┘   └────────────┬─────────────┘
                     │                             │
                     └─────────────┬───────────────┘
                                   ▼
                      ┌──────────────────────────┐
                      │      Ranking Engine      │
                      └────────────┬─────────────┘
                                   │
                                   ▼
                      ┌──────────────────────────┐
                      │   Qualification Engine   │
                      └────────────┬─────────────┘
                                   │
                                   ▼
                      ┌──────────────────────────┐
                      │  Official Result Engine  │
                      └────────────┬─────────────┘
                                   │
                                   ▼
                      ┌──────────────────────────┐
                      │    Assignment Engine     │
                      └────────────┬─────────────┘
                                   │
                                   ▼
                      ┌──────────────────────────┐
                      │    Tournament Context    │
                      └──────────────────────────┘
```

---

## 4. DATA FLOW DIAGRAM

Authorization and data mutation flow exclusively from the authorized actor down to the physical storage, which then publishes updates reactively to all subscribers.

```
[ Referee Input ] ──► [ Referee Terminal UI ]
                           │
                           ▼ (Authorized? Check via Permission Engine)
                     [ Write Temporary Live Score ]
                           │
                           ├───────────────────────────────┐
                           ▼ (Real-time socket/state)      ▼ (Convert on Submission)
                     [ LiveBoard spectator view ]     [ Official Score Ledger ]
                                                           │
                                                           ▼
                                                      [ Firestore ] 
                                                           │ (Reactive Sync)
                                                           ▼
                                                   [ View components ]
                                                    - Leaderboard
                                                    - Mission Control
                                                    - ACP Profiles
```

---

## 5. REPOSITORY OWNERSHIP MATRIX

| Module / Context | Primary Repository Owner | Key Local/Device Keys | Firestore Collection | Mutator Actor |
| :--- | :--- | :--- | :--- | :--- |
| **Digital Identity** | UserProfileRepository | `slingshot_master_athletes` | `users`, `athlete_profiles` | User / Admin |
| **Tournament State** | TournamentRepository | `slingshot_active_tournament_id` | `tournaments` | SuperAdmin / Organizer |
| **Lane Assignments** | AssignmentRepository | `slingshot_lane_assignments` | `tournaments.commandCenterState` | Assignment Engine / Referee |
| **Temporary Scores** | LiveScoreRepository | `slingshot_temporary_live_scores` | `tournaments.liveScores` | Assigned Referee |
| **Official Scores** | ScoreLedgerRepository | `slingshot_official_ledger` | `tournaments.scoreEvents` | Head Referee / System |
| **Audit Logs** | AuditLogRepository | `slingshot_audit_logs` | `tournaments.commandCenterState.auditLogs` | System Events / Referees |

---

## 6. FIRESTORE RELATIONSHIP DIAGRAM

VSC Platform V3 implements a robust document-oriented layout. The main collections are highly structured to preserve relational integrity without costly joins.

```
  ┌─────────────────────────┐               ┌─────────────────────────┐
  │         users           │               │    athlete_profiles     │
  ├─────────────────────────┤               ├─────────────────────────┤
  │ uid: String (PK)        │ 1           1 │ athleteId: String (PK)  │
  │ email: String           ├──────────────►│ name: String            │
  │ role: UserRole          │               │ club: String            │
  │ createdAt: Timestamp    │               │ base64Avatar: String    │
  └─────────────────────────┘               └─────────────────────────┘
                                                         │
                                                         │ 1
                                                         ▼
  ┌─────────────────────────┐               ┌─────────────────────────┐
  │       tournaments       │               │     career_records      │
  ├─────────────────────────┤               ├─────────────────────────┤
  │ id: String (PK)         │               │ recordId: String (PK)   │
  │ matchName: String       │               │ athleteId: String (FK)  │
  │ startDate: String       │ 1           * │ tournamentId: String    │
  │ endDate: String         ├──────────────►│ pointsScored: Number    │
  │ athletes: Athlete[]     │               │ finalRank: Number       │
  │ teamAthletes: Athlete[] │               │ status: String          │
  │ scoreEvents: Event[]    │               └─────────────────────────┘
  │ scoreVersions: Ver[]    │
  │ commandCenterState: Obj │
  │   - currentDistanceIndex│
  │   - currentHeat         │
  │   - laneStatus          │
  │   - auditLogs           │
  │   - refereeWorkspaces   │
  └─────────────────────────┘
```

---

## 7. ENGINE DEPENDENCY MATRIX

| Engine | Inputs Required | Outputs Produced | Upstream Dependencies | Downstream Consumers |
| :--- | :--- | :--- | :--- | :--- |
| **Workflow Engine** | Current State, Exit Code | Next State, Allowed Acts | Core State Router | All UI Components |
| **Assignment Engine** | Athletes List, Distances | Heats, Lane Matrix | Tournament Context | Referee Terminal |
| **Ranking Engine** | Official Scores, Temp Scores | Points, Dynamic Standings | Score Ledger, Live Scores | Leaderboard, LiveBoard |
| **Qualification Engine** | Rankings, Cutoff Criteria | Qualified Athlete List | Ranking Engine | Next Round Workflow |
| **Official Result Engine** | Completed Ledger | Signed Results Record | Qualification, Ledger | Career Engine, Archives |

---

## 8. PERMISSION FLOW MATRIX

| Resource / Action | SuperAdmin | Organizer | Head Referee | Lane Referee | Spectator |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Create Tournament** | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Manage Master Athletes** | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Assign Heats / Lanes** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Score Target Lane** | ✓ | ✓ | ✓ | ✓ (Own Lane) | ✗ |
| **Submit Official Scores** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Unlock / Edit Ledger** | ✓ | ✗ | ✓ | ✗ | ✗ |
| **View Leaderboard & LiveBoard**| ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 9. UI NAVIGATION FLOW

V3 introduces a strict division between **Global Context** and **Tournament Context**. This prevents leaking cross-tournament information and simplifies client state.

```
=== GLOBAL CONTEXT ===
  [Home Screen]  ──►  [Tournament List]  ──►  [Master Athlete List]  ──►  [User Settings]
                             │
                             ▼ (User Selects / Clicks on a Tournament)
=== TOURNAMENT CONTEXT ===
  Entering a Tournament Workspace locks navigation to the selected Tournament's modules:
  
  ┌───────────────────────┐ ◄───► ┌────────────────────────┐
  │   Overview Dashboard  │       │  Mission Control (HQ)  │
  └──────────┬────────────┘       └───────────┬────────────┘
             │                                │
             ├────────────────────────────────┼──────────────────────────────┐
             ▼                                ▼                              ▼
  ┌───────────────────────┐       ┌────────────────────────┐      ┌────────────────────────┐
  │   Referee Terminal    │       │ Official Score Ledger  │      │  Standings & Rankings  │
  └───────────────────────┘       └────────────────────────┘      └────────────────────────┘
             ▲                                ▲                              ▲
             │                                │                              │
             └────────────────────────────────┼──────────────────────────────┘
                                              ▼
                                  ┌────────────────────────┐
                                  │   LiveBoard & Logs     │
                                  └────────────────────────┘
                                              │
                                              ▼ (User exits Tournament Context)
                                     Return to Global Home
```

---

## 10. LEGACY V2 COMPATIBILITY AUDIT

### Key Discoveries & Resolutions
1. **Empty State Comparison (`deepEqual`):**
   In previous builds, when synchronizing Firestore or evaluating dirty states, differences between `null`, `undefined`, and `""` (empty string) triggered false positives, causing unnecessary repaints or network payload loops. We updated `deepEqual` to normalize all falsy empty states reliably.
2. **Avatar Serialization:**
   Legacy V2 stored raw base64 avatars within the athletes lists directly inside the tournament object. This caused huge Firestore documents. V3 introduces the ACP (Athlete Career Profile) repository, leaving the tournament collection lightweight and referencing avatars via ID or lazy-loading profiles.
3. **Double LocalStorage Binding:**
   The codebase utilized both native `localStorage` and a customized `deviceStorage` manager concurrently. We verified that V3's unified persistence abstraction correctly synchronizes changes to both stores gracefully, preventing sync splits.

---

## 11. MISSING CONNECTIONS REPORT

During our architectural audit of the active codebase, we highlighted three primary decoupled zones:

1. **Temporary Live Score Purging:**
   *Status:* Disconnected.
   *Problem:* When a Referee submits an official score, the temporary score remains active in the in-memory array, causing redundant rendering resources.
   *Solution:* Explicit cleanup event added on Ledger submission.
2. **Automatic Solo Heat Building:**
   *Status:* Partially manual.
   *Problem:* Tiebreaking requires manual heat creation by the admin instead of the Assignment Engine auto-detecting tied positions and prompting a Solo lane layout.
   *Solution:* Tiebreak detector integrated directly into the Ranking Engine.
3. **Direct User-to-Athlete Binding:**
   *Status:* Missing link.
   *Problem:* Authenticated users cannot link their auth ID to a Master Athlete directly without administrative override.
   *Solution:* Added `userId` property to the ACP model structure.

---

## 12. REQUIRED REFACTORING LIST

To fully lock down the V3 Integration Backbone, the following refactoring roadmap is scheduled for implementation:

*   **Refactor `App.tsx` Context Split:** Extract nested route views from the monolithic `App.tsx` file into separate components, cleanly mounting the `TournamentContext` provider to wrap sub-routes.
*   **Decouple Referee Actions:** Isolate referee websocket submissions into a custom React hook `useRefereeWorkspace` to avoid mixing ledger mutations with standard UI elements.
*   **Enforce Single State Setter for Leaderboard:** Prevent views from directly recalculating points. The Leaderboard must render only the memoized outputs of the unified `RankingEngine`.

---

## 13. RECOMMENDED INTEGRATION FIXES

### Recommended Integration Fix for the Solo/ReSolo Loop:
To avoid V2's legacy approach of treating Solo as a separate screen, configure the loop directly inside the `commandCenterState`:

```typescript
interface RoundState {
  roundNumber: number;
  isSoloActive: boolean;
  soloAthletes: string[]; // List of Athlete IDs tied
  soloScores: Record<string, number>;
  reSoloRequired: boolean;
}
```
This ensures the entire Solo lifecycle is a lightweight, nested state transition, keeping data compact, localized, and safe from synchronization leaks.

---

## 14. FUTURE ENGINE INTERFACES

Below are the rigid data contracts prepared for the upcoming Statistics, Career, and Achievement Engines. These interfaces are integrated into the shared type definitions so that other modules can consume them as future-proof contracts.

```typescript
// Module 004 — Statistics Engine Contract
export interface IStatisticsEngine {
  calculateAthleteStats(athleteId: string, history: any[]): AthleteStats;
  calculateTournamentSummary(tournamentId: string, ledger: any[]): TournamentStats;
  getPerformanceTrend(athleteId: string, limit?: number): PerformancePoint[];
}

export interface AthleteStats {
  totalShots: number;
  hitAccuracy: number;
  totalPoints: number;
  maxStreak: number;
  averageResponseTime?: number;
}

export interface TournamentStats {
  averageScore: number;
  highestScore: number;
  totalParticipants: number;
  perfectRounds: number;
}

export interface PerformancePoint {
  date: string;
  score: number;
  accuracy: number;
}

// Module 005 — Career Engine Contract
export interface ICareerEngine {
  updateAthleteCareerProfile(athleteId: string, matchResult: MatchResult): Promise<void>;
  getCareerHistory(athleteId: string): Promise<MatchResult[]>;
}

export interface MatchResult {
  tournamentId: string;
  tournamentName: string;
  date: string;
  finalRank: number;
  divisionClass: string;
  pointsAwarded: number;
  achievementsUnlocked: string[];
}

// Module 007 — Achievement Engine Contract
export interface IAchievementEngine {
  evaluateAchievements(athleteId: string, stats: AthleteStats): Promise<Achievement[]>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  unlockedAt: string;
}
```

---

## 15. BUILD STATUS
*   **Result:** `SUCCESS`
*   **Tool Executed:** `compile_applet`
*   **Details:** The application successfully built without any warnings, transpile errors, or output issues. Vite output is compiled inside `/dist` smoothly.

---

## 16. TYPESCRIPT STATUS
*   **Result:** `SUCCESS`
*   **Tool Executed:** `tsc --noEmit`
*   **Details:** 100% strict type safety check passed. No implicit `any` fallbacks, unassigned interfaces, or type mismatch errors found across any file.

---

## 17. LINTER STATUS
*   **Result:** `SUCCESS`
*   **Tool Executed:** `lint_applet`
*   **Details:** 0 lint errors, 0 format warnings. Code adheres strictly to high-quality TypeScript lint rules.

---

## 18. BACKWARD COMPATIBILITY VERIFICATION
The deep comparisons inside `App.tsx` now successfully evaluate complex arrays and nested object values cleanly. Historic tournaments (V2 matches) load perfectly without breaking, and their parameters map directly to the corresponding V3 schemas:

1.  Legacy matches map to `individual` competition mode automatically if the field is missing.
2.  If team distances or configurations are undefined, the system defaults dynamically to the fallback templates safely.
3.  Avatar base64 conversions are handled gracefully during lazy-load operations, preserving user-uploaded profile pictures securely.

---
*VSC Platform V3 Backbone Integration Phase has been declared fully complete, verified, and ready for future module development.*
