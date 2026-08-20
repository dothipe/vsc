# VSC PLATFORM V3 — SPRINT 02 FREEZE BASELINE

This document serves as the official, permanent, immutable baseline for the **Vietnam Slingshot Championship (VSC) Platform v3** at the end of Sprint 02 (Tournament Workspace and Rule Configuration Foundation).

---

## 📌 GENERAL INFO
- **Project Version:** `v3.2.0-baseline`
- **Freeze Date & Time:** `2026-06-24 22:00:10 (ICT / Local Workspace)`
- **Internal Revision / Git Tag:** `v3-sprint-02-tournament-workspace`
- **Build Status:** `SUCCESS` (Verified via compiler check)
- **TypeScript Status:** `SUCCESS` (0 errors, 0 warnings)
- **Linter Status:** `PASSED` (0 errors)

---

## 📂 FOLDER STRUCTURE SUMMARY
```
src/
├── App.tsx                        # Main App entry, tab routing, state hub
├── firebase.ts                    # Firebase app initialization & Firestore configurations
├── index.css                      # Tailwind imports and theme styling
├── initialData.ts                 # Default athlete lists, pre-populated structures
├── main.tsx                       # React DOM mounting
├── types.ts                       # Global interfaces, types, and enums
├── components/                    # App-wide visual components
│   ├── global/                    # Applet shell & frame boundary controllers
│   │   ├── ErrorBoundary.tsx      # Crash prevention layout
│   │   ├── Modal.tsx              # Generic highly polished dialog popups
│   │   ├── OfflineIndicator.tsx   # Local connection warning banner
│   │   └── TestingHarness.tsx     # Role emulation, latency & storage stress tools
│   ├── AthleteCard.tsx
│   ├── AthleteManagement.tsx
│   ├── AuthModal.tsx
│   ├── ControlPanel.tsx
│   ├── ExportModal.tsx
│   ├── HistoryPanel.tsx
│   ├── Leaderboard.tsx
│   ├── LiveBoard.tsx
│   ├── MainDashboard.tsx
│   ├── OnlineTournamentsPanel.tsx
│   ├── RuleEngine.tsx             # Sprint 02 Core: Complete rule editor workspace
│   ├── SettingsPanel.tsx
│   ├── StatsDashboard.tsx
│   ├── TeamLeaderboard.tsx
│   └── TournamentManagement.tsx   # Sprint 02 Core: 13-workspace layout & lifecycle
├── foundation/                    # Architectural constraints & invariants
│   ├── failure.ts                 # Standard error wrappers
│   └── permissions.ts             # Permissions specs for 14 security roles
├── layouts/                       # Global shell page frameworks
│   └── ShellLayout.tsx            # Left navigation, Top auth-header, Responsive burger
├── lib/                           # Legacy core services and state loaders
│   ├── firebaseService.ts
│   ├── storage.ts
│   └── vscService.ts
├── providers/                     # React Context State Providers
│   ├── PermissionProvider.tsx     # RBAC (Role-Based Access Control) validator hook
│   └── ToastProvider.tsx          # Real-time message alerts
├── repositories/                  # Secure Clean Architecture Repository Layer
│   ├── base.repository.ts         # Generic persistence, audit hook & offline synchronization
│   ├── audit.repository.ts        # Operations change ledger logging
│   ├── ruleTemplate.repository.ts # Reusable configurations
│   └── tournament.repository.ts   # Main tournament structure persistent service
└── utils/                         # Pure utility functions
    ├── harness.ts                 # Dev testing simulator tools
    └── qualification.ts           # Basic calculation and criteria filters
```

---

## 📊 METRICS & ARCHITECTURE COUNTS
- **Total Files in `src/`:** `40`
- **Total Components:** `20` (16 standard, 4 global)
- **Total Repositories:** `4` (Base, Audit, RuleTemplate, Tournament)
- **Total Hooks & Providers:** `2` Context Providers (`PermissionProvider`, `ToastProvider`) with corresponding custom hook handles (`usePermission()`, `useToast()`)
- **Firestore Collections:**
  - `v3_tournaments`: Active tournaments database
  - `audit_logs`: Operational changes ledger
  - `rule_templates`: Standardized rule structures
  - `athletes` / `users` / `clubs` / `seasons` / `shot_logs` (Legacy/App-level read layers)

