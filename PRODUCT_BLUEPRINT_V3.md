# VSC Platform V3 – Product Blueprint & UX Specification
Version: 1.0 (Frozen)

## 1. Global Product Map

The VSC Platform V3 consists of two major structural navigation layers: **Global Context** (system-wide workspaces) and **Tournament Context** (workspaces bound to a specific active tournament). Dynamic routing guarantees that when a tournament is loaded, the context shifts automatically.

```
GLOBAL APP CONTEXT
├── 🏠 Trang Chủ (Home Portal)
├── 📅 Danh Sách Giải Đấu (Tournament Directory)
├── 👥 Master Data VĐV (Athlete Registry)
│    ├── Master Athletes (Danh sách VĐV Quốc gia)
│    ├── Master Clubs (Câu lạc bộ đối tác)
│    └── Master Referees (Danh sách Trọng tài Tổng cục)
├── ➕ Tạo Giải Đấu (Tournament Provisioner)
└── ⚙️ Bảng Điều Khiển (Control Panel / Persona Emulator)

TOURNAMENT WORKSPACE CONTEXT (Active Tournament Bound)
├── 📈 Tổng Quan (Overview Dashboard)
│    ├── Sơ đồ bệ bắn (Lane allocation overview)
│    └── Biểu đồ phân bổ điểm (Score distribution chart)
├── ⚙️ Quản Lý & Vận Hành (Tournament Management)
│    ├── Phê duyệt đăng ký (Registration approval)
│    ├── Điểm danh & Cấp BIB (Check-in & Bib assignment)
│    └── Phân lô bệ bắn (Lanes & Target Assignment)
├── 🎮 Mission Control (Tác Chiến Trực Tiếp)
│    ├── Điều phối lượt bắn (Heat dispatcher)
│    └── Khởi chạy luồng chấm điểm (Scoring flow launcher)
├── 📱 Referee Terminal (Ghi Điểm Trọng Tài)
│    ├── Nhập điểm ván đấu chính (Normal Scores entry)
│    ├── Ghi nhận Solo Tie-breaker (Solo Shoot-offs)
│    └── Ghi nhận ReSolo Tie-breaker (ReSolo Shoot-offs)
├── 📖 Official Score Ledger (Sổ Cái Chấm Điểm)
│    ├── Nhật ký điểm số theo thời gian thực (Live updates log)
│    └── Sửa đổi điểm số / Chấm phúc khảo (Audited Score Corrections)
├── 🏆 Bảng Cá Nhân (Individual Rankings / LiveBoard)
│    ├── Phân khu chuyên nghiệp (Professional classification)
│    └── Phân khu phong trào (Amateur classification)
├── 👥 Bảng Đồng Đội (Team Standings)
│    └── Câu lạc bộ tích lũy (Accumulative Club trophies)
├── 🛠️ Cấu Hình Giải Đấu (Tournament Settings)
│    ├── Thiết lập cự ly & Số phát bắn (Distance & Shot layout)
│    └── Tỷ lệ hệ số nhân điểm (Distance multipliers)
└── 📜 Nhật Ký Hệ Thống (Audit Log Trail)
     └── Append-only log of referee manipulations
```

### 1.1 Global Screen Specifications

#### 1. 🏠 Trang Chủ (Home Portal)
*   **Purpose**: Central dashboard introducing VSC Platform, displaying active seasons, live news, and direct quick-start shortcuts.
*   **Entry Point**: Default route on app load (`/`).
*   **Child Screens**: None.
*   **Toolbar**: Quick search bar, Global role badge, and Auth session trigger button.
*   **Permissions**: Public / Guest (Read-Only), Admin (Edit news / season markers).
*   **Workflow Destination**: Redirection to *Tournament Directory* or *Control Panel*.

#### 2. 📅 Danh Sách Giải Đấu (Tournament Directory)
*   **Purpose**: Browse and join tournaments across the country.
*   **Entry Point**: Navigation Bar -> "Danh Sách Giải Đấu".
*   **Child Screens**: Tournament Public landing pages.
*   **Toolbar**: Filters by Season, Location, Status (Draft, Live, Completed).
*   **Permissions**: Public / Guest (Read-Only), Admin/Tournament Creator (Manage statuses).
*   **Workflow Destination**: Click active tournament -> Initialize Tournament Context workspace.

