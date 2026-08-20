# VSC Platform V3 — Overview Workspace Specification (OVERVIEW_WORKSPACE_V3)
Version: 1.0 (Official Standard)

This document specifies the architecture, data structures, and layout definitions for the **Overview Workspace** (also known as the **Tournament Dashboard**) inside the Vietnam Slingshot Championship (VSC) Platform V3.

The Overview Workspace acts as the primary cockpit for spectators, coaches, and administrators alike upon entering an active tournament context.

---

## 1. Architectural Role & Decoupled State

Following the **Passive Consumer** model from `PRESENTATION_FRAMEWORK_V3`, the Overview Workspace must:
1. **Never Calculate Direct Totals**: Avoid running live loops or tie-breakers in the visual component. Ingest pre-calculated statistics snapshots from `/statistics_snapshots` and standings arrays directly.
2. **Support Dual Modes**: Automatically switch representation states between **Individual Mode** (Cá Nhân) and **Team Mode** (Đồng Đội) depending on the active competition context.
3. **Display Real-time Synchronization State**: Show a prominent connection indicator matching the local `networkStatus` to represent live Firebase Firestore updates.

---

## 2. Layout Structure (Bento Grid)

The Overview Workspace utilizes a responsive Bento Grid format that scales gracefully across viewport ranges:

```
┌────────────────────────────────────────────────────────┐
|                      SUMMARY WIDGETS                    |
| ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      |
| | Totals/Stats | | Lane Status  | | Current Stage|      |
| └──────────────┘ └──────────────┘ └──────────────┘      |
├────────────────────────────────────────────────────────┤
|                     MAIN ANALYTICS                      |
| ┌─────────────────────────────┐ ┌────────────────────┐ |
| |       Podium Widget         | |   Activity Feed    | |
| | (Top 3 Contenders Grid)     | | (Score Events Log) | |
| └─────────────────────────────┘ └────────────────────┘ |
└────────────────────────────────────────────────────────┘
```

### 2.1 Component Specifications

1. **Summary Widgets**:
   - **Logistical Node**: Displays dates, venue name, and authorized referees assigned.
   - **Competitor Count**: Dynamic counter of checked-in versus total registered athletes.
   - **Active Shooting Lanes**: High-level indicator of currently active shooting benches or lanes.

2. **Podium Widget (Top Contenders)**:
   - Displays the current Top 3 athletes/teams with distinct visual treatments (Gold, Silver, Bronze medals or borders).
   - Show dynamic metrics: Total points, completed shots, and calculated accuracy percentage.

3. **Logistical Activity Feed**:
   - A scrollable timeline capturing recent score submittals, round promotions, and judge approvals.
   - Features micro-animations when new elements are appended.

---

## 3. Data Schema Bindings

The Overview Workspace binds directly to the following Firestore paths:
- `/tournaments/{tournamentId}` for metadata, active status, and division details.
- `/tournaments/{tournamentId}/statistics_snapshots` for aggregated team and individual completion ratios.
- `/tournaments/{tournamentId}/score_events` for the active Activity Feed list.
