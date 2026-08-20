# VSC Platform V3 — Core Domain Map Specification (CORE_DOMAIN_MAP_V3)
Version: 1.0 (Official Core Freeze)

This document maps the five primary sovereign domains of the **Vietnam Slingshot Championship (VSC) Platform V3**, establishing their database boundaries, key properties, relational cardinalities, and dedicated state machines.

---

## 1. Primary Sovereign Domains

The VSC platform is organized around five primary domains. Each domain has a unique ID prefix and a distinct operational boundary.

```
                  ┌────────────────────────┐
                  │     SEASON DOMAIN      │
                  └───────────┬────────────┘
                              │ 1:N
                  ┌───────────▼────────────┐
                  │   TOURNAMENT DOMAIN    │
                  └───────────┬────────────┘
                              │ 1:N
                  ┌───────────▼────────────┐
                  │    PROVINCE DOMAIN     │
                  └───────────┬────────────┘
                              │ 1:N
                  ┌───────────▼────────────┐
                  │      CLUB DOMAIN       │
                  └───────────┬────────────┘
                              │ 1:N
                  ┌───────────▼────────────┐
                  │     ATHLETE DOMAIN     │
                  └────────────────────────┘
```

---

## 2. Domain Definition Matrix

| Domain Name | ID Prefix | Primary Collection | Relational Cardinality | Mapping Machines / Lifecycles |
| :--- | :--- | :--- | :--- | :--- |
| **Season** | `season_` | `/seasons` | `1 : N` Tournaments | Season Lifecycle State Machine |
| **Tournament** | `tour_` | `/tournaments` | `1 : N` Environments | Tournament Registry / Round States |
| **Province** | `prov_` | `/provinces` | `1 : N` Clubs | Regional Representative Registry |
| **Club** | `club_` | `/clubs` | `1 : N` Athletes | Club Member Ledger / Transfers |
| **Athlete** | `ath_` | `/athletes` | `1 : 1` User (Optional) | VSC-ID / VSC-LINK Mapping |

---

## 3. Domain Structural Specifications

### 3.1 Season Domain (`season_`)
*   **Key Responsibility**: Represents annual competitive boundaries, point accruals, and absolute record books.
*   **Key Attributes**: `seasonId`, `name`, `year`, `status`, `tournamentRegistry`, `statistics`, `records`.
*   **Primary State Transitions**: `draft` ──► `registration` ──► `active` ──► `completed` ──► `archived`.
*   **Uniqueness Check**: Only one season can have status `active` at any given moment.

### 3.2 Tournament Domain (`tour_`)
*   **Key Responsibility**: Holds logistical definitions, venue details, and competition configurations for a specific event.
*   **Key Attributes**: `tournamentId`, `seasonId`, `title`, `location`, `dates`, `status`, `rounds`, `registeredEnvironments`.
*   **Sub-Collections**: `/tournament_entries`, `/tournament_results`.
*   **Primary State Transitions**: `scheduled` ──► `open_registration` ──► `live` ──► `calculating` ──► `locked`.

### 3.3 Province Domain (`prov_`)
*   **Key Responsibility**: Represents regional divisions, geography, and territorial athletic representations.
*   **Key Attributes**: `provinceId`, `provinceName`, `provinceCode`, `region` (Bắc/Trung/Nam), `status`, `statistics`, `rankings`.
*   **Sub-Collections**: `/province_competition_history`, `/province_timeline_events`.
*   **Roster Lookup (No Duplication)**: Real-time queries use index filtering on `province == provinceName` to resolve regional listings.

### 3.4 Club Domain (`club_`)
*   **Key Responsibility**: Manages physical training groups, rosters, transfers, and club standing tallies.
*   **Key Attributes**: `clubId`, `clubName`, `logo`, `province`, `managerUserId`, `foundedDate`, `status`, `statistics`.
*   **Sub-Collections**: `/club_members`, `/club_timeline_events`, `/club_history_events`.
*   **Relational Machine (VSC-TRANSFER)**: Executes roster changes by closing out old `/club_members` records with `status: 'left'` and building new `status: 'active'` records for the target club.

### 3.5 Athlete Domain (`ath_`)
*   **Key Responsibility**: The master identity file representing a physical competitor. Contains lifelong stats, timeline events, and verified user claims.
*   **Key Attributes**: `athleteId`, `vscNumber`, `fullName`, `dob`, `gender`, `province`, `currentClubId`, `status`, `userMapping`.
*   **Sub-Collections**: `/athlete_timeline_events`.
*   **Identity Sovereignty**: Invariant of season or club changes. Retains historical achievements independently of current active club affiliations.

---

## 4. Relationship & Mapping Machines

To synchronize these domains safely, VSC Platform V3 uses three specific mapping state machines.

### 4.1 VSC-ID (National Registration Machine)
On initial registration, the platform issues a sovereign `vscNumber` to an athlete (e.g., `VSC-HB-0023`). 
*   **Validation Rules**: Must be unique, formatted cleanly, and stamped with the state province abbreviation.
*   **Immutability**: Once created, the physical athlete record is immutable by the athlete themselves. Only administrative personnel can update biographical entries following identification checks.

### 4.2 VSC-LINK (Athlete-to-User Mapping)
Maps a physical `athleteId` to a client account `/users/{userId}`.
*   **Flow Steps**:
    1.  **State `unlinked`**: Profile created by tournament administrators.
    2.  **State `pending_claim`**: Client requests verification, submitting proof.
    3.  **State `verified`**: Admin stamps `userMapping.isLinked = true`, locking the account mapping.
*   **Ownership Integrity**: A user can claim at most one athlete profile. An athlete profile can have at most one verified user mapping.

### 4.3 VSC-TRANSFER (Club & Province Representation Transfer)
Ensures historic tournament score records do not break when an athlete transitions to a new training group or region.
*   **Execution Steps**:
    1.  Deactivate current active memberships in `/club_members`.
    2.  Issue a new active `/club_members` record with the new club metadata.
    3.  Stamp the transfer transaction inside the Immutable Athlete Timeline (`/athlete_timeline_events`).
    4.  All past score records inside `/tournament_results` are left untouched, preserving historic club season tallies.