#### 3. 👥 Master Data VĐV (Athlete Registry)
*   **Purpose**: Professional database containing official national records, club memberships, and career historical stats.
*   **Entry Point**: Navigation Bar -> "Master Data VĐV".
*   **Child Screens**: Athlete Profile cards, Club Detail views.
*   **Toolbar**: Search by BIB/Name/Club, Excel Import/Export triggers, Filter by Club.
*   **Permissions**: Public (View stats), Admin (Add/Edit athlete metadata, Import sheets).
*   **Workflow Destination**: Synchronizes raw values with dynamic tournament registration forms.

#### 4. ➕ Tạo Giải Đấu (Tournament Provisioner)
*   **Purpose**: Create a clean tournament document in the repository with rule templates.
*   **Entry Point**: Navigation Bar -> "Tạo Giải Đấu".
*   **Child Screens**: Template selector modal.
*   **Toolbar**: Quick back to directory.
*   **Permissions**: Admin / System Owner only.
*   **Workflow Destination**: On successful creation, transitions directly to *Tournament Settings* of the new tournament.

#### 5. ⚙️ Bảng Điều Khiển (Control Panel / Persona Emulator)
*   **Purpose**: Persona emulation hub, allowing developers and administrators to quickly switch identities to test permission gates.
*   **Entry Point**: Navigation Bar -> "Bảng Điều Khiển".
*   **Child Screens**: Firebase credentials connection manager.
*   **Toolbar**: User profile stats.
*   **Permissions**: Registered Users (Edit profile info), Administrators (Toggle role emulators).
*   **Workflow Destination**: Dynamic re-loading of the navigation bar based on active roles.

---

## 2. Tournament Workspace Map

Once a tournament is loaded (`activeHistoryId` is truthy), the global navigation bar is swapped for the **Tournament Workspace**.

### 2.1 Workspace Specifications

#### 1. 📈 Tổng Quan (Overview Dashboard)
*   **Purpose**: Complete telemetry overview of the active tournament.
*   **Displayed Information**: Registered/Checked-in ratios, average hits, lane occupancy, target completion charts.
*   **Actions**: Refresh live statistics, print overall standings summary.
*   **Business Engine Used**: `StatisticsEngine`, `WorkflowEngine`.
*   **Repository Used**: `TournamentRepository`.
*   **Role Permissions**: Public (Read-Only).
*   **Navigation Connections**: Connects to `leaderboard` and `scoring`.

#### 2. ⚙️ Quản Lý & Vận Hành (Tournament Management)
*   **Purpose**: Intake and prepare tournament competitors.
*   **Displayed Information**: Pending registrations list, checked-in lanes grid, lane assignees.
*   **Actions**: Approve registration, check-in, auto-assign BIB numbers, print participant lists.
*   **Business Engine Used**: `AssignmentEngine`, `WorkflowEngine`.
*   **Repository Used**: `TournamentRepository`.
*   **Role Permissions**: Tournament Director, Tournament Owner, Sub-Admin.
*   **Navigation Connections**: Connects to `command_center`.

#### 3. 🎮 Mission Control (Tác Chiến Trực Tiếp)
*   **Purpose**: Manage live firing lines, rotate heats, and assign lanes to active competitors.
*   **Displayed Information**: Interactive 13-lane live map, heat sequences queue, active referee assignments per lane.
*   **Actions**: Start Heat, Complete Heat, Assign Referee to Lane, Quick-call Athlete to lane, Pause Line.
*   **Business Engine Used**: `AssignmentEngine`, `MatchEngine`.
*   **Repository Used**: `TournamentRepository`.
*   **Role Permissions**: Tournament Director, Sub-Admin, Tournament Owner.
*   **Navigation Connections**: Feeds real-time indicators directly into `input_scores` and `liveboard`.

#### 4. 📱 Referee Terminal (Ghi Điểm)
*   **Purpose**: Live mobile terminal for lane referees to submit physical target hits.
*   **Displayed Information**: Active assigned lane card, shooter photo, current shot checklist, tie-break sub-terminal trigger.
*   **Actions**: Toggle Hit/Miss, Submit Score Card, Request Head Referee Unlock, Initiate Solo/ReSolo Entry.
*   **Business Engine Used**: `ScoreValidationEngine`.
*   **Repository Used**: `TournamentRepository`, `OfficialLedgerRepository`.
*   **Role Permissions**: Assigned Referee, Head Referee, Admin.
*   **Navigation Connections**: Emits `score.submitted` to the score aggression layer.

