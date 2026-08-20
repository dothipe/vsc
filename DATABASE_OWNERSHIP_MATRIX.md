# VSC Platform V3 — Database Ownership Matrix

This matrix enforces clean operational boundaries and strictly forbids duplicate ownership or conflicting cross-writes.

---

## 1. COMPONENT OWNERSHIP MATRIX

| Collection Name | Primary Producer (Write Owner) | Primary Consumer (Read Owner) | Calculation Authority (Business Engine) |
|---|---|---|---|
| `system_settings` | **Super Admin** | Everyone | None (Static Config) |
| `users` | **Auth Service / Current User** | Authenticated Users | Auth Manager |
| `athletes` | **Athlete Registry / Director** | Everyone | None (Master Data Only) |
| `clubs` | **Club Registry / Super Admin** | Everyone | None (Master Data Only) |
| `club_members` | **Club Management Engine** | Club Members / Admins | Club Membership System |
| `club_join_requests` | **Requesting Athlete** | Club Managers / Admins | Joining Workflow Engine |
| `seasons` | **Director** | Everyone | Season Manager |
| `rule_templates` | **Director** | Everyone | Template System |
| `tournaments` | **Tournament Engine / Director** | Everyone | Tournament Lifecycle Coordinator |
| `official_score_ledger`| **Referee Workspace / Scorer** | Everyone | Scoring Ledger System |
| `ranking_snapshots` | **Ranking Engine** | Everyone | Ranking Standings Engine |
| `career_snapshots` | **Career Engine** | Everyone | Career Progression Engine |
| `statistics_snapshots`| **Statistics Engine** | Everyone | Metric Aggregator Engine |
| `liveboard_snapshots` | **Liveboard Engine** | Everyone (Public Spectators) | Live Realtime Sync Engine |
| `hall_of_fame` | **Director** | Everyone | Hall of Fame Committee System |
| `audit_logs` | **Security Logger** | Super Admin | Compliance Audit Monitor (Immutable) |
| `event_logs` | **Event Broker** | Developers / Support | Event Queue Broker |
| `repository_metadata` | **Repository Drivers** | System Services | Local Storage Sync Drivers |
| `system_metadata` | **Orchestrator** | Developers / Support | System Diagnostic Engine |

---

## 2. KEY REPOSITORY RULES

1. **Write Isolation**: A Repository is the only entity permitted to invoke `setDoc`, `addDoc`, `updateDoc`, or `deleteDoc` on its assigned collection. No UI component may write directly.
2. **No Secondary Writes**: A presentation view or button click must never write to multiple repositories. If a business workflow requires multiple updates (e.g., creating a transaction and an audit log), it must be routed through a server-side Business Service or Cloud Function to ensure transactional integrity.
3. **Immutable Auditing**: Audit logs are strictly write-once (`addDoc`). No application module is ever permitted to update or delete any document within `/audit_logs`.
