# VSC Platform V3 – Capability Matrix Specification
Version: 1.0 (Frozen)

## 1. Mapped System Capabilities
Every critical business engine action is guided by a specific, centralized capability check defined in `src/foundation/permissions.ts`.

| Capability ID | Target Functionality | Allowed Roles |
| :--- | :--- | :--- |
| `tournament.create` | Creating new tournament databases | `admin`, `system_owner` |
| `participants.manage` | Approving registration, lanes, check-in | `sub_admin`, `tournament_director`, `tournament_owner` |
| `assignment.generate` | Squad division, referee assignment | `sub_admin`, `tournament_director`, `tournament_owner` |
| `score.enter` | Submitting score cards | `referee`, `head_referee`, `tournament_director`, `tournament_owner` |
| `score.unlock` | Overriding/unlocking scoring terminals | `head_referee`, `tournament_director`, `tournament_owner` |
| `official.publish` | Publishing live board, scoreboards | `tournament_director`, `tournament_owner` |
| `official.correct` | Sổ cái Official Score Ledger edits | `head_referee`, `tournament_director`, `tournament_owner` |
| `ranking.freeze` | Freezing and submitting results to national points | `tournament_director`, `tournament_owner` |
| `audit.view` | Viewing critical ledger edits and correction logs | `referee`, `head_referee`, `sub_admin`, `tournament_director`, `tournament_owner` |
| `settings.manage` | Editing distances, layouts, targets, multipliers | `tournament_director`, `tournament_owner` |

---

## 2. Capability Resolution Flow
When calling `hasCapability(globalRole, tournamentRole, capability)`, the system applies a cascading resolution:
- If the global user has administrative bypass (`admin` or `system_owner`), permissions return `true` immediately.
- Otherwise, the tournament role is matched against the specific capabilities registered to that role.
- For co-organizers (`sub_admin`), the database holds optional `customSubAdminCaps` that grant granular administrative overrides.
