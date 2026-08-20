# DATABASE CLEANUP PLAN (VSC PLATFORM V3)

This plan documents the audit of legacy and current Firestore collections, defining which structures are frozen for the V3 production ecosystem, which require migration, and which can be safely decommissioned to preserve storage quota and database integrity.

---

## 1. CATEGORIZATION MATRIX

### 1.1 STILL USED (V3 CORE SCHEMAS - FROZEN)
These collections are fully compliant with the V3 Domain Architecture, and form the data-access foundations for the dynamic widgets and permission boundaries.

| Collection Name | Write Owner | Data Model Scope | Sync Frequency |
| :--- | :--- | :--- | :--- |
| `tournaments` | Workflow Engine | Active match configuration, heats schema, lanes state, and CommandCenterState. | Real-time (onSnapshot) |
| `athletes` | Registry / Admin | National master registry, birth provinces, birth years, and permanent ACP ranks. | Real-time & Cached |
| `clubs` | Registry / Admin | Slingshot Club entries, code mappings, and geographical locations. | Real-time & Cached |
| `seasons` | System Admin | Calendar year limits, active ACP season markers, and point weights. | On-Demand |
| `users` | Identity Engine | Central authentication, globally active roles, and linking metadata. | On-demand (Auth Hook) |
| `referee_assignments` | Workflow Engine | Active referee-to-lane maps, validating specific scoring constraints. | Real-time |
| `tournament_entries` | Workflow Engine | Participant lists registered under a specific tournament ID. | Real-time |
| `shot_logs` | EventBus | Pure append-only log of every individual shot (10s, 9s, 8s, 0s). | Real-time (Append Only) |
| `tournament_results` | Results Engine | Staged ranking calculations, individual and accumulated team achievements. | Calculated on Stage change |
| `rankings` | Ranking Engine | National leaderboard scores compiled over a whole season. | On-demand / Batched |
| `audit_logs` | System Admin | System administration events, bulk imports, data resets. | Append-Only |
| `vsc_audit_trail` | EventBus (V3) | Global domain event stream preserving raw events for event sourcing. | Real-time |

---

## 2. MIGRATION REQUIRED
These collections contain legacy data models from V2 that must be migrated to the V3 decoupled schema format.

### 2.1 Collection: `tournaments` (Legacy Entries)
*   **Issue**: Legacy documents under `tournaments` lack the unified `commandCenterState`, `refereeWorkspaces`, or `competitionMode` attributes.
*   **Migration Plan**:
    1.  Read each legacy tournament document.
    2.  Inject default `competitionMode: "individual"`.
    3.  Convert the static raw `scores` matrix into the unified `scoreEvents` collection array structure.
    4.  Initialize a default `commandCenterState` with an idle workflow state (`workflowStage: "qualification"`).

### 2.2 Collection: `athletes` (Legacy Profiles)
*   **Issue**: Lack of permanent national IDs, emergency contact metadata, and validated ACP standings.
*   **Migration Plan**:
    1.  Map unassigned athletes with sequential VSC IDs (e.g. `VSC-2026-0001`).
    2.  Sanitize names to title case, strip invalid spaces, and seed default club pointers if empty.

---

## 3. SAFE TO REMOVE (DECOMMISSION LIST)
These collections represent legacy V2 presentation concepts or redundant caching mechanisms that have been replaced by the V3 dynamic engine.

### 3.1 Collection: `hall_of_fame`
*   **Reason**: Static halls are replaced by the `OfficialResultEngine` and `RankingEngine` querying the `rankings` and `tournament_results` live collections.
*   **Action**: Export static historical entries to a static JSON registry in `/src/initialData.ts` and drop the collection.

### 3.2 Collection: `lanes`
*   **Reason**: Direct layout tables are now calculated dynamically inside the `AssignmentEngine` and stored within the `CommandCenterState` to prevent concurrency collisons.
*   **Action**: Safely drop the `lanes` collection once all tournaments are active in V3.

---

## 4. EXECUTION TIMELINE

1.  **Phase 1 (Audit Complete)**: Document schema delta & generate migration mappings. (CURRENT SPRINT)
2.  **Phase 2 (Shadow Write)**: Maintain dual-writing inside BaseRepository during high-load tournaments.
3.  **Phase 3 (Cutover & Decommission)**: Drop legacy `hall_of_fame` and `lanes` collections.