#### 5. 📖 Official Score Ledger
*   **Purpose**: Immutable log containing verified athlete scoring records, version history, and audit signatures.
*   **Displayed Information**: Nested round sheets, edit histories, referee details, change timestamps.
*   **Actions**: Search by athlete name, audit version history, correct score card (requires reason input).
*   **Business Engine Used**: `ScoreValidationEngine`, `ScoreAggregationLayer`.
*   **Repository Used**: `OfficialLedgerRepository`, `AuditRepository`.
*   **Role Permissions**: Head Referee, Tournament Director, Tournament Owner (Correction capability); Public (Read-Only).
*   **Navigation Connections**: Directly affects `leaderboard` calculation.

#### 6. 🏆 Bảng Cá Nhân (Individual Rankings)
*   **Purpose**: Dynamic real-time competitive leaderboard applying tournament tie-breakers.
*   **Displayed Information**: Ordered rankings table, medal decorations, accuracy statistics, distance-by-distance breakdown.
*   **Actions**: Export scoreboard to Excel, print official result sheet, toggle live board fullscreen layout.
*   **Business Engine Used**: `RankingEngine`, `ScoreAggregationLayer`.
*   **Repository Used**: `OfficialLedgerRepository`.
*   **Role Permissions**: Public (Read-Only), Director (Freeze rankings).
*   **Navigation Connections**: Feeds final entries directly to the National Rank system.

#### 7. 👥 Bảng Đồng Đội (Team Standings)
*   **Purpose**: Accumulated club rankings calculated using top athlete results.
*   **Displayed Information**: Club rank cards, total accumulated points, active counting members list.
*   **Actions**: Export team results, display detailed counting member names.
*   **Business Engine Used**: `TeamEngine`, `ScoreAggregationLayer`.
*   **Repository Used**: `OfficialLedgerRepository`.
*   **Role Permissions**: Public (Read-Only).
*   **Navigation Connections**: Integrates with Master Clubs data.

#### 8. 🛠️ Cấu Hình Giải Đấu (Tournament Settings)
*   **Purpose**: Configure distances, rules, and system capabilities.
*   **Displayed Information**: Distance configs, target counts, points schema, sub-admin granular permissions.
*   **Actions**: Add Distance, Edit Multipliers, Assign Head Referee, Add Sub-Admins, Transition Tournament Phase.
*   **Business Engine Used**: `WorkflowEngine`.
*   **Repository Used**: `TournamentRepository`.
*   **Role Permissions**: Tournament Director, Tournament Owner.
*   **Navigation Connections**: Transitions tournament stage between Draft, Registration, Ready, Live, and Completed.

#### 9. 📜 Nhật Ký Hệ Thống (Audit Log Trail)
*   **Purpose**: Detailed system events ledger showing all administrator and referee operations.
*   **Displayed Information**: Logs timeline, actor email, action type, description, old-vs-new value changes.
*   **Actions**: Filter by Operator, search logs.
*   **Business Engine Used**: `AuditEngine`.
*   **Repository Used**: `AuditRepository`.
*   **Role Permissions**: Referee, Head Referee, Director, System Admin.
*   **Navigation Connections**: Feeds security events database.

---

## 3. Screen Layout Blueprint

The VSC Platform V3 uses a desktop-first fluid layout paired with a mobile-first responsive design for active scoring interfaces.

### 3.1 Global Navigation & Header Frame
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎖️ VSC PLATFORM V3                   [Search Tournaments...]     User: tuantt@vsc.vn   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🏠 Trang Chủ  |  📅 Giải Đấu  |  👥 Master VĐV  |  ➕ Tạo Giải  |  ⚙️ Bảng Điều Khiển  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│                                      ACTIVE WORKSPACE                                  │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Tournament Context Navigation Header
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎯 GIẢI VÔ ĐỊCH QUỐC GIA 2026        Stage: 🟢 LIVE             User: referee1@vsc.vn  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 📈 Overview  |  ⚙️ Mgmt  |  🎮 CommandCenter  |  📱 Referee Terminal  |  📖 Ledger      │
│ 🏆 Individual Rank   |  👥 Team Rank   |  🛠️ Settings  |  📜 Audit Logs               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Layout Specs for Key Workspaces

