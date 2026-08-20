# VSC Platform V3 — Core Architecture Specification (CORE_ARCHITECTURE_V3)
Version: 1.0 (Official Core Freeze)

This document establishes the official and frozen architectural specification of the **Vietnam Slingshot Championship (VSC) Platform V3** Core. This system is designed as a highly decoupled, high-performance, and event-driven full-stack architecture running on a modular, asynchronous foundation.

---

## 1. Core Architectural Pillars

VSC Platform V3 separates transactional execution (scoring, refereeing, and live rankings) from consumer reading (dashboards, websites, and the Hall of Fame) by using a strictly unidirectional data flow. 

```
┌────────────────────────────────────────────────────────────────────────┐
│                          INBOUND TRANSACTIONAL                         │
├────────────────────────────────────────────────────────────────────────┤
│  [Referee Terminal] ────► [Official Score Ledger] ────► [Ranking Eng]  │
└───────────────────────────────────────────────────────────────────┬────┘
                                                                    │
                                                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           ANALYTICAL METRICS                           │
├────────────────────────────────────────────────────────────────────────┤
│  [Statistics Engine] ◄──── [Career Engine] ◄──── [Achievement Engine]  │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SOVEREIGN DOMAIN ENTITIES                       │
├────────────────────────────────────────────────────────────────────────┤
│  [Athlete Domain] ───► [Club Domain] ───► [Province Dom] ───► [Season] │
└───────────────────────────────────────────────────────────────────┬────┘
                                                                    │
                                                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        READ-SIDE MATERIALIZED VIEWS                     │
├────────────────────────────────────────────────────────────────────────┤
│   [Hall of Fame]  ◄───────────  [Dashboard]  ◄───────────  [Liveboard] │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Invariant Architectural Rules
1. **Unidirectional Execution Flow**: Data moves exclusively downstream. Upstream writes trigger downstream mutations via atomic event propagation. Loops, cross-dependencies, and reverse-writes are strictly forbidden.
2. **Sovereign Profile Separation**: The Core Domains (Athlete, Club, Province, Season, Tournament) represent master definitions that do not perform scoring, mathematical aggregations, or live state reductions inside read calls.
3. **Optimized Read Performance**: All consumer components (e.g. Hall of Fame) read from pre-compiled, flattened snapshots. No heavy table joins or multi-collection maps are permitted at the UI render layer.
4. **Passive Consumer Pattern**: All user interface components act as pure visual renderers of Firestore snapshots, removing computational overhead from the frontend application.

---

## 2. Core Modules & Engine Taxonomy

The VSC Core is separated into five transactional engines and five sovereign domains.

### 2.1 Core Engines
*   **Competition Environment**: Manages divisions, lanes, distances (10m, 12m, 15m), targets, and validation configurations.
*   **Referee Terminal**: The high-speed interface where physical judges score shots. Operates in disconnected local caches, validating inputs before synching to the cloud.
*   **Official Score Ledger**: The single source of truth for raw competition results, structured to block double-scoring or retroactive corruption.
*   **Ranking Engine**: Groups raw scoring logs, applies VSC tie-breaker standards, evaluates medal standings, and writes tournament rankings.
*   **Statistics Engine**: Calculates running averages, highest hit streaks, hit/miss percentages, and accuracy patterns across tournaments and seasons.
*   **Career Engine**: Compiles lifetime competitive entries, transfer history, and historical tournament representation logs.
*   **Achievement Engine**: Processes statistics against standard templates, awarding badges (e.g., *Streak Master*, *Perfect Round*) without modifying the athlete's primary profile.

### 2.2 Core Domains
*   **Athlete Domain**: Resolves lifelong competitor identity, claims, biography, media portfolios, and sponsorship connections.
*   **Club Domain**: Registers regional organizations, manages memberships, rosters, and historical club achievements.
*   **Province Domain**: Organizes geographic representation, coordinates clubs, and tracks provincial athletic performance.
*   **Season Domain**: Establishes annual boundaries, registries of official tournaments, annual point tallies, and seasonal records.
*   **Tournament Domain**: Holds the logistical specifications, dates, locations, rounds, and schedules of a single competitive championship event.

---

## 3. Strict State Ownership & Write Privileges

To avoid race conditions and database locks, every Firestore collection has exactly one designated Write Owner.

| Collection Path | Primary Write Owner | Secondary Listeners / Consumers |
| :--- | :--- | :--- |
| `/official_score_ledger` | Referee Terminal | Ranking Engine, Statistics Engine |
| `/ranking_snapshots` | Ranking Engine | Statistics Engine, UI Standings Views |
| `/statistics_snapshots` | Statistics Engine | Career Engine, Achievement Engine |
| `/career_snapshots` | Career Engine | Athlete Domain, Club Domain |
| `/athletes` | Admin / VSC Registry | Athlete Profile View, User Mapping |
| `/clubs` | Club Manager / Admin | Club Members, Province Registry |
| `/provinces` | Province Admin | Province Dashboard View, Season Registry |
| `/seasons` | Director / Season Engine | Season Standings, Hall of Fame |
| `/tournaments` | Director | Referee Terminal, Tournament Board |
| `/athlete_timeline_events`| Downstream Engines (via Event Bus) | Public Timeline Rendering |
| `/club_history_events` | Club Management Engine | Club History View |
| `/province_timeline_events` | Downstream Engines | Province Timeline View |

---

## 4. The Seasonal "Deep-Freeze" Mechanism

To guarantee historical authenticity, changing past data must be programmatically blocked once a season concludes.

1. **State Trigger**: When a Season's status transitions to `completed` or `archived` via the Director console, the Season Engine executes final compilations.
2. **Snapshot Consolidation**: All active standings in `/ranking_snapshots` and `/season_rankings` are bundled, validated, and saved as immutable snapshots inside `/seasons/{seasonId}.records` and `/season_rankings/{rankingId}`.
3. **Database Write Locking**:
    *   Firestore Security Rules (`firestore.rules`) enforce a strict block on any `create`, `update`, or `delete` actions against `/official_score_ledger`, `/ranking_snapshots`, or `/tournament_results` where the associated `seasonId` has status `completed` or `archived`.
    *   Example rule implementation:
        ```javascript
        match /official_score_ledger/{ledgerId} {
          allow write: if get(/databases/$(database)/documents/seasons/$(request.resource.data.seasonId)).data.status != "completed";
        }
        ```
4. **Historical Legacy Preservation**: Any retroactive dispute resolution must publish a manual correction as an audited entry to `/audit_logs` rather than rewriting historical snapshots.
