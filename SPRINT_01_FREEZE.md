# VSC PLATFORM V3 — SPRINT 01 FOUNDATION BASELINE FREEZE
## SYSTEM ARCHITECTURE CHECKPOINT & IMMUTABLE BASELINE

* **Platform Name**: VSC (Vietnam Slingshot Championship) Platform V3
* **Milestone**: Sprint 01 Foundation Release (Feature-Complete)
* **Release Tag**: `v3-sprint-01-foundation`
* **Frozen Date**: 2026-06-25
* **Build Status**: PASS
* **Linter Status**: PASS
* **TypeScript Compilation**: PASS

---

## 1. PROJECT ARCHITECTURE MANIFEST

The following table represents the official inventory and state of all code resources in the **Sprint 01 Foundation** baseline.

### 1.1. Core Application & Bootstrapping
| File Path | Lines of Code | Description / Architectural Role |
| :--- | :---: | :--- |
| `/index.html` | ~20 | Main HTML entry point and viewport setup. |
| `/src/main.tsx` | 22 | React bootstrapper and application root mounting. |
| `/src/App.tsx` | 4288 | Main Application Orchestration Shell, navigation state, and sub-panel coordinator. |
| `/src/types.ts` | 354 | Standard unified models, VSC V2 schemas, and permission specifications. |
| `/src/firebase.ts` | 72 | Low-level Firebase Client SDK initialization (Auth, Firestore, Analytics). |
| `/src/initialData.ts` | 78 | Local fallback structures for offline-first initialization. |
| `/src/index.css` | ~30 | Global tailwind imports and custom typography styling definitions. |

### 1.2. Presentation Layer: Feature Panels (`src/components/`)
| File Path | Lines of Code | Description / Architectural Role |
| :--- | :---: | :--- |
| `AthleteCard.tsx` | 708 | Visual container representing an individual athlete, active rounds, and live metrics. |
| `AthleteManagement.tsx` | 2859 | Admin panel for adding, importing (XLSX), editing, and managing athlete registry. |
| `AuthModal.tsx` | 237 | Dialog managing referee/admin authentication flows and email login. |
| `ControlPanel.tsx` | 880 | Quick-access panel for tournament state modifiers and system resets. |
| `ExportModal.tsx` | 3041 | Advanced PDF/Excel generation and multi-round leaderboard exporter. |
| `HistoryPanel.tsx` | 364 | Lists local and online matches historical data. |
| `Leaderboard.tsx` | 1834 | Advanced individual leaderboard with dynamic qualification boundaries and real-time rank computation. |
| `LiveBoard.tsx` | 1683 | Observer view (TV/OBS) rendering active lanes, ranking cards, and immersive visualizer loops. |
| `MainDashboard.tsx` | 1721 | Master lobby screen displaying live tournament summaries, referee status rails, and bento metrics. |
| `OnlineTournamentsPanel.tsx` | 1391 | Interface to browse, load, delete, and synchronize online tournaments. |
| `SettingsPanel.tsx` | 2375 | Dynamic tournament settings editor (distances, multi-round limits, multipliers). |
| `StatsDashboard.tsx` | 144 | Interactive statistics visualizer with accuracy charts. |
| `TeamLeaderboard.tsx` | 1254 | Advanced group ranking dashboard based on sum of hits. |
| `VSCLogo.tsx` | 220 | SVG-based high-contrast branding vectors and sling icons. |

### 1.3. Infrastructure Layer: Services & Utilities (`src/lib/` & `src/utils/`)
| File Path | Lines of Code | Description / Architectural Role |
| :--- | :---: | :--- |
| `/src/lib/firebaseService.ts` | 359 | Unified service layer encapsulating all Firestore reads, writes, and real-time listeners. |
| `/src/lib/vscService.ts` | 1643 | Business logic engine for managing database seeds and audit trails. |
| `/src/lib/storage.ts` | 101 | Capacitor Preferences-based local storage manager for offline fallback. |
| `/src/utils/qualification.ts` | ~230 | Pure functional qualification rules, tie-breaker solvers, and score calculators. |
| `/src/utils/harness.ts` | 125 | Test harness module for simulating mock data and latency profiles. |

### 1.4. Security, Access, & Layout Infrastructure
| File Path | Lines of Code | Description / Architectural Role |
| :--- | :---: | :--- |
| `/src/foundation/failure.ts` | 52 | Centralized, non-blocking handler and reporter for Firestore read/write errors. |
| `/src/foundation/permissions.ts` | 122 | Strict role-based action permission gate matrices. |
| `/src/providers/PermissionProvider.tsx` | 90 | Context provider validating authenticated user actions against security matrix. |
| `/src/providers/ToastProvider.tsx` | 102 | Interactive high-alert toast alert stack manager. |
| `/src/layouts/ShellLayout.tsx` | 333 | Responsive master wrapper switching Side-Rail (PC) to Bottom-Nav (Mobile). |
| `/src/components/global/ErrorBoundary.tsx` | 120 | Top-level runtime fault barrier presenting "Component Recovering" fallbacks. |
| `/src/components/global/Modal.tsx` | 98 | Accessible modal presentation layer. |
| `/src/components/global/OfflineIndicator.tsx` | 74 | Live visual telemetry for connectivity state. |
| `/src/components/global/TestingHarness.tsx` | 125 | Floating sandbox diagnostic utility. |

---

## 2. PRODUCTION COMPILATION & STABILIZATION PROFILE

* **Compiler Configuration**: TypeScript v5.8 in Strict mode.
* **Build System**: Vite v6.2 with CJS Server packaging bundled via esbuild v0.25.
* **Production Build Output Profile**:
  - `dist/index.html` (4.65 kB)
  - `dist/assets/index-CtknncDH.css` (163.24 kB)
  - `dist/assets/failure-DaB5amYu.js` (0.67 kB)
  - `dist/assets/audit.repository-vXsUwfTo.js` (2.03 kB)
  - `dist/assets/index-CRx0icbI.js` (2,723.11 kB)

---

## 3. IMMUTABILITY COMPLIANCE AGREEMENT

This baseline has been compiled and is hereby **LOCKED**. Under the specifications of **VSC Platform V3 — Sprint 02 Planning**, this file serves as the historical registry. No modifications are permitted on code listed in this manifest except to address critical production issues.

**Signed & Audited by**: VSC Lead AI Architect
**Status**: APPROVED & LOCKED
