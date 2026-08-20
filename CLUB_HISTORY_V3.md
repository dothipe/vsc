# VSC Platform V3 — Club History Specification
Version: 1.0 (Official Standard)

This document specifies the architecture, schemas, and processing guidelines for **Club History & Evolution** inside the Vietnam Slingshot Championship (VSC) Platform V3.

To guarantee organizational transparency and administrative auditing, all critical mutations in a club’s lifecycle (such as foundation, name modifications, leadership handovers, or merges) are permanently recorded inside an immutable ledger.

---

## 1. Club History Philosophy

*   **Non-Overwritable Records**: Major administrative updates must never simply overwrite previous properties in `/clubs` without publishing a trace log. Historical records preserve the operational truth of the VSC.
*   **Decoupled Audit Ledger**: Historical events are compiled into `/club_history_events`, making it easy to display a public "Club History & Achievement" timeline on the Web or Mobile app.
*   **Safe Backward Compatibility**: If a club is renamed or merged, older scoring entries inside `/official_score_ledger` or `/tournament_results` from previous seasons must retain the original historical naming conventions and references.

---

## 2. Club Mutation Events Registry

| Event Type | System Trigger | Description | Key Metadata Stored |
| :--- | :--- | :--- | :--- |
| `CLUB_FOUNDED` | Club Registration Approved | Club is formally established and licensed on the platform. | `foundedDate`, `managerUserId`, `province` |
| `CLUB_RENAMED` | Admin updates `clubName` | The club modifies its legal or short competitive name. | `oldName`, `newName`, `approvedBy` |
| `MANAGER_TRANSFERRED` | Leadership Handover | The club's manager role is transferred to a new user ID. | `oldManagerUserId`, `newManagerUserId` |
| `CLUB_MERGED` | Two clubs combine forces | Club A merges into Club B, transferring active roster members. | `mergedFromClubId`, `targetClubId`, `resolutionId` |
| `CLUB_DISSOLVED` | Administrative Dissolution | Club operations are halted permanently. | `dissolutionDate`, `reason`, `authorizedBy` |

---

## 3. Data Schema (`/club_history_events`)

Each lifecycle transition is recorded as a unique, immutable document.

```json
{
  "eventId": "evt_clb_hist_hanoi_002",
  "clubId": "club_hanoi",
  "timestamp": "2026-06-28T04:15:00Z",
  "eventType": "MANAGER_TRANSFERRED",
  "title": "Chuyển giao Quản lý CLB",
  "description": "Bàn giao quyền quản lý CLB Slingshot Hà Nội từ Nguyễn Văn B sang Trần Văn C.",
  "actorId": "usr_hanoi_mgr_001", // User ID who authorized or triggered the mutation
  "metadata": {
    "oldManagerUserId": "usr_hanoi_mgr_001",
    "newManagerUserId": "usr_hanoi_mgr_002",
    "effectiveDate": "2026-07-01",
    "documentRef": "doc_resolution_2026_015"
  }
}
```

---

## 4. Club-to-Athlete Roster Transfer Flow (VSC-TRANSFER)

When an athlete changes clubs, the system processes a transaction that preserves past contributions:

1.  **Deactivate Old Membership**:
    The athlete’s membership record in `/club_members` for the previous club has its `status` changed to `left` and `leftAt` populated with the current timestamp.
2.  **Create New Membership**:
    A new membership record is written to `/club_members` with `clubId` pointing to the new club, `status: 'active'`, and `joinedAt` stamped.
3.  **Audit Event Logging**:
    A `CLUB_TRANSFER` timeline event is published to `/athlete_timeline_events` (as defined in `ATHLETE_TIMELINE_V3.md`), detailing the change.
4.  **Score Integrity Safeguard**:
    Past tournament rankings inside `/tournament_results` are NOT recalculated. The athlete remains associated with the previous club for all tournaments completed prior to the transfer date.
