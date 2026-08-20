# VSC Platform V3 — Navigation Framework Specification (NAVIGATION_FRAMEWORK_V3)
Version: 1.0 (Official Core Freeze)

This document specifies the design rules, routing patterns, and component structures of the **Navigation Framework** inside the Vietnam Slingshot Championship (VSC) Platform V3.

To manage the architectural transition between the **Global Workspace** and the **Tournament Workspace**, the navigation system is split into two independent levels: **Global Navigation** and **Tournament Navigation**.

---

## 1. Modular Navigation Hierarchy

```
┌────────────────────────────────────────────────────────┐
│                     GLOBAL HEADER                      │
│ [VSC Logo] [Platform Name] [Env Toggle] [User Avatar] │
├────────────────────────────────────────────────────────┤
│                   GLOBAL NAVIGATION                    │
│ [Home] [Tournaments] [Athletes] [Clubs] [Provinces]    │
├────────────────────────────────────────────────────────┤
│                 TOURNAMENT NAVIGATION                  │
│ [Overview] [Mission Control] [Ref Terminal] [Rankings] │
└────────────────────────────────────────────────────────┘
```

---

## 2. Navigation Components Specification

### 2.1 Global Header (System Banner)
*   **Aesthetic**: Persistent, clean, slate-colored background (`bg-slate-900` or deep dark charcoal).
*   **Elements**:
    1.  **VSC Logo**: Core SVG insignia representing the Vietnam Slingshot Championship.
    2.  **Platform Branding**: Deep-contrast typography: `VSC Platform V3`.
    3.  **Environment Toggle**: Interactive selection switch between Individual (`Cá nhân`) and Team (`Đồng đội`) modes.
    4.  **User Identity Segment**: Profile name, role chip (e.g. `Director`, `Referee`), and an action icon to log out.

### 2.2 Global Navigation (Primary Rail)
*   **Aesthetic**: Persistent system-level routing tabs with high-contrast text and responsive hover states.
*   **Items Included**:
    *   **Trang chủ** (Home Dashboard)
    *   **Quản lý Giải đấu** (Tournament Directory)
    *   **VĐV** (Athlete Directory)
    *   **CLB** (Club Directory)
    *   **Tỉnh thành** (Province Directory)
    *   **Mùa giải** (Season Manager)
    *   **Hệ thống** (Control Panel)

### 2.3 Tournament Navigation (Context Tab Bar)
*   **Aesthetic**: Appears **only** when a Tournament Context is active (`currentTournamentId !== null`). Styled with subtle gray borders (`border-b border-slate-200`) and warm amber active highlights to differentiate it visually from Global Navigation.
*   **Items Included**:
    *   **Overview** (Tournament Dashboard)
    *   **Mission Control** (Logistics Panel)
    *   **Vận hành** (Operations Console)
    *   **Referee Terminal** (Scoring Interface)
    *   **Score Ledger** (Raw Score Logs)
    *   **Bảng xếp hạng** (Tournament Standings)
    *   **Cài đặt** (Tournament Settings)
    *   **Nhật ký** (Audit Logs)

---

## 3. Strict Navigation Isolation Rules

1. **No Merging**: Under no circumstances may Global Navigation and Tournament Navigation be compiled into a single consolidated tab bar. They must remain strictly separate in their presentation and structure.
2. **Contextual Presence**: When the system is in Global Workspace mode, all Tournament Navigation items must be entirely hidden. 
3. **No Cross-Routing**: Clicking Global Navigation tabs (such as "CLB" or "VĐV") while inside a tournament context does not automatically log the user out of the tournament. Instead, the application routing state switches back to the Global Workspace view while preserving the background tournament selection (allowing easy toggle-back options).
