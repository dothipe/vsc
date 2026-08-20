# VSC Platform V3 — Tournament Workspace Specification (TOURNAMENT_WORKSPACE_V3)
Version: 1.0 (Official Standard)

This document specifies the architecture, context parameters, and visual definitions of the **Tournament Workspace** inside the Vietnam Slingshot Championship (VSC) Platform V3.

The Tournament Workspace represents a localized sandbox. Once a user enters a tournament, all visual components, navigations, headers, and workflows align exclusively with the selected `tournamentId`.

---

## 1. Context Boundaries & Sandboxing

1. **Strict Context Isolation**:
   All database operations, queries, and state bindings are scoped strictly to the selected tournament:
   ```typescript
   const scopedScores = query(
     collection(db, "official_score_ledger"),
     where("tournamentId", "==", currentTournamentId)
   );
   ```
2. **Context Retention**:
   The active `tournamentId` is preserved in the application router or local state (e.g., `/tournament/:tournamentId/*`). Closing or exiting the tournament context triggers a cleanup hook, returning the application to the **Global Workspace**.
3. **No Mixed Operations**:
   Global actions (such as linking new athlete accounts or registering separate clubs) are strictly forbidden within this workspace.

---

## 2. Tournament Workspace Layout Blueprint

When inside the Tournament Workspace, the page hierarchy adjusts to display the active Tournament Navigation and Context Header:

```
┌────────────────────────────────────────────────────────┐
│                      GLOBAL HEADER                     │
├────────────────────────────────────────────────────────┤
│                    GLOBAL NAVIGATION                   │
├────────────────────────────────────────────────────────┤
│          CONTEXT HEADER (Tournament Mode)              │
├────────────────────────────────────────────────────────┤
│                 TOURNAMENT NAVIGATION                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│                      CONTENT AREA                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 3. Tournament Views & Screen Inventory

The Tournament Workspace contains eight internal panels.

### 3.1 Overview (Tournament Command Center)
The central dashboard of the active tournament. It replaces the general Home Page.
*   **Logistical Summary**: Dates, location details, active referee roster, and weather stats.
*   **Live Standings Snapshot**: Leaderboard showing podium contenders (Rank 1st, 2nd, 3rd) across currently running divisions.
*   **Operational Logs**: Recent scores published, round transitions, and active shooting lane updates.

### 3.2 Mission Control
*   **Purpose**: The central logistical controller of the event. Used by the Tournament Director to open/close registration, manage lanes, transition rounds (e.g. Round 1 ──► Round 2), and resolve tie-breakers.

### 3.3 Operations (Competitor Management)
*   **Purpose**: Manages competitor check-in, lane allocations, equipment safety checks, and heat listings.

### 3.4 Referee Terminal
*   **Purpose**: The fast-entry, high-contrast scoring interface used by referees stationed on the physical lanes. Works with local scoring cache arrays to allow disconnected entry before pushing scores to `/official_score_ledger`.

### 3.5 Official Score Ledger
*   **Purpose**: The immutable read-only view of all published scoring logs for the tournament, sorted chronologically.

### 3.6 Tournament Standings & Rankings
*   **Purpose**: Renders the complete, real-time leaderboard filtered by Individual, Team, Club, and Province. Shows hit tallies, total points, and shooting accuracy percentages.

### 3.7 Tournament Settings
*   **Purpose**: Edit local tournament parameters (e.g., custom lane counts, distance modes, division classifications, or referee access pins).

### 3.8 Tournament Audit Log
*   **Purpose**: A secure ledger showing all administrative actions, score corrections, or manual override histories performed during the event.
