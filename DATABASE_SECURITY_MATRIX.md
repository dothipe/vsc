# VSC Platform V3 — Database Security Matrix

This security matrix maps out the authorization expectations, access roles, and validation rules required to secure the VSC Platform V3 Firestore database.

---

## 1. ACCESS CONTROL AND READ/WRITE POLICIES

| #  | Collection | Read Scope | Write Scope | Immutability & Validation Guards |
|----|------------|------------|-------------|----------------------------------|
| 1  | `system_settings` | **Public** (All) | **Super Admin** Only | Read-only to public. Non-admins cannot update any fields. |
| 2  | `users` | **Authenticated Users** (Self-read only) | **Self** (Owner) or **Super Admin** | `uid` matches current `request.auth.uid`. Role changes require admin. |
| 3  | `athletes` | **Public** (All) | **Director** or **Verified Owner** | Claim verification states are protected and cannot be self-claimed. |
| 4  | `clubs` | **Public** (All) | **Super Admin** or **Club Manager**| Logo and banner URLs must be valid image strings. |
| 5  | `club_members` | **Public** (All) | **Club Manager** Only | Membership dates must be verified server timestamps. |
| 6  | `club_join_requests`| **Club Manager & Self**| **Requesting User** or **Manager**| Status changes must follow: `pending -> approved / rejected`. |
| 7  | `seasons` | **Public** (All) | **Director** Only | No modification once season is completed. |
| 8  | `rule_templates` | **Public** (All) | **Director** Only | Pre-defined, frozen once saved. |
| 9  | `tournaments` | **Public** (All) | **Director** Only | Workflow stages can only progress forward. |
| 10 | `official_score_ledger`| **Public** (All) | **Assigned Referee** Only | Scores must be written with server timestamps and are unmodifiable. |
| 11 | `ranking_snapshots` | **Public** (All) | **Ranking Engine** Only | Calculated standing results are read-only. |
| 12 | `career_snapshots` | **Public** (All) | **Career Engine** Only | History logs are read-only. |
| 13 | `statistics_snapshots`| **Public** (All) | **Statistics Engine** Only | Accuracy metrics are calculated asynchronously, read-only. |
| 14 | `liveboard_snapshots` | **Public** (All) | **Liveboard Engine** Only | Dynamic, temporary scoreboard caches are read-only. |
| 15 | `hall_of_fame` | **Public** (All) | **Director** Only | Achievement plaques are read-only. |
| 16 | `audit_logs` | **Super Admin** Only| **System Logger** Only (Write-Once)| Write-once only. No updates or deletions allowed. |
| 17 | `event_logs` | **Super Admin** Only| **System Event Bus** Only (Write-Once)| Write-once only. Read-only for admins. |
| 18 | `repository_metadata` | **Internal** | **Internal Repository Drivers** | Synchronization logs are read-only to external queries. |
| 19 | `system_metadata` | **Internal** | **System Services** Only | Internal performance metrics. |

---

## 2. PRIVILEGE ESCALATION SAFEGUARDS

1. **Role Protection**: The `users.role` field is strictly guarded. On user registration, users cannot self-assign a role higher than `guest` or `athlete`. Promotion to `referee`, `director`, or `super_admin` can only be performed by a Super Admin using a master console.
2. **Account Claim Safety**: Users cannot link or claim an official Athlete profile unless they pass a claim verification workflow. Linking an athlete requires writing a verified `linkedUserId` to `/athletes/{athleteId}` which is synchronized with `users.linkedAthleteId`.
3. **No Blanket Writing**: No user (including athletes) can edit score records. Scoring records in `official_score_ledger` can only be submitted by referees who are assigned to that specific tournament lane.