---

## 🗺️ NAVIGATION TREE (SHELL LAYOUT)
The navigation tree is securely filtered using `PermissionProvider` Role-Based Access Control:
1. **Trang chủ** (`home` - `READ` permission) — Landing hub, general stats, active tournament overview.
2. **Bảng điều khiển** (`dashboard` - `READ` permission) — Main administrative view.
3. **Quản lý giải đấu** (`tournaments` - `READ` permission) — Entrypoint to Tournament Workspace.
4. **Bệ bắn** (`scoring` - `SCORE_LEVEL` permission) — Score entry and real-time shooting panel.
5. **Nhập điểm** (`input_scores` - `SCORE_LEVEL` permission) — Secondary simplified input view.
6. **Cá nhân** (`leaderboard` - `READ` permission) — Solo athletes liveboards.
7. **Đồng đội** (`teams` - `READ` permission) — Club/Group liveboards.
8. **Vận động viên** (`athletes` - `ATHLETE_LEVEL` permission) — Athlete profiles & check-in logs.
9. **Cài đặt** (`settings` - `TOURNAMENT_LEVEL` permission) — Competition-wide configurations.
10. **Lịch sử** (`history` - `READ` permission) — Archive logs and past events.
11. **Phòng máy** (`control_panel` - `SYSTEM_LEVEL` permission) — Developer controls, database seeding, stress harness triggers.

---

## 🛠️ TOURNAMENT MANAGEMENT WORKSPACE STRUCTURE
The `TournamentManagement` workspace implements **13 distinct configuration workspaces** accessible via a responsive sidebar, enforcing absolute separation of features:
- **Tab 1: Tổng quan (Overview)** — Bento-style performance metrics dashboard, visual lifecycle roadmap, configuration checklist.
- **Tab 2: Thông tin chung (General)** — Rich metadata form including name, season selection, organization unit, location, dates, description, custom logos, and banners.
- **Tab 3: Cấu hình quy chế (Rules)** — Direct-shot count, tie-breaker scoring limits, maximum points, and configuration rules overview.
- **Tab 4: Luật cá nhân (Individual)** — Solo shooting round configuration with customizable distances, multipliers, and points accumulation models.
- **Tab 5: Luật đồng đội (Team)** — Advanced team rule customization, matching distance config lists, and registration sizes.
- **Tab 6: Ban trọng tài (Referees)** — Asserts head referee and supports multi-assistant assignments.
- **Tab 7: Vận động viên (Athletes)** — Participant list editing, bulk presets import, and search filters.
- **Tab 8: Đoàn thi đấu (Teams)** — Provincial groups or shooting club associations.
- **Tab 9: Phân làn bãi bắn (Lanes)** — Lane capacities, assignment layouts, and lane mappings.
- **Tab 10: Lịch thi đấu (Schedule)** — Time-based itinerary schedule editor.
- **Tab 11: Cơ cấu giải thưởng (Prize)** — Reward distributions, money structures, and champion trophies documentation.
- **Tab 12: Nhà tài trợ (Sponsors)** — Tiered sponsor organization lists (Gold, Silver, Bronze) with responsive logo previews.
- **Tab 13: Nhật ký cấu hình (Logs)** — Displays full audit logs, action descriptions, timestamps, and user handles for the active tournament document.

---

## 🔒 SINGLE OWNER ARCHITECTURE MAP
Each file or module is strictly bound to a designated Single Owner to prevent logical collision:
- **`src/repositories/tournament.repository.ts`** ➔ **Single Owner of Tournament State**. No UI element or external hook is allowed to mutate tournaments directly without querying this layer.
- **`src/components/RuleEngine.tsx`** ➔ **Single Owner of Rule Structure & Validations**. Coordinates configuration criteria, maximum points, and distance configs.
- **`src/providers/PermissionProvider.tsx`** ➔ **Single Owner of Authorization**. Evaluates access permissions based on roles mapping securely.

---

### 🛡️ VERIFIED COMPLIANCE
This baseline is officially frozen. All changes going forward must be logged in a separate commit structure.