#### 1. 🎮 Mission Control Board
*   **Header**: Heat controls bar (Active Heat selector, Play/Pause Heat, Complete Heat button).
*   **Left Panel**: Lanes Layout (13 interactive cards containing lane ID, athlete name, BIB, club, assigned referee status, and live hit score markers).
*   **Right Sidebar**: Athletes Queue (drag-and-drop checked-in list to fill vacant lanes) and Referee assigning pool.
*   **Footer**: Status bar displaying average line score, connected devices tally, and current UTC time.

#### 2. 📱 Referee Input Terminal
*   **Header**: Athlete BIB, name, and target distance details. Quick-access help instructions for range safety.
*   **Main Canvas**: Dual columns:
    *   *Column 1*: Grid of Shots (Large clickable buttons representing individual shots e.g. Shot 1 to Shot 10. Completed shots turn green with points badges).
    *   *Column 2*: Points selector buttons (Huge touch targets: `0`, `5`, `6`, `7`, `8`, `9`, `10` or `Hit`/`Miss` switches).
*   **Quick Actions Floating Panel**: Request Correction, Call Range Officer, Unlock Solo tie-breaker.
*   **Footer**: Giant "XÁC NHẬN NỘP ĐIỂM" (Submit) button, requiring a double-tap confirmation.

#### 3. 📖 Official Score Ledger Screen
*   **Toolbar**: Search by BIB or Name, select Round, select Distance, Filter by Correction Status.
*   **Main Container**: Nested Accordions (Grouped by Round -> Distance -> Athlete).
    *   *Expanded view*: Displays full history of score versions (V1, V2, V3) with strikethrough correction indicators, editor username, timestamp, and signed reason of correction.
*   **Actions Overlay**: Trigger "Correct Score" modal for Head Referees.

---

## 4. Popup & Dialog Map

Every modal overlay is designed with clear confirmation thresholds to avoid accidental data corruption.

```
┌────────────────────────────────────────────────────────────┐
│ ⚠️ XÁC NHẬN ĐIỀU CHỈNH ĐIỂM SỐ (Score Correction)           │
├────────────────────────────────────────────────────────────┤
│ VĐV: Nguyễn Văn A (BIB: 1024) - Lượt 10m                   │
│                                                            │
│ Điểm số hiện tại:  [9] [10] [8] [7] [10]                   │
│ Điểm số điều chỉnh: [9] [10] [10] [7] [10]                 │
│                                                            │
│ Lý do hiệu chỉnh (Bắt buộc):                               │
│ [ Ghi rõ quyết định của ban trọng tài...                 ] │
│                                                            │
│ ───────────                                                │
│ [ HỦY BỎ ]                       [ ĐỒNG Ý CẬP NHẬT (Audit) ]│
└────────────────────────────────────────────────────────────┘
```

### 4.1 Dialog Registry

1.  **Create Tournament Modal**
    *   *Fields*: Match Name, Date Range, Rule Template, Creator ID.
    *   *Impact*: Creates a new active workspace.
2.  **Edit Tournament Details**
    *   *Fields*: Description, Location, Rules exceptions.
    *   *Impact*: Updates tournament metadata.
3.  **Register Athlete Profile**
    *   *Fields*: National ID, Name, Birth Province, Club code, Class (Pro/Amateur).
    *   *Impact*: Appends a new athlete to the tournament workspace participant list.
4.  **Import Athletes Sheet**
    *   *Fields*: Excel/CSV File drop zone, Column mapping selector.
    *   *Impact*: Multi-record database write.
5.  **Assign BIB & Checked-In Status**
    *   *Fields*: Assigned BIB number, Check-in verification checkbox.
    *   *Impact*: Activates the athlete for line assignment in Mission Control.
6.  **Assign Lane & Call Athlete**
    *   *Fields*: Target Lane, Athlete BIB.
    *   *Impact*: Populates the target lane on the live dispatcher dashboard.
7.  **Unlock Scoring Terminal**
    *   *Fields*: Head Referee PIN/Credentials, Reason.
    *   *Impact*: Re-opens submitted score sheets for active edit/entry.
8.  **Confirm Round Finalization**
    *   *Fields*: Verified checkpoints checklist, Chief Referee signature.
    *   *Impact*: Generates official ranking records and freezes results.

---

## 5. User Journey Map

VSC Platform V3 implements standard permission-guided user paths to keep users focused on their specific tasks.

