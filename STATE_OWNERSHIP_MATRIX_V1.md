# VSC Platform V3 – State Ownership Matrix
Version: 1.0 (Frozen)

## 1. Absolute Single-Owner Principle
To avoid conflicting updates, database corruption, or racing states, VSC Platform V3 implements a strict Single-Owner Principle. Every piece of database state, cache storage, or temporary layout configuration is owned exclusively by exactly one Repository or Business Engine.

All other components must interact with this state exclusively through standard read-only queries or designated mutation methods exposed by the write owner. Direct mutations on state owned by other entities are strictly prohibited.

```
┌─────────────────────────────────┐
│     Master Data & Athlete       │───► Read-Only downstream consumption
│  (Owner: Athlete Repository)   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│      Tournament Metadata        │───► Read-Only downstream consumption
│ (Owner: Tournament Repository)  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│      Official Score Ledger      │───► Read-Only downstream consumption
│ (Owner: Official Ledger Rep)   │
└─────────────────────────────────┘
```

---

## 2. Frozen Ownership Matrix

| State Object | Write Owner | Storage / Scope | Description |
| :--- | :--- | :--- | :--- |
| **Master Athlete** | `Athlete Repository` | Persistent (Firestore) | Master registration records, national registration codes, clubs, and personal metadata. |
| **Tournament** | `Tournament Repository` | Persistent (Firestore) | Rules configuration, active stage status, custom parameters, distances, and targets. |
| **Tournament Participant** | `Tournament Repository` | Persistent (Firestore) | Event roster list, check-in statuses, lane assignments, and squad ids. |
| **Assignment** | `Assignment Engine` | Persistent / Cached | Squad divisions, scheduled lane occupancy, and referee roster schedules. |
| **Temporary Live Score** | `Referee Workspace` | Transient (Local State) | Real-time unsubmitted scorecards, active lane hits prior to referee submission. |
| **Official Score Ledger** | `Official Ledger Repository` | Persistent (Firestore) | Verified, version-controlled historical scorecard entries, audit signatures, and logs. |
| **Ranking** | `Ranking Engine` | Calculated / Derived | Dynamic leaderboards, tiebreak positions, accuracy parameters, and team scores. |
| **Qualification** | `Qualification Engine` | Calculated / Derived | Computed lists of athletes exceeding criteria for professional/national classification. |
| **Official Result** | `Official Result Engine` | Persistent (Firestore) | Final tournament result sheets, historical records, and validated team rankings. |
| **Career** | `Career Engine` | Persistent (Firestore) | Cumulative national athlete points, tournament participation history, and performance trends. |
| **Statistics** | `Statistics Engine` | Cached / Compiled | Aggregated historical metrics, club accuracy, lane difficulty stats, and performance records. |
| **LiveBoard** | `Presentation Layer` | Derived (Read-Only) | Real-time visual display dashboards, stream overlays, and spectator boards. |

---

## 3. Strict Write Isolation Constraints
- **Zero-Overlap Mutation Guarantee**: Downstream calculation components (such as `Ranking Engine` or `Statistics Engine`) are purely computational. They are strictly prohibited from writing or mutating raw scorecard data.
- **Audit Verification Logging**: Whenever the `Official Ledger Repository` mutates state under a Head Referee correction, it MUST emit an immutable correction log through the `Audit Engine`.
- **Presentation Layer Separation**: Under no circumstances should any React UI view component directly modify database variables or state. All UI state changes must be routed through the dedicated repository/API layer.
