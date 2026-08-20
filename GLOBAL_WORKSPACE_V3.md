# VSC Platform V3 — Global Workspace Specification (GLOBAL_WORKSPACE_V3)
Version: 1.0 (Official Standard)

This document specifies the architecture, routing boundaries, and visual definitions of the **Global Workspace** inside the Vietnam Slingshot Championship (VSC) Platform V3.

The Global Workspace provides the environment for system-wide operations when no tournament context is selected. It maps core athletic databases, regional clubs, provincial registries, and general analytics.

---

## 1. Architectural Boundaries

1. **System-Wide Scope**:
   The Global Workspace handles cross-tournament registries and lifelong statistics. No local tournament-specific round variables or lane configurations exist in this scope.
2. **Read-Only Data Fallbacks**:
   When viewing rankings or achievements, the Global Workspace reads from pre-calculated snapshots like `/season_rankings` or `/career_snapshots`. It does not perform active recalculations of raw scorecards.
3. **Transition Trigger (Entering Context)**:
   When a user selects a tournament from the Home Page or the Tournament List, the system initializes a `Tournament Context` state, caching the chosen `tournamentId` and mounting the **Tournament Workspace**.

---

## 2. Global Workspace Layout Layout Blueprint

All screens under the Global Workspace conform strictly to the standard Presentation Layout hierarchy:

```
┌────────────────────────────────────────────────────────┐
│                      GLOBAL HEADER                     │
├────────────────────────────────────────────────────────┤
│                    GLOBAL NAVIGATION                   │
├────────────────────────────────────────────────────────┤
│             CONTEXT HEADER (Global Mode)               │
├────────────────────────────────────────────────────────┤
│                                                        │
│                      CONTENT AREA                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 3. Global Views & Screen Inventory

The Global Workspace contains seven primary system-wide panels.

### 3.1 Home Page (Sovereign Landing Portal)
The default application landing screen.
*   **Hero Banner**: Displays welcoming imagery, current weather/locale conditions, and quick-look key metrics.
*   **Live/Ongoing Tournaments**: Cards linking directly to active Tournament Workspaces.
*   **Upcoming Tournaments**: Logistical schedules of upcoming competitive championships.
*   **Completed Tournaments**: Archival cards linked to finalized seasonal records.
*   **General Statistics**: High-level platform counts (e.g. Total Athletes, Total Slingshot Hits, General Averages).

### 3.2 Tournament Directory (`/tournaments`)
*   **Purpose**: Renders the complete, historical inventory of all past, present, and scheduled tournaments.
*   **Actions**: Filter by Season, Location, Status, or competitive tier. Provides buttons to initialize or register new events.

### 3.3 Athlete Directory (`/athletes`)
*   **Purpose**: Displays the complete catalog of physical VSC registrants.
*   **Actions**: Filter by Province, Club, VSC Number, Gender, and Status (Active/Inactive). Allows profiles to be linked to user accounts.

### 3.4 Club Directory (`/clubs`)
*   **Purpose**: Lists all active training entities.
*   **Actions**: Maps club sizes, geographical counts, and current seasonal point standing lists.

### 3.5 Province Directory (`/provinces`)
*   **Purpose**: Displays regional performance standings and active organizations within the North, Central, and South zones.
*   **Actions**: Track provincial podium records and medal statistics.

### 3.6 Season Manager (`/seasons`)
*   **Purpose**: Manages annual boundaries, archives past season records, and controls the seasonal **Deep-Freeze** locking mechanism.

### 3.7 Control Panel (Admin Settings)
*   **Purpose**: System configurations, user role permissions, competition mode controls, and platform health diagnostics.