```
GUEST JOURNEY:
Landing Page ──► Tournament List ──► View Leaderboard (Live) ──► View Team Scores

ATHLETE JOURNEY:
Auth ──► View Personal Profile ──► View BIB & Lane Assignment ──► Track Personal Standings

REFEREE JOURNEY:
Auth ──► Select Assigned Tournament ──► Launch Referee Terminal ──► Record Live Shots ──► Submit

HEAD REFEREE JOURNEY:
Auth ──► Select Tournament ──► Monitor Live Scores ──► Correct Error Cards ──► Sign Ledger

TOURNAMENT DIRECTOR JOURNEY:
Auth ──► Configure Match Settings ──► Approve Registrations ──► Run Mission Control ──► Freeze Results
```

---

## 6. Tournament Lifecycle Map

Tournament execution is sequential and deterministic. No transition can bypass stage checkpoints.

```
STAGE 1: DRAFT (Settings & Rules Config)
   │   └─ Screen: SettingsPanel
   ▼
STAGE 2: REGISTRATION (Athletes sign up / Import Excel)
   │   └─ Screen: TournamentManagement (Participants Tab)
   ▼
STAGE 3: READY (Check-in, BIB assigned, Lane layouts prepared)
   │   └─ Screen: TournamentManagement (Check-In & Assignment Tabs)
   ▼
STAGE 4: LIVE (Heats dispatched, scores recorded, live leaderboard active)
   │   ├─ Screen: TournamentCommandCenter (Mission Control)
   │   ├─ Screen: Referee Terminal (Live Scoring)
   │   └─ Screen: Official Score Ledger (Audited Updates)
   ▼
STAGE 5: COMPLETED (Audit complete, results published, career stats updated)
   │   ├─ Screen: Leaderboard (Final Results)
   │   └─ Screen: HistoryPanel (Complete Audit Trail)
   ▼
STAGE 6: ARCHIVED (Read-only historical access preserved)
```

---

## 7. Screen Connection Map

Below is the dynamic routing flow mapping how different states and roles navigate the application.

```
                      ┌───────────────┐
                      │  Home Portal  │
                      └───────┬───────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ Tournament Directory  │
                  └───────────┬───────────┘
                              │ (Select Tournament)
                              ▼
                  ┌───────────────────────┐
                  │ Overview Dashboard    │
                  └───────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
   ┌────────────────┐┌────────────────┐┌────────────────┐
   │ CommandCenter  ││Ref Input Term  ││  Score Ledger  │
   │ (Mission Ctl)  ││ (Ghi Điểm)     ││ (Audit Logs)   │
   └────────┬───────┘└────────┬───────┘└────────┬───────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │ (Update Scores)
                              ▼
                  ┌───────────────────────┐
                  │ Leaderboard / Team    │
                  └───────────┬───────────┘
                              │ (Finalize Match)
                              ▼
                  ┌───────────────────────┐
                  │   Official Results    │
                  └───────────────────────┘
```

---

## 8. Component Inventory

To maintain aesthetic consistency, a strict set of reusable UI components is implemented.

1.  **`AthleteCard`**: Custom styled tile displaying competitor avatar, national registration ID, active BIB number, club name, and current accuracy stats.
2.  **`LaneCard`**: Display unit for Mission Control. Features lane numbering, live connection indicators, assigned shooter details, active referee status, and direct-hit status bars.
3.  **`ScoreTable`**: Multi-column tabular grid displaying distance-by-distance raw hits, multipliers, calculated weighted points, and completion status.
4.  **`RankingTable`**: Sorted list displaying competitive ranks (decorated with custom gold, silver, and bronze trophy icons), total scores, and tiebreak status markers.
5.  **`MedalWidget`**: Visual badge highlighting the top 3 competitors with glowing gradient frames.
6.  **`LiveIndicator`**: Blinking crimson circular light signaling real-time scoring activities.
7.  **`AuditTimeline`**: Vertical chronological trail tracking every referee update, correction, and system stage change.

---

## 9. Legacy Screen Audit

| Legacy V2 Component | Target V3 Component | Classification | UX Improvement Description |
| :--- | :--- | :--- | :--- |
| `StatsDashboard` | `MainDashboard` | **MERGED** | Statistics are now aggregated directly by the Score Aggregation Layer and displayed cleanly on the Overview Dashboard. |
| `AthleteManagement` | `MasterDataManagement` | **MERGED** | Athlete management and master clubs data are unified into a single Master Data Registry, eliminating duplicate profile screens. |
| `OnlineTournamentsPanel` | `TournamentManagement` | **MERGED** | Online tour management has been completely integrated into the unified Tournament Settings and Workspace managers. |
| `AthleteCard` | `LaneCard` | **REMOVED** | Replaced by the modular and interactive `LaneCard` within Mission Control to prevent redundant score forms. |

