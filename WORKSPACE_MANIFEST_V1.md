# VSC Platform V3 – Workspace Manifest Specification
Version: 1.0 (Frozen)

## 1. Centralized Registration Registry
All functional workspaces are registered in the centralized manifest (`src/foundation/workspaceManifest.ts`). 

### Schema Definition:
Each registered workspace must strictly declare:
- **`id`**: Unique string identifier.
- **`title`**: Human-readable name.
- **`description`**: Semantic subtitle describing the view.
- **`icon`**: Lucide icon component.
- **`order`**: Order of rendering in menus.
- **`parentWorkspace`**: Parent context grouping.
- **`repositoryOwner`**: Technical repository holding data (e.g. `Official Ledger Repository`).
- **`businessEngineOwner`**: Core computational engine driving the business logic (e.g. `Score Validation Engine`).
- **`workflowVisibility`**: Permitted stages of the tournament.
- **`requiredCapabilities`**: Specific actions required.
- **`allowedTournamentRoles`**: Allowed tournament roles.
- **`allowedGlobalRoles`**: Allowed global system roles.
- **`routeContextBinding`**: `"global"` or `"tournament"`.

---

## 2. Active Workspace Registrations

| Workspace ID | Title | Route Context | Repository Owner | Business Engine Owner |
| :--- | :--- | :--- | :--- | :--- |
| `home` | Trang Chủ | Global | System Repository | Platform Core |
| `tournaments` | Danh Sách Giải Đấu | Global | Tournament Repository | Platform Core |
| `athletes` | Master Data VĐV | Global | Athlete Registry | Master Data Management |
| `create_tournament` | Tạo Giải Đấu | Global | Tournament Repository | Platform Core |
| `control_panel` | Bảng Điều Khiển | Global | System Registry | Platform Core |
| `dashboard` | Tổng Quan (Overview) | Tournament | Tournament Repository | Dashboard Engine |
| `command_center` | Mission Control (Tác Chiến) | Tournament | Assignment Engine | Mission Control Core |
| `tournament_mgmt` | Quản Lý & Vận Hành | Tournament | Tournament Repository | Rules Engine |
| `input_scores` | Referee Terminal (Ghi Điểm) | Tournament | Score Validation Engine | Live Score Input Engine |
| `scoring` | Official Score Ledger | Tournament | Official Ledger Repository | Score Validation Engine |
| `leaderboard` | Bảng Cá Nhân (Ranking) | Tournament | Ranking Engine | Ranking Calculation Engine |
| `teams` | Bảng Đồng Đội | Tournament | Team Engine | Team Accumulation Engine |
| `settings` | Cấu Hình (Settings) | Tournament | Tournament Repository | Rules Engine |
| `history` | Nhật Ký (Audit Log) | Tournament | System Log Repository | Audit Engine |
