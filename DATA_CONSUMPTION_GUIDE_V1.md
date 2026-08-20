# VSC Platform V3 – Data Consumption Guide
Version: 1.0 (Frozen)

## 1. Unified Architectural Directive
The VSC Platform V3 strictly enforces the separation of data access, business computation, and UI rendering.
- **Repositories** are the sole source of truth exposing data models.
- **Business Engines** are the sole owners of calculations, metrics, rankings, and structural state transformations.
- **Presentation Layer Components** are strictly read-only views. They are forbidden from performing raw mathematical, ranking, or scoring calculations. They consume standardized, pre-processed outputs.

```
[Repository] ──(Raw Data)──► [Business Engine] ──(Normalized Data)──► [React UI Component]
```

---

## 2. Standardized Consumption Flows

### 1. Mission Control (Tác Chiến)
- **Data Exposed**: Participant assignments (lane, squad, status), active heat metadata from the `Tournament Repository`.
- **Calculations Bound**: Squad rotation scheduling, vacancy matching from the `Assignment Engine`.
- **UI Consumes**: Standardized array of lane cards. No local logic for determining who shoots next is allowed.

### 2. Leaderboard / Ranking (Bảng Cá Nhân)
- **Data Exposed**: Athlete information, committed score ledger cards from `Official Ledger Repository`.
- **Calculations Bound**: `RankingEngine.calculate()` applying specific tie-break rules, precision averages, and group counts.
- **UI Consumes**: Ordered, ranked list containing final rankings, ties flagged, and structured distance scores.

### 3. LiveBoard (Spectator Presentation)
- **Data Exposed**: real-time active scoring records, top 10 standings.
- **Calculations Bound**: Live leaderboard standings and immediate hit-indicator calculations from `Ranking Engine`.
- **UI Consumes**: Auto-scrolling, high-contrast, pure-presentation stream layout.

### 4. Referee Terminal (Ghi Điểm)
- **Data Exposed**: Assigned athlete metadata, active distance configuration from `Tournament Repository`.
- **Calculations Bound**: `ScoreValidationEngine.validate()` verifying correct range constraints and target formats.
- **UI Consumes**: Hit buttons and interactive target selectors. The terminal strictly passes inputs to the validator before issuing state submission.

### 5. Official Score Ledger
- **Data Exposed**: Every version-controlled score event, modification logs from the `Official Ledger Repository`.
- **Calculations Bound**: Audit signatures and version diffs from `Score Validation Engine`.
- **UI Consumes**: Tabular chronologically-nested sheets of score revisions.

### 6. Tournament Dashboard (Tổng Quan)
- **Data Exposed**: Total participant counts, event duration, active status.
- **Calculations Bound**: General statistics, completion percentages, average score metrics from `Statistics Engine`.
- **UI Consumes**: General KPI grids, completion progress bars, and high-level charts.

### 7. Athlete Career Profile
- **Data Exposed**: National registration metadata, historical participation records.
- **Calculations Bound**: Dynamic career scores, national classification ranking, and achievement metrics from `Career Engine`.
- **UI Consumes**: Career timeline visual grids, career status badges, and club ranking standings.

### 8. Statistics (Phân Tích Số Liệu)
- **Data Exposed**: Historical scores across all rounds, lanes, clubs, and weather/targets.
- **Calculations Bound**: Lane difficulty scores, target accuracy distribution, club performance metrics from `Statistics Engine`.
- **UI Consumes**: Rich charts, trend overlays, and performance heatmaps.

### 9. Public Profile (Hồ Sơ Công Khai)
- **Data Exposed**: Verified public metrics of individual athletes.
- **Calculations Bound**: Verified records, peak velocity, average knockdown accuracy from `Career Engine`.
- **UI Consumes**: Clean bio layout and verified historical milestones.