---

## 10. Product Completeness Matrix

This matrix evaluates the production readiness of all integrated V3 screens and engines.

| Screen Name | Exists | UI Complete | Workflow Complete | Repository Connected | Business Engine Connected | Firestore Connected | Permission Complete | Live Update Complete | Navigation Complete | Overall % |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Home Portal** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Tournament Directory** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Master Data Registry** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Overview Dashboard** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Tournament Mgmt** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Command Center** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Referee Terminal** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Official Ledger** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Individual Ranking** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Team Scoreboard** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Tournament Settings** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Audit Logs Panel** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |
| **Control Panel Emulator** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **100%** |

---

## 11. Competition Environment Framework (Architecture Upgrade)

To ensure long-term scalability without altering stable codebases, VSC Platform V3 adopts the **Competition Environment Framework**. Under this model, the system views all present and future modes of play as pluggable, encapsulated **Competition Environments**.

```
                           TOURNAMENT
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    Individual    │  │       Team       │  │   Duel (Future)  │
│   Environment    │  │   Environment    │  │   Environment    │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               ▼
                    Unified Platform Assets
             (official_score_ledger, Snapshots, UI)
```

### 11.1 Core Tenets of the Framework

1. **Strict Context Encapsulation**: Each Environment maintains its own isolated business logic, rules execution, and state representation. 
2. **Standardized Schema Compatibility**:
   * All competition environments store detailed results inside the flat, unified `/official_score_ledger` collection to avoid indexing bloat.
   * Every record MUST identify its origin via standard descriptors: `competitionMode`, `tournamentId`, `roundId`, and `athleteId`.
3. **No Overwrite Principle**: Key generation algorithms must prevent cross-environment collisions. For example, a future Duel record would be stored as `${tournamentId}_duel_${matchId}` or similar unique string rather than `${tournamentId}_${athleteId}_${distanceId}`, ensuring no data overwriting occurs.
4. **Independent Score Ingestion**: Different environments run scoring processes independently. The Team Environment must **never** pull scores from or depend on the Individual Environment; they are decoupled workflows.
5. **Multi-Environment Aggregation (Dashboard & Statistics)**: The home and tournament overview dashboards are decoupled from any specific environment. They act as consumer clients, subscribing to independent snapshots (e.g., `Individual Rankings Snapshot`, `Team Accumulative Standings Snapshot`) to composite the final view.

### 11.2 Environment Blueprint Matrix

| Component | Individual Environment | Team Environment | Duel Environment (Future Planning) |
| :--- | :--- | :--- | :--- |
| **Primary State** | `athletes[]` (V3 Registrants) | `teamAthletes[]` (V3 Registrants) | `duelPairings[]` / `matches[]` |
| **Rule Engine** | Target hits, distance multipliers | Accumulated team hits, multipliers | Match wins/losses, handicap offsets |
| **Referee Terminal** | Individual 10-shot scorecard | Dedicated team lanes card entry | Interactive dual challenge entry |
| **Official Ledger** | Individual entries in `/official_score_ledger` | Independent entries in `/official_score_ledger` | Match-level records in `/official_score_ledger` |
| **Ranking Engine** | Solo tie-breaker sorting algorithms | Club-accumulation sorting algorithms | Elo/Rating calculations, Win/Loss ratios |
| **Statistics Engine** | Single shooter accuracy percentage | Combined club accuracy & active tallies | Head-to-head match stats, streak counters |
| **Liveboard** | Target-by-target individual scores | Team standings by accumulated points | Active duel matchups and live hit bars |
| **Hall Of Fame** | Individual Champions & National Records | Team Champions & Club trophies | Challenge Champions & Rating leaders |

### 11.3 Integration Guidelines for Future Environments (e.g., Duel)
Adding a new environment (e.g., Duel, Relay, or Knockout) in future sprints involves:
1. **No Database Modification**: Do not add new Firestore collections; represent pairings and results using the standardized flat mapping.
2. **Register a Distinct `competitionMode`**: Register the new environment name (e.g., `competitionMode = "duel"`) and use it in all published records.
3. **Plug Custom Engines**: Define custom implementations of `RankingEngine` and `StatisticsEngine` for the environment, registering them with the framework without modifying existing modules.

