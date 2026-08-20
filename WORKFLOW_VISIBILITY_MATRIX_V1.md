# VSC Platform V3 – Workflow Visibility Matrix
Version: 1.0 (Frozen)

## 1. Temporal Stage Gates
The lifecycle of any VSC Tournament strictly progresses through 6 deterministic stages:

```
[Draft] -> [Registration] -> [Ready] -> [Live] -> [Completed] -> [Archived]
```

To optimize the user experience, screens are gated based on this active status to keep clutter to a minimum.

---

## 2. Active Screen visibility Matrix

| Workspace / Screen | Draft | Registration | Ready | Live | Completed | Archived |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Overview Dashboard** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Quản Lý & Vận Hành** | Yes | Yes | Yes | No | No | No |
| **Mission Control** | No | No | Yes | Yes | No | No |
| **Referee Terminal** | No | No | No | Yes | No | No |
| **Official Score Ledger** | No | No | No | Yes | Yes | Yes |
| **Leaderboard / Ranking** | No | No | Yes | Yes | Yes | Yes |
| **Bảng Đồng Đội** | No | No | Yes | Yes | Yes | Yes |
| **Cấu Hình (Settings)** | Yes | Yes | Yes | No | No | No |
| **Nhật Ký (Audit Log)** | No | No | No | No | Yes | Yes |

### Rules for Gating:
- **Zero Drift Rule**: No workspace remains active outside its allowed status. When a stage transition is saved, the dynamic Navigation Manifest immediately filters old tabs, and the application's self-healing routing automatically relocates the active view to keep state consistent.
- **Safety Overrides**: Global Admins can access workspaces during off-schedule stages for emergency audit or manual corrective adjustments if needed.
