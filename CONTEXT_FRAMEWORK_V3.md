# VSC Platform V3 — Context Framework Specification (CONTEXT_FRAMEWORK_V3)
Version: 1.0 (Official Standard)

This document specifies the structural standards, data mappings, and visual properties of the **Context Header** inside the Vietnam Slingshot Championship (VSC) Platform V3.

The Context Header sits directly beneath the Global Navigation bar. It provides immediate visual orientation, indicating the active workspace, page titles, active status, and exit pathways.

---

## 1. Visual Taxonomy & Layout States

The Context Header adapts dynamically depending on whether the user is in the **Global Workspace** or the **Tournament Workspace**.

### 1.1 State A: Global Workspace Context Header

Used across system-wide directories. Focuses on straightforward title labels and active navigation routes.

```
┌────────────────────────────────────────────────────────┐
│ [Title: Quản lý VĐV]                                   │
│ [Subtitle: Danh sách vận động viên chính thức VSC]      │
└────────────────────────────────────────────────────────┘
```

*   **Title Element**: Clean, bold sans-serif display typography (`text-2xl font-bold text-slate-900`).
*   **Subtitle Element**: Descriptive supporting text (`text-sm text-slate-500`).
*   **Aesthetic Background**: Pure white background with a thin bottom border (`bg-white border-b border-slate-100`).

---

### 1.2 State B: Tournament Workspace Context Header

Used when a tournament context is loaded. Emphasizes operational metadata, statuses, and navigation escape hatches.

```
┌────────────────────────────────────────────────────────┐
│ [Tournament Name: Giải Vô Địch Slingshot Quốc Gia]      │
│ [Mode: Đồng đội]  [Round: 2]  [Cloud: Syncing]         │
│                                           [EXIT BUTTON]│
└────────────────────────────────────────────────────────┘
```

*   **Primary Title**: The full name of the selected tournament (`text-xl font-bold text-slate-900`).
*   **Context Metadata Chips**:
    1.  **Tournament Status**: Active status label (e.g. `Đang diễn ra`, `Đăng ký`, `Đã kết thúc`).
    2.  **Environment Mode**: Injects active Competition Environment (`Cá nhân` / `Đồng đội`).
    3.  **Active Round**: Display badge of the current round (e.g. `Vòng 1/3`).
    4.  **Network State**: Indication of local cache sync status (e.g., `Đồng bộ Cloud`, `Chế độ Offline`).
*   **Action Hub (Exit Path)**:
    *   **Exit Button**: Prominent structural button labeled **"Thoát Giải"** or **"Quay lại Trang chủ"** that closes the current context, triggers local cache cleanup, and returns the viewport to the Global Workspace.

---

## 2. Technical Binding Standards

The Context Header must read metadata dynamically from standard, non-duplicative React context states or router props:

```typescript
interface TournamentContextState {
  tournamentId: string;
  title: string;
  status: "draft" | "active" | "completed";
  currentRound: number;
  environmentMode: "individual" | "team";
  isOffline: boolean;
}
```

1.  **Reactive Updates**: State changes emitted by downstream engines (e.g. Round transition finalized inside `Mission Control`) must reflect instantly on the Context Header without a hard page refresh.
2.  **Clean Exit Execution**: Clicking the exit button must clear active context variables, flush temporary referee caches, and route back to the home page (`/`) securely.
