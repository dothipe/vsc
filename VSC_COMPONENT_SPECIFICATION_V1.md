# VSC COMPONENT SPECIFICATION V1.0 (COMPONENT BIBLE)
## KHUNG ĐỊNH NGHĨA LINH KIỆN TOÀN DIỆN - VSC PLATFORM V3

---

### MỞ ĐẦU
Tài liệu **VSC Component Specification V1.0 (Component Bible)** này là tiêu chuẩn kỹ thuật thiết kế giao diện tối cao của **VSC Platform V3**. Mọi thành phần giao diện (Component) được lập trình hoặc bảo trì trong tương lai **MUST** tuân thủ tuyệt đối cấu trúc, các tham số đầu vào (`Props`), trạng thái (`State`), tương thích phản hồi (`Responsive`), khả năng tiếp cận (`Accessibility`), và các ràng buộc hiệu năng (`Performance`) được định nghĩa chi tiết dưới đây.

Tài liệu này đóng vai trò là cầu nối kỹ thuật giữa Bản hiến pháp giao diện (**VSC UI Constitution V1.0**) và Đặc tả kiến trúc frontend (**Frontend Architecture Specification V1.0**), hướng tới xây dựng một hệ thống linh kiện chuẩn Enterprise, có khả năng mở rộng không giới hạn và hoạt động ổn định ở cường độ cao.

---

## MỤC LỤC LINH KIỆN (COMPONENT INDEX)

### I. NAVIGATION & LAYOUT UTILITIES
1. `AppShell` - Khung bao quát ứng dụng và định hướng luồng
2. `UnifiedNavBar` - Thanh điều hướng thông minh (Hông/Đáy)

### II. DASHBOARD & METRIC CARDS
3. `DashboardMetricCard` - Thẻ đo lường thông số thời gian thực
4. `RecentActivityTimeline` - Dòng thời gian cập nhật lịch sử nhập điểm

### III. LEADERBOARD & TABLES
5. `LeaderboardTable` - Bảng xếp hạng thông minh tích hợp ranh giới loại động
6. `RoundSelectorTabs` - Thanh chuyển đổi vòng đấu tối ưu không gian hiển thị

### IV. SCORING & REFEREE TOOLS
7. `ScoreKeyboard` - Bàn phím ảo xúc giác phục vụ trọng tài nhập điểm
8. `LaneScoringRow` - Hàng nhập điểm thông tin bệ bắn và lượt bắn

### V. ADMIN CONFIGURATION & SETTINGS
9. `RoundSettingsAccordion` - Danh sách accordion cấu hình thông số vòng đấu
10. `EliminationConfigCard` - Thẻ thiết lập thông số cơ chế loại bỏ VĐV

### VI. TV, OBS & LIVE SHOWCASES
11. `SoloBattleCard` - Thẻ hiển thị đối đầu Solo/Resolo kịch tính
12. `OBSChromaKeyCanvas` - Khung hiển thị đồ họa tối ưu bóc tách livestream

### VII. FEEDBACK, DIALOGS & TOASTS
13. `GlobalToastNotification` - Trình quản lý ngăn xếp hàng đợi thông báo nổi
14. `DoubleConfirmationDialog` - Hộp thoại xác nhận hành động nguy cấp hai bước

---

## CHI TIẾT ĐẶC TẢ TỪNG COMPONENT

### 1. COMPONENT: `AppShell`

#### 1.1. Purpose
Đóng vai trò là Master Layout Wrapper, bao bọc toàn bộ khung hiển thị ứng dụng, quản lý điều hướng đáp ứng, cấu hình vùng an toàn (Safe Area Insets) và định tuyến layout phù hợp với vai trò của người dùng (Admin, Referee, Public).

#### 1.2. Responsibility
* Thiết lập vùng biên giới hạn hiển thị tối đa (`max-w-7xl mx-auto`) để giữ bố cục cân đối trên màn hình lớn.
* Tự động chuyển đổi giữa Sidebar bên hông (trên Desktop) sang Bottom Bar dưới đáy (trên Mobile).
* Lock và quản lý luồng cuộn toàn cục (`overflow-hidden`), chỉ cho phép các khối chỉ định cuộn nội bộ.
* **FORBIDDEN**: Không chứa logic truy vấn cơ sở dữ liệu trực tiếp, không can thiệp vào cách tính điểm của Tournament Engine.

#### 1.3. Props
* `children` (*Required*: `React.ReactNode`): Nội dung các trang nghiệp vụ được lồng bên trong.
* `userRole` (*Required*: `'admin' | 'referee' | 'athlete' | 'public'`): Vai trò người dùng để hiển thị sơ đồ điều hướng phù hợp.
* `connectionState` (*Required*: `boolean`): Trạng thái kết nối Firestore trực tuyến/ngoại tuyến.

#### 1.4. State
* `isSidebarExpanded` (*Internal State*: `boolean`): Trạng thái thu gọn/mở rộng thanh sidebar trên máy tính bảng/PC.
* `activeTabId` (*Derived State*: `string`): ID của trang hiện hành lấy trực tiếp từ Router pathname.

#### 1.5. UI States
* `Idle`: Hiển thị khung vỏ ứng dụng bình thường với đầy đủ thanh điều hướng và menu hoạt động.
* `Offline`: Hiển thị dải cảnh báo mỏng "MẤT KẾT NỐI MẠNG - HOẠT ĐỘNG CHẾ ĐỘ NGOẠI TUYẾN" màu cam ở đầu màn hình.
* `Loading`: Hiển thị khung xương xám mờ (Skeleton Shell) khi đang kiểm tra phiên đăng nhập người dùng.

#### 1.6. Responsive Behavior
* **Desktop (>= 1024px)**: Hiện Sidebar cố định bên trái rộng 260px, vùng nội dung chính chiếm diện tích còn lại, padding biên `px-8`.
* **Tablet (768px - 1023px)**: Sidebar chuyển sang dạng icon hẹp (80px), tự động ẩn text nhãn, chỉ hiển thị biểu tượng đại diện.
* **Mobile (< 768px)**: Ẩn hoàn toàn Sidebar. Render Bottom Navigation Bar dưới đáy màn hình cao đúng 64px, padding an toàn đáy `pb-[safe-area-inset-bottom]`.

#### 1.7. Accessibility
* Landmark: Bọc thanh điều hướng trong thẻ `<nav role="navigation">` và nội dung chính trong `<main id="main-content" role="main">`.
* Aria: Thiết lập `aria-expanded` tương ứng cho trạng thái đóng mở của menu bên hông.
* Keyboard: Hỗ trợ nhấn phím `Tab` để di chuyển tiêu điểm tuần tự qua các nút điều hướng chính.

#### 1.8. Animation
* **Sidebar Toggle**: Chuyển đổi chiều rộng mềm mại trong 200ms (`transition-all duration-200 ease-in-out`).
* **Bottom Bar Entry**: Fade in nhẹ nhàng và slide từ dưới lên (`y: [10, 0], opacity: [0, 1]`) sử dụng spring physics.

#### 1.9. Performance
* Sử dụng `React.memo` cho phần thanh điều hướng tĩnh để tránh re-render khi nội dung của `<main>` thay đổi điểm số liên tục.

#### 1.10. Design Tokens
* Background: Canvas tối (`--color-canvas-dark`) hoặc Sáng (`--color-canvas-light`).
* Surface: Obsidian Dark (`bg-slate-900`) hoặc Pristine White (`bg-white`).
* Border: Gray Contrast (`border-slate-800` / `border-gray-200`).
* Radius: Không áp dụng bo tròn cho khung ngoài cùng, chỉ áp dụng cho menu con (`rounded-lg`).

#### 1.11. Dependencies
* Sử dụng: `UnifiedNavBar`, `GlobalToastNotification`.
* Được sử dụng bởi: Toàn bộ các trang `Page` hệ thống.

#### 1.12. Example Layout (ASCII Wireframe)
```text
+-------------------------------------------------------------------------+
| [LOGO] VSC Platform V3              [Status: Realtime Connected ●] [User] |
+-------------------------------------------------------------------------+
| ( ) Dashboard   |  Vùng hiển thị nội dung chính                         |
| ( ) Leaderboard |                                                       |
| ( ) Scoring     |  <main id="main-content">                             |
| ( ) Settings    |                                                       |
|                 |                                                       |
| [Sidebar fixed] |                                                       |
+-------------------------------------------------------------------------+
| [Mobile view: Hidden Sidebar -> Shows Bottom Navigation Bar (64px)]   |
| [  ( ) Dash    |   ( ) Leader   |   ( ) Scoring   |   ( ) Settings  ]   |
+-------------------------------------------------------------------------+
```

---

### 2. COMPONENT: `DashboardMetricCard`

#### 2.1. Purpose
Hiển thị một thông số vận hành giải đấu cốt lõi (Tổng số VĐV, Vòng thi đấu hiện hành, Tổng số điểm bắn ra, v.v.) dưới dạng thẻ Bento Grid trực quan.

#### 2.2. Responsibility
* Biểu diễn giá trị số học nổi bật kèm theo nhãn giải thích và icon đại diện tương ứng từ thư viện Lucide.
* Thay đổi màu sắc đường viền phát sáng nhẹ dựa trên tính chất cảnh báo của metric.
* **FORBIDDEN**: Tuyệt đối không tự truy vấn Snapshot Firestore, không thực hiện các phép toán chia/phần trăm phức tạp bên trong component.

#### 2.3. Props
* `title` (*Required*: `string`): Nhãn tiêu đề của thẻ đo lường (e.g., "VĐV HOẠT ĐỘNG").
* `value` (*Required*: `string | number`): Giá trị hiển thị chính.
* `iconName` (*Required*: `keyof typeof LucideIcons`): Tên icon Lucide tương ứng để hiển thị ở góc.
* `status` (*Optional*: `'normal' | 'warning' | 'alert' | 'success'`): Trạng thái để map màu viền và màu nền phụ trợ.
* `trend` (*Optional*: `{ value: string; isUpward: boolean }`): Chỉ số biểu diễn xu hướng tăng/giảm.

#### 2.4. State
* Không có trạng thái nội bộ phức tạp. Toàn bộ dữ liệu dựa vào Props truyền từ Dashboard Page xuống.

#### 2.5. UI States
* `Idle`: Hiển thị số liệu rõ ràng với phông chữ Monospace đậm, tương phản cao.
* `Loading`: Hiển thị hiệu ứng Skeleton nhấp nháy xám (`animate-pulse`) che phủ vùng số liệu.
* `Offline`: Hiển thị biểu tượng đám mây gạch chéo mờ cạnh giá trị số liệu để chỉ thị giá trị này lấy từ bộ nhớ đệm (Cache).

#### 2.6. Responsive Behavior
* Hoạt động như một ô vuông chuẩn trong lưới bento grid. Tự động thích nghi chiều rộng `w-full` của container cha.

#### 2.7. Accessibility
* ARIA: Thêm thuộc tính `role="status"` và `aria-live="polite"` để Screen Reader tự động thông báo khi giá trị số liệu được cập nhật trong thời gian thực.

#### 2.8. Animation
* **Number Bounce**: Khi giá trị `value` thay đổi, trigger hiệu ứng phóng to cực nhẹ (`scale: 1.05`) rồi hồi về mặc định trong 100ms để báo hiệu dữ liệu mới đã ghi nhận thành công.

#### 2.9. Performance
* Sử dụng `React.memo` với thuật so sánh nông (`shallow compare`) cho props để tránh re-render khi các thẻ lân cận thay đổi giá trị.

#### 2.10. Design Tokens
* Background: `bg-slate-900/50` (Dark) hoặc `bg-white` (Light).
* Typography: Số liệu `font-mono text-3xl font-extrabold`, nhãn `font-sans text-xs uppercase tracking-wider text-slate-400`.
* Border: Tùy biến theo status: Emerald cho success, Gold cho warning, Crimson cho alert.
* Radius: `rounded-xl` (12px).
* Shadow: `shadow-md hover:shadow-lg transition-shadow`.

#### 2.11. Dependencies
* Sử dụng: `StatusBadge` (Atom).
* Được sử dụng bởi: `AdminDashboardPage`, `RefereeDashboardPage`.

#### 2.12. Example Layout (ASCII Wireframe)
```text
+------------------------------------------+
|  VĐV ĐĂNG KÝ                     [Icon]  |
|  (Nhãn tiêu đề text-xs)                  |
|                                          |
|  142                                     |
|  (Mono text-3xl font-extrabold)          |
|                                          |
|  [+5 VĐV mới] (trend badge)              |
+------------------------------------------+
```

---

### 3. COMPONENT: `LeaderboardTable`

#### 3.1. Purpose
Trái tim hiển thị của VSC Platform. Biểu diễn bảng xếp hạng thành tích của toàn bộ vận động viên dưới dạng bảng dữ liệu thời gian thực, tích hợp phân tách ranh giới loại (Cutoff line) và các cột điểm vòng đấu động.

#### 3.2. Responsibility
* Hiển thị danh sách thứ hạng chính xác theo phân cấp điểm số từ cao xuống thấp.
* Vẽ đường kẻ ranh giới sinh tử (Cutoff Line) vật lý cắt ngang bảng tại vị trí xác định bởi luật loại bỏ vòng đấu.
* Xử lý ẩn/hiện và định dạng các cột điểm số dựa trên cấu hình vòng đấu thực tế đang được chọn.
* **FORBIDDEN**: Tuyệt đối không tự ý thay đổi trật tự sắp xếp của mảng dữ liệu. Việc sắp xếp thứ hạng và giải quyết đồng điểm **MUST** được xử lý tập trung tại Repository/Ranking Engine trước khi truyền mảng sạch xuống component.

#### 3.3. Props
* `athletes` (*Required*: `AthleteModel[]`): Mảng chứa danh sách vận động viên đã được xếp hạng sẵn.
* `activeRoundId` (*Required*: `string`): ID của vòng đấu hiện hành để lọc thông tin cột điểm.
* `cutoffIndex` (*Optional*: `number`): Vị trí chỉ mục (0-indexed) để render đường ranh giới loại.
* `highlightAthleteId` (*Optional*: `string`): ID của vận động viên được kích hoạt highlight (tìm kiếm hoặc cập nhật mới).

#### 3.4. State
* `sortDirection` (*Internal State*: `'asc' | 'desc'`): Trạng thái hiển thị chỉ hướng sắp xếp cột điểm (chỉ dành cho các cột phụ, cột thứ hạng tổng cố định luôn là giảm dần).

#### 3.5. UI States
* `Idle`: Hiển thị danh sách hàng lối chuẩn mực, gọn gàng, độ dày hàng dạng "Compact" (chiều cao hàng 44px).
* `Empty`: Khi không có VĐV đăng ký, hiển thị hình vẽ minh họa trống trải kèm nút "Đăng ký VĐV đầu tiên".
* `Locked`: Chế độ khóa bảng khi giải đấu kết thúc, ẩn toàn bộ biểu tượng tương tác chỉnh sửa điểm.

#### 3.6. Responsive Behavior
* **Desktop (>= 1024px)**: Hiển thị đầy đủ mọi cột chi tiết (Họ tên, Mã bệ, Điểm từng vòng, Điểm tổng, Hiệu suất bắn, Trạng thái).
* **Tablet / Mobile (< 1024px)**: Tự động ẩn bớt các cột hiệu suất bắn và chi tiết các vòng không liên quan. Cột họ tên được rút gọn hoặc cố định ghim bên trái (sticky column), cho phép cuộn ngang vùng điểm số.

#### 3.7. Accessibility
* Landmark: Bọc trong thẻ `<table role="grid">`. Các tiêu đề cột có thuộc tính `scope="col"`.
* Keyboard: Cho phép dùng phím mũi tên Lên/Xuống để duyệt di chuyển tiêu điểm qua các hàng của bảng.

#### 3.8. Animation
* **Row Reordering**: Sử dụng thuộc tính `layout` của `motion.tr` để các hàng tự động dịch chuyển trượt mượt mà khi có sự thay đổi thứ hạng trực tiếp từ Firestore.
* **Cutoff Line Slide**: Đường ranh giới loại tự động di chuyển tịnh tiến lên xuống mềm mại tương ứng với sự dịch chuyển của thứ hạng VĐV.

#### 3.9. Performance
* **Virtualized Scroll (Bắt buộc)**: Khi số lượng vận động viên vượt quá 100, component **MUST** sử dụng cơ chế ảo hóa dòng để chỉ vẽ các DOM nodes trong khung nhìn nhằm bảo toàn hiệu năng render của trình duyệt.

#### 3.10. Design Tokens
* Background Table: `bg-slate-900` với viền `border-slate-800`.
* Cutoff Line: Dải đỏ đặc biệt `border-red-500 bg-red-950/20 text-red-400 font-bold`.
* Highlight Row: Phát sáng nhẹ vàng hổ phách `--color-accent-gold` hoặc xanh lục `--color-accent-emerald`.
* Font Score: `font-mono text-sm font-semibold`.

#### 3.11. Dependencies
* Sử dụng: `AthleteAvatar` (Atom), `StatusBadge` (Atom), `CutoffDivider` (Molecule).
* Được sử dụng bởi: `LeaderboardPage`, `TVLiveboardPage`.

#### 1.12. Example Layout (ASCII Wireframe)
```text
+-------------------------------------------------------------------------+
| HẠNG | VĐV (BỆ)        | VÒNG 1 | VÒNG 2 | VÒNG 3 | TỔNG ĐIỂM | TRẠNG THÁI |
+------+-----------------+--------+--------+--------+-----------+------------+
|  1   | Nguyễn Văn A (1)|   45   |   48   |   50   |    143    | Đi tiếp    |
|  2   | Trần Thị B (3)  |   42   |   46   |   49   |    137    | Đi tiếp    |
+======#=================#========#========#========#===========#============+
| === RANH GIỚI LOẠI (TOP 2 ĐI TIẾP VÀO VÒNG CHUNG KẾT) ================= |
+======#=================#========#========#========#===========#============+
|  3   | Lê Văn C (2)    |   40   |   43   |   41   |    124    | Bị loại    |
+-------------------------------------------------------------------------+
```

---

### 4. COMPONENT: `ScoreKeyboard`

#### 4.1. Purpose
Bàn phím ảo xúc giác chuyên dụng được thiết kế tối ưu trên màn hình cảm ứng máy tính bảng để trọng tài bấm điểm cực nhanh và chính xác tại bệ bắn.

#### 4.2. Responsibility
* Cung cấp các nút bấm điểm số có kích thước lớn (>= 48px), chống bấm nhầm phím.
* Tự động vô hiệu hóa (disable) các phím điểm vượt quá giới hạn điểm tối đa (`maxRoundScore`) của vòng hiện hành.
* Kích hoạt hiệu ứng âm thanh và rung phản hồi (haptic vibration) của thiết bị trên mỗi lượt gõ điểm.
* **FORBIDDEN**: Không được tự động thực hiện hành vi cập nhật cơ sở dữ liệu khi chưa có sự xác nhận của trọng tài hoặc chưa hoàn tất lượt bắn.

#### 4.3. Props
* `onKeyPress` (*Required*: `(key: string) => void`): Callback kích hoạt khi nhấn phím số điểm (0 - 10, X, Solo, Del, Enter).
* `maxAllowedScore` (*Required*: `number`): Điểm số lớn nhất được phép nhập (e.g., 10 cho loạt bắn cung tiêu chuẩn).
* `disabled` (*Optional*: `boolean`): Trạng thái vô hiệu hóa toàn bộ bàn phím.
* `isSoundOn` (*Optional*: `boolean`): Trạng thái cấu hình âm thanh bàn phím.

#### 4.4. State
* `activeKeyPressed` (*Internal State*: `string | null`): Ghi nhận phím đang được nhấn giữ để hiển thị hiệu ứng đổi màu phím tức thời.

#### 4.5. UI States
* `Idle`: Toàn bộ bàn phím sẵn sàng, tương phản sáng nét giữa chữ phím và nền phím.
* `Disabled`: Phủ một lớp sương mờ mỏng (`opacity-50`) lên bàn phím, chặn hoàn toàn các tương tác chạm của ngón tay.
* `KeyLocked`: Một số phím cụ thể (e.g., phím 10 khi điểm tối đa vòng chỉ cấu hình tối đa là 9) được khóa riêng lẻ, đổi sang màu xám mờ và không phản hồi sự kiện chạm.

#### 4.6. Responsive Behavior
* Thiết kế tối ưu cho máy tính bảng ở chế độ ngang (Landscape). Chiếm toàn bộ nửa phải hoặc nửa dưới màn hình thiết bị.
* Nút bấm mở rộng kích thước touch target lên `w-full h-14` trên điện thoại di động để trọng tài thao tác dễ dàng bằng một ngón tay cái.

#### 4.7. Accessibility
* Aria: Mỗi nút bấm ảo **MUST** khai báo thuộc tính `role="button"` và `aria-label` tương ứng (e.g., `aria-label="Nhập điểm 9"`, `aria-label="Xóa điểm"`).
* Text Selection: Khóa hoàn toàn tính năng quét chọn văn bản mặc định của trình duyệt di động (`select-none`) trên toàn bộ bề mặt bàn phím.

#### 4.8. Animation
* **Tap Feedback**: Khi ngón tay chạm vào nút, phím co lại cực nhẹ (`scale: 0.95`) và nháy sáng nền trong 80ms để mô phỏng chân thực cảm giác nhấn phím cơ.

#### 4.9. Performance
* Sử dụng `useCallback` cho sự kiện `onKeyPress` truyền xuống. Toàn bộ bàn phím được bọc trong `React.memo` để triệt tiêu re-render khi giá trị điểm hiện tại hiển thị ở ô nháp thay đổi.

#### 4.10. Design Tokens
* Background Keyboard: `bg-slate-950` hoặc `bg-gray-100`.
* Button Normal: `bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-600`.
* Button Special (Enter/Confirm): Nền xanh lục nổi bật `bg-emerald-600 hover:bg-emerald-500 text-white`.
* Button Dangerous (Del/Reset): Nền đỏ nhạt `bg-red-950/40 text-red-400 border-red-900`.
* Corner Radius: `rounded-lg` (8px).

#### 4.11. Dependencies
* Sử dụng: `VolumeXToggle` (Atom).
* Được sử dụng bởi: `RefereeScoringPage`.

#### 4.12. Example Layout (ASCII Wireframe)
```text
+---------------------------------------------+
|   [ 7 ]   |   [ 8 ]   |   [ 9 ]   |  [DEL]  |
|   (h-14)  |   (h-14)  |   (h-14)  |  (Red)  |
+-----------+-----------+-----------+---------+
|   [ 4 ]   |   [ 5 ]   |   [ 6 ]   |  [SOLO] |
+-----------+-----------+-----------+---------+
|   [ 1 ]   |   [ 2 ]   |   [ 3 ]   | [ENTER] |
+-----------+-----------+-----------+ (Emerald|
|   [ 0 ]   |   [ X ]   |  [RESET]  |  Double |
|  (Double) |           |           |  Height)|
+---------------------------------------------+
```

---

### 5. COMPONENT: `RoundSettingsAccordion`

#### 5.1. Purpose
Giao diện danh sách quản trị viên dùng để cấu hình các thông số và thể thức thi đấu riêng biệt cho từng vòng đấu một cách trực quan, tối ưu không gian hiển thị bằng cơ chế accordion sập mở tiện lợi.

#### 5.2. Responsibility
* Sắp xếp gọn gàng cấu hình của nhiều vòng đấu, chỉ mở rộng tiêu điểm chỉnh sửa một vòng đấu tại một thời điểm.
* Hiển thị các nhãn thẻ tóm tắt luật đặc thù (Multipliers, Elimination Mode, Solo) ngay trên thanh tiêu đề của từng accordion item.
* Kích hoạt cơ chế kéo thả thay đổi thứ tự vòng đấu an toàn khi người dùng kéo tay cầm định vị.
* **FORBIDDEN**: Không ghi dữ liệu cấu hình thô trực tiếp lên Firestore mà không thông báo trạng thái "Unsaved Changes" cho người dùng hoặc bỏ qua bước kiểm tra ranh giới hệ số nhân [0.5 - 5.0].

#### 5.3. Props
* `rounds` (*Required*: `RoundConfigModel[]`): Mảng cấu hình các vòng đấu hiện tại của giải đấu.
* `onUpdateRound` (*Required*: `(roundId: string, updatedFields: Partial<RoundConfigModel>) => void`): Callback báo cáo thay đổi trường cấu hình của một vòng cụ thể.
* `onReorderRounds` (*Required*: `(newOrderedRounds: RoundConfigModel[]) => void`): Callback báo cáo danh sách vòng sau kéo thả đổi thứ tự.
* `onDeleteRound` (*Required*: `(roundId: string) => void`): Callback yêu cầu xóa một vòng đấu khỏi cấu hình.

#### 5.4. State
* `expandedRoundId` (*Internal State*: `string | null`): ID của accordion item duy nhất đang được mở ra để cấu hình chi tiết.

#### 5.5. UI States
* `Idle`: Danh sách hiển thị trật tự, các tiêu đề có màu nền phân tách rõ ràng.
* `Expanded`: Accordion item được mở rộng ra dưới dạng một thẻ biểu mẫu tinh tế chứa đầy đủ các thanh trượt và ô nhập số liệu.
* `Unsaved`: Hiển thị dải viền mỏng vàng hổ phách nhấp nháy bên trái accordion item biểu thị cấu hình vòng này đã thay đổi cục bộ và đang chờ nhấn nút "Lưu".

#### 5.6. Responsive Behavior
* **Desktop (>= 1024px)**: Thẻ biểu mẫu mở rộng chia thành lưới 2 cột khoa học giúp người quản trị thao tác nhanh bằng phím Tab của bàn phím PC.
* **Mobile (< 768px)**: Biểu mẫu thu gọn thành một cột cuộn đứng duy nhất, các thanh trượt (slider) có khoảng chạm kéo cơ học rộng để tránh trượt tay.

#### 5.7. Accessibility
* ARIA: Thân accordion sử dụng vai trò `role="region"`, tiêu đề accordion bọc trong nút `<button aria-expanded="..." aria-controls="...">`.
* Keyboard: Cho phép dùng phím mũi tên Lên/Xuống để di chuyển tiêu điểm accordion và phím `Space` hoặc `Enter` để kích hoạt đóng/mở.

#### 5.8. Animation
* **Accordion Expand/Collapse**: Sử dụng hiệu ứng chuyển động chiều cao mượt mà (`height: { duration: 0.25, ease: "easeInOut" }`) để đẩy các thẻ lân cận xuống dưới tự nhiên, không tạo ra bước nhảy layout đột ngột.

#### 5.9. Performance
* Sử dụng `React.memo` bọc các accordion item riêng lẻ để đảm bảo khi chỉnh sửa thông số vòng 1, các item của vòng 2, vòng 3 không bị re-render lại một cách vô ích.

#### 5.10. Design Tokens
* Background Header: `bg-slate-800/40 hover:bg-slate-800/80` (Dark).
* Border: High Contrast Boundary `border-slate-700/80`.
* Radius: Thẻ ngoài bọc `rounded-xl`, các nút tùy chọn `rounded-md`.
* Typography Title: `font-sans text-sm font-semibold text-slate-100`.

#### 5.11. Dependencies
* Sử dụng: `DragHandle` (Lucide-React), `EliminationConfigCard`, `SwitchToggle` (Atom).
* Được sử dụng bởi: `AdminSettingsPage`.

#### 5.12. Example Layout (ASCII Wireframe)
```text
+-------------------------------------------------------------------------+
| [:::] VÒNG 1: VÒNG LOẠI SÂN NHÀ      [Cộng dồn] [x1.5] [Top 16]    [v] |
+-------------------------------------------------------------------------+
| [:::] VÒNG 2: VÒNG ĐỐI ĐẦU KHU VỰC    [Cộng dồn] [x2.0] [Solo]     [^] |
|       -----------------------------------------------------------       |
|       * Tên hiển thị vòng: [ Vòng đối đầu khu vực              ]       |
|       * Hệ số nhân điểm : [------o------] 2.0 (Slider)                  |
|       * Thể thức tính    : (x) Tính cộng dồn   ( ) Chỉ tính vòng riêng  |
|       * Cơ chế loại      : [Kích hoạt loại trực tiếp (Switch On)  ]     |
|         - Lấy tiếp Top N : [ 8  ] vận động viên có điểm cao nhất.       |
|                                                                         |
|       [Xóa vòng đấu này (Đỏ)]                        [Hủy] [Lưu cấu hình]|
+-------------------------------------------------------------------------+
| [:::] VÒNG 3: CHUNG KẾT TOÀN QUỐC     [Điểm riêng] [x1.0]          [v] |
+-------------------------------------------------------------------------+
```

---

### 6. COMPONENT: `SoloBattleCard`

#### 6.1. Purpose
Thành phần giao diện hiển thị kịch tính, tập trung cao độ phục vụ cho các trận đấu tie-breaker phụ (Solo Shootoff hoặc Resolo đồng đội) khi có hiện tượng đồng điểm ở ranh giới sinh tử (Cutoff).

#### 6.2. Responsibility
* Biểu diễn hồ sơ hai vận động viên hoặc hai đội đang bước vào loạt đấu súng quyết định side-by-side (chia đôi màn hình 50%-50%).
* Hiển thị bảng đếm mũi bắn Solo siêu lớn (Arrow shot tallies) để khán giả và trọng tài cập nhật trực tiếp tiến trình lượt bắn phụ.
* **FORBIDDEN**: Không can thiệp hay tự quyết định ai là người chiến thắng. Trận đấu Solo chỉ kết thúc và trả quyền quyết định thắng cuộc khi Tournament Engine truyền dữ liệu kết quả phân xử về qua Props.

#### 6.3. Props
* `battleData` (*Required*: `SoloBattleModel`): Thực thể dữ liệu chứa thông tin hai đối thủ, danh sách các mũi bắn phụ hiện tại và trạng thái trận đấu.
* `isCompact` (*Optional*: `boolean`): Chế độ thu nhỏ để hiển thị như một widget nổi ở Dashboard trang chủ.

#### 6.4. State
* Không duy trì state nghiệp vụ. Đồng bộ dữ liệu 100% thời gian thực từ luồng Snapshots của giải đấu.

#### 6.5. UI States
* `Active`: Loạt bắn phụ đang diễn ra. Ô điểm của mũi bắn hiện hành nhấp nháy dải sáng chỉ thị bệ bắn đang thực hiện lượt bắn.
* `Success`: Trận đấu phân định xong thắng bại. Hiển thị chữ "THẮNG CUỘC" màu vàng kim cực lớn đè lên thẻ của VĐV đạt điểm cao hơn, thẻ VĐV thua cuộc đổi sang tông màu xám trầm.
* `TieDouble`: Trường hợp hai VĐV tiếp tục đồng điểm loạt Solo 1. Hiển thị dải băng cảnh báo đỏ rực: "ĐỒNG ĐIỂM SOLO - CHUẨN BỊ BẮN LẠI (RESOLOFF)".

#### 6.6. Responsive Behavior
* **Desktop / TV Mode**: Chia đôi màn hình đối xứng hoàn hảo dọc theo trục trung tâm. Hai VĐV ngự trị ở hai bên góc nhìn với phông chữ điểm số to bản rõ rệt từ xa 20 mét.
* **Mobile (< 768px)**: Chuyển sang bố cục xếp chồng đứng (Vertical Stack). Thẻ đối thủ 1 nằm trên, thẻ đối thủ 2 nằm dưới, ngăn cách bằng vòng tròn "VS" có hiệu ứng phát sáng nhẹ hổ phách ở giữa.

#### 6.7. Accessibility
* Screen Reader: Thao tác gõ điểm Solo của trọng tài phát đi thông báo Aria Live dạng assertive: "VĐV Nguyễn Văn A vừa đạt điểm 10 loạt Solo!".
* Contrast: Viền phân tách giữa hai VĐV có độ tương phản tối thiểu 4.5:1 để tránh nhầm lẫn điểm số giữa hai bệ bắn lân cận.

#### 6.8. Animation
* **Enter Animation**: Khi loạt Solo được kích hoạt từ cấu hình, component xuất hiện bằng hiệu ứng mở rộng từ trung tâm ra hai biên kèm theo âm thanh chime cảnh báo khẩn cấp.
* **Score Flash**: Mỗi mũi bắn ghi nhận điểm số mới trigger hiệu ứng nổ pháo hoa vàng kim mờ (`opacity: [0, 1], scale: [0.5, 1.2, 1]`) tại ô hiển thị điểm mũi bắn đó.

#### 6.9. Performance
* Sử dụng chiến lược dọn dẹp (clean up) triệt để các timer phụ trách animation nhấp nháy viền khi component unmount để tránh quá tải CPU của màn hình trình chiếu.

#### 6.10. Design Tokens
* Background Thắng cuộc: Hổ phách rực rỡ `bg-amber-950/40 border-amber-500/80`.
* Background Thua cuộc/Chờ: Xám trầm mờ `bg-slate-900/60 border-slate-800`.
* Typography Score: Monospace siêu đậm `font-mono text-5xl font-black`.
* VS Badge: Violet rực rỡ `bg-violet-600 text-white shadow-lg shadow-violet-500/40`.

#### 6.11. Dependencies
* Sử dụng: `AthleteProfileMini` (Molecule), `ShotTallyCircles` (Molecule).
* Được sử dụng bởi: `LeaderboardPage`, `TVLiveboardPage`, `AdminDashboardPage`.

#### 6.12. Example Layout (ASCII Wireframe)
```text
+-------------------------------------------------------------------------+
|                  🚨 ĐANG DIỄN RA LOẠT ĐẤU SOLO QUYẾT ĐỊNH                |
+------------------------------------+------------------------------------+
| VĐV: NGUYỄN VĂN A           (Bệ 1) | VĐV: TRẦN THỊ B             (Bệ 4) |
| HẠNG ĐỒNG ĐIỂM: 16 (RANH GIỚI LOẠI)| HẠNG ĐỒNG ĐIỂM: 16 (RANH GIỚI LOẠI)|
|                                    |                                    |
|            [  10  ]                |            [   9   ]               |
|            (Mũi 1)                 |            (Mũi 1)                 |
|                                    |                                    |
|  TỔNG SOLO: 10          [ACTIVE *] |  TỔNG SOLO: 9                      |
+------------------------------------+------------------------------------+
|               [ ĐÓNG CỬA SỔ HIỂN THỊ TRẬN ĐẤU SOLO ]                    |
+-------------------------------------------------------------------------+
```

---

### 7. COMPONENT: `OBSChromaKeyCanvas`

#### 7.1. Purpose
Khung hiển thị đồ họa điểm số chuyên dụng được tối ưu hóa cho phần mềm livestream (OBS Studio, vMix) phục vụ công tác truyền hình trực tiếp giải đấu slingshot chuyên nghiệp.

#### 7.2. Responsibility
* Cung cấp nền đơn sắc Chroma-Key (Xanh lục hoặc Xanh dương) có thể dễ dàng tách nền (keying) bằng thuật toán lọc màu của OBS.
* Trình diễn bảng điểm nằm ngang ở dải đáy màn hình (Lower Third) hoặc bảng xếp hạng dọc hẹp góc biên màn hình một cách siêu gọn gàng.
* Áp dụng dải viền bóng tối đậm bao quanh mọi ký tự chữ và số điểm để duy trì độ tương phản cực đại khi nén luồng phát Livestream.
* **FORBIDDEN**: Tuyệt đối không render bất kỳ nút bấm tương tác bằng chuột, thanh cuộn, thanh điều hướng hay menu cấu hình nào trên canvas này.

#### 7.3. Props
* `leaderboardData` (*Required*: `AthleteModel[]`): Danh sách VĐV hàng đầu để kết xuất đồ họa.
* `chromaColor` (*Optional*: `'green' | 'blue' | 'transparent'`): Lựa chọn mã màu nền keying. Mặc định là xanh lục thuần `#00FF00`.
* `displayLayout` (*Optional*: `'lower-third' | 'sidebar' | 'ticker'`): Thể thức trình bày đồ họa điểm số.

#### 7.4. State
* `currentTickerIndex` (*Internal State*: `number`): Vòng chỉ mục của VĐV đang hiển thị trên dải chạy chữ (Ticker) ở đáy màn hình.

#### 7.5. UI States
* `Active`: Đồ họa hoạt động bình thường trên nền Chroma-key rực rỡ.
* `Empty`: Hiển thị dải trống trơn không chứa thông tin, sẵn sàng chờ nạp dữ liệu thi đấu từ ban tổ chức.

#### 7.6. Responsive Behavior
* Không áp dụng cơ chế responsive co giãn tự do của web thông thường. Đồ họa được cố định theo chuẩn khung hình truyền hình phổ biến: 16:9 (1920x1080) hoặc 4K (3840x2160) để tránh méo hình khi lồng ghép luồng camera sân đấu.

#### 7.7. Accessibility
* Do component này chỉ phục vụ hiển thị truyền hình, không có tương tác trực tiếp của người dùng cuối nên không đòi hỏi thiết lập Keyboard Focus.
* Tuy nhiên, **MUST** tuân thủ tuyệt đối chuẩn WCAG AAA về độ tương phản ký tự trên plate nền tối của Lower Third.

#### 7.8. Animation
* **Slide-In Graphics**: Khi một VĐV mới vươn lên dẫn đầu, thanh ghi điểm trượt nhẹ nhàng từ biên trái màn hình vào trong (`x: [-300, 0], opacity: [0, 1]`) với gia tốc mượt mà.
* **Score Update Glow**: Nhấp nháy nhẹ dải sáng đỏ xung quanh ô điểm của VĐV khi điểm số mới được nạp vào.

#### 7.9. Performance
* Sử dụng phần cứng tăng tốc đồ họa thông qua thuộc tính CSS `will-change: transform` để đảm bảo hoạt động tách nền của OBS không bị sụt giảm tốc độ khung hình (drop frames) dưới 60 FPS.

#### 7.10. Design Tokens
* Chroma Green: `#00FF00` thuần khiết.
* Chroma Blue: `#0000FF` thuần khiết.
* Text Shadow: Viền bóng đổ đen sâu `[text-shadow:_0_2px_4px_rgba(0,0,0,0.95)]`.
* Typography Score: Phông chữ Mono siêu dày dặn `font-mono font-black text-2xl`.

#### 7.11. Dependencies
* Sử dụng: `AthleteAvatarMini` (Atom).
* Được sử dụng bởi: `OBSOverlayPage` (TV Page).

#### 7.12. Example Layout (ASCII Wireframe)
```text
+-------------------------------------------------------------------------+
| [Chroma Key Green Background: #00FF00]                                  |
|                                                                         |
|                                                                         |
|                                                                         |
|                                                                         |
|                                                                         |
|  [ ĐỒ HỌA LOWER-THIRD CHẠY Ở ĐÁY MÀN HÌNH ]                              |
|  +-------------------------------------------------------------------+  |
|  | HẠNG 1 | [Avatar] NGUYỄN VĂN A     | TỔNG ĐIỂM: 145 | VÒNG 3: x1.5|  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

### 8. COMPONENT: `GlobalToastNotification`

#### 8.1. Purpose
Trình quản lý ngăn xếp hàng đợi thông báo nổi (Toast Queue Manager) hoạt động ở cấp độ hạ tầng ứng dụng, đảm nhận trách nhiệm thông báo nhanh các sự kiện hệ thống (nhập điểm thành công, mất kết nối, cảnh báo khẩn) mà không cản trở màn hình nhập liệu của trọng tài.

#### 8.2. Responsibility
* Hiển thị tối đa 3 thông báo nổi đồng thời tại góc màn hình được chỉ định.
* Tự động xóa bỏ các thông báo cũ khỏi ngăn xếp sau một khoảng thời gian chờ (timeout) định sẵn.
* Đổi màu sắc và biểu tượng của thẻ thông báo linh hoạt dựa trên tính chất sự kiện (Success, Warning, Error, Info).
* **FORBIDDEN**: Không che kín toàn bộ màn hình, không chặn tương tác chạm của người dùng vào các nút bấm nằm ngoài vùng biên của thẻ thông báo.

#### 8.3. Props
* `toasts` (*Required*: `ToastMessageModel[]`): Danh sách mảng các thông báo đang hoạt động trong ngăn xếp.
* `onDismiss` (*Required*: `(toastId: string) => void`): Callback yêu cầu gỡ bỏ một thông báo cụ thể khỏi ngăn xếp.

#### 8.4. State
* Component này hoạt động thuần túy dựa trên Props được đồng bộ từ Global Context. Không chứa state nội bộ phức tạp để tránh bất đồng bộ ngăn xếp.

#### 8.5. UI States
* `Idle`: Ngăn xếp rỗng, ẩn hoàn toàn khỏi khung nhìn DOM để tiết kiệm tài nguyên vẽ.
* `Active`: Hiển thị các thẻ thông báo xếp chồng lên nhau ở góc biên phải phía trên màn hình, cách lề một khoảng an toàn 16px.

#### 8.6. Responsive Behavior
* **Desktop / Tablet**: Định vị neo cố định ở góc trên bên phải màn hình (`top-4 right-4`). Chiều rộng thẻ cố định 360px.
* **Mobile (< 768px)**: Di chuyển vị trí neo xuống chính giữa đáy màn hình (`bottom-4 left-4 right-4`) để người dùng dễ quan sát. Chiều rộng thẻ tự động dãn ra chiếm 100% chiều rộng vùng an toàn trừ đi lề biên.

#### 8.7. Accessibility
* ARIA: Toàn bộ container bọc ngăn xếp thông báo nổi **MUST** khai báo thuộc tính `role="alert"` và `aria-live="polite"` để Screen Reader tự động phát thanh nội dung thông báo ngay khi xuất hiện.

#### 8.8. Animation
* **Slide-In-Out Stack**: Thẻ thông báo mới xuất hiện bằng hiệu ứng bay từ biên phải vào trong kèm hiệu ứng mờ dần (`x: [100, 0], opacity: [0, 1]`). Khi bị xóa, thẻ co rút chiều cao về 0 một cách mượt mà để các thẻ phía dưới tịnh tiến lên trên tự nhiên.

#### 8.9. Performance
* Sử dụng `React.memo` bọc từng thẻ thông báo nhỏ trong danh sách ngăn xếp để tối thiểu hóa re-render khi các thẻ khác bị xóa hoặc thêm mới.

#### 8.10. Design Tokens
* Background Success: Nền tối viền xanh lục `bg-slate-900 border-emerald-500/80 text-slate-100`.
* Background Error: Nền tối viền crimson đỏ `bg-slate-900 border-red-500/80 text-slate-100`.
* Radius: Bo góc nhẹ nhàng `rounded-lg` (8px).
* Shadow: Đổ bóng nổi cao cấp `shadow-xl shadow-black/40`.

#### 8.11. Dependencies
* Sử dụng: `AlertCircle` (Lucide-React), `CheckCircle` (Lucide-React).
* Được sử dụng bởi: `AppShell` (Layout chính bọc ngoài cùng).

#### 8.12. Example Layout (ASCII Wireframe)
```text
+-------------------------------------------------------------------------+
|                                                                         |
|                                                                   (top) |
|                                      +-------------------------------+  |
|                                      | [Icon Check] Ghi điểm thành công|  |
|                                      | VĐV: Nguyễn Văn A đạt điểm 10 |  |
|                                      +-------------------------------+  |
|                                      +-------------------------------+  |
|                                      | [Icon Cloud] Đang hoạt động   |  |
|                                      | ở chế độ ngoại tuyến (Cache)  |  |
|                                      +-------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

### 9. COMPONENT: `DoubleConfirmationDialog`

#### 9.1. Purpose
Hộp thoại cảnh báo bảo mật nguy cấp hai bước (Double-Confirmation Modal Dialog) dùng để ngăn chặn hành động sơ suất bấm nhầm của quản trị viên đối với các tác vụ phá hủy dữ liệu hoặc thay đổi thể thức giải đấu nghiêm trọng (ví dụ: xóa vòng đấu đang thi đấu, reset điểm bệ bắn).

#### 9.2. Responsibility
* Vô hiệu hóa hoàn toàn mọi tương tác ở lớp giao diện phía dưới (backdrop lock) bằng cơ chế phủ mờ xám đậm (`bg-black/60 backdrop-blur-sm`).
* Yêu cầu người dùng thực hiện một hành động thứ hai rõ ràng (nhấn nút đếm ngược 3 giây hoặc nhập đúng chữ ký "XÁC NHẬN") mới kích hoạt nút thực thi cuối cùng.
* **FORBIDDEN**: Không được tự ý đóng hộp thoại khi chưa có sự tương tác bấm nút "Hủy" hoặc nhấn phím `Esc` từ người dùng.

#### 9.3. Props
* `isOpen` (*Required*: `boolean`): Trạng thái hiển thị đóng/mở của hộp thoại.
* `title` (*Required*: `string`): Tiêu đề cảnh báo (e.g., "XÓA VÒNG ĐẤU ĐANG THI ĐẤU?").
* `message` (*Required*: `string`): Đoạn văn giải thích chi tiết hậu quả nghiêm trọng của hành động.
* `confirmTextSignature` (*Optional*: `string`): Chuỗi ký tự yêu cầu người dùng gõ tay để mở khóa nút xác nhận.
* `onConfirm` (*Required*: `() => void`): Callback thực thi hành động nguy cấp khi đã vượt qua các bước xác thực bảo mật thành công.
* `onCancel` (*Required*: `() => void`): Callback hủy bỏ tác vụ và đóng hộp thoại an toàn.

#### 9.4. State
* `countdown` (*Internal State*: `number`): Bộ đếm ngược giây (mặc định khởi tạo từ 3 về 0) để trì hoãn kích hoạt nút bấm thực thi.
* `inputSignature` (*Internal State*: `string`): Giá trị ký tự người dùng đang gõ vào ô nhập xác nhận.

#### 9.5. UI States
* `CountdownActive`: Nút xác nhận bị khóa hoàn toàn, hiển thị đếm ngược: "Vui lòng đợi (3)...".
* `Ready`: Bộ đếm ngược về 0 và người dùng đã nhập đúng ký tự xác nhận. Nút xác nhận chuyển sang trạng thái sẵn sàng kích hoạt với màu đỏ rực rỡ nhấp nháy dải sáng nhẹ.

#### 9.6. Responsive Behavior
* Thích ứng đa thiết bị linh hoạt. Chiều rộng tối đa cố định `max-w-md` trên Desktop và Tablet.
* Trên điện thoại di động, tự động chuyển đổi phương thức hiển thị từ hộp thoại căn giữa sang **Bottom Sheet** trượt lên từ đáy màn hình để ngón tay cái dễ bấm nút thao tác.

#### 9.7. Accessibility
* ARIA: Hộp thoại bọc ngoài **MUST** khai báo thuộc tính `role="dialog"`, `aria-modal="true"`, và `aria-labelledby` trỏ trực tiếp tới thẻ tiêu đề của modal.
* Keyboard: Khi modal mở, tiêu điểm focus **MUST** được khóa chặt bên trong modal (Focus Trap), không cho phép nhấn `Tab` ra ngoài vùng biên. Nhấn phím `Esc` kích hoạt hàm `onCancel`.

#### 9.8. Animation
* **Modal Zoom-In**: Xuất hiện bằng hiệu ứng phóng to nhẹ nhàng từ tâm kèm theo hiệu ứng mờ dần của backdrop (`scale: [0.95, 1], opacity: [0, 1]`) sử dụng spring physics để tạo cảm giác cao cấp.

#### 9.9. Performance
* Sử dụng cơ chế React Portal để kết xuất nội dung Modal trực tiếp vào node `<body>` của tài liệu, triệt tiêu hoàn toàn các lỗi hiển thị đè lớp chồng chéo (z-index conflicts).

#### 9.10. Design Tokens
* Backdrop: `bg-slate-950/80 backdrop-blur-sm`.
* Container Modal: `bg-slate-900 border border-red-900/60 text-slate-100`.
* Button Confirm: Nền đỏ rực cảnh báo `bg-red-600 hover:bg-red-500 text-white`.
* Button Cancel: Nền xám trung tính `bg-slate-800 hover:bg-slate-700 text-slate-300`.
* Radius: Bo góc cứng cáp `rounded-xl` (12px).

#### 9.11. Dependencies
* Sử dụng: `Trash2` (Lucide-React), `AlertTriangle` (Lucide-React).
* Được sử dụng bởi: Toàn bộ các phân hệ Admin và Referee có chứa tác vụ hủy hoại dữ liệu.

#### 9.12. Example Layout (ASCII Wireframe)
```text
+-------------------------------------------------------------------------+
| [BACKDROP COVERING APP WITH BLUR EFFECTS]                               |
|                                                                         |
|         +-----------------------------------------------------+         |
|         | [Icon Alert] XÓA VÒNG ĐẤU ĐANG THI ĐẤU CHÍNH THỨC? |         |
|         +-----------------------------------------------------+         |
|         | Hành động này không thể khôi phục. Toàn bộ điểm số  |         |
|         | của 142 VĐV thuộc vòng thi này sẽ bị xóa vĩnh viễn  |         |
|         | khỏi hệ thống cơ sở dữ liệu.                        |         |
|         |                                                     |         |
|         | Nhập chữ "XÓA" để xác nhận hậu quả:                 |         |
|         | [ XÓA                           ]                   |         |
|         |                                                     |         |
|         | [Hủy bỏ tác vụ (Xám)]     [Xác nhận xóa vĩnh viễn(3)]|         |
|         +-----------------------------------------------------+         |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## MA TRẬN PHÂN CHIA TRÁCH NHIỆM COMPONENT (RESPONSIBILITY MATRIX)

Bảng ma trận dưới đây tổng hợp các quy tắc ràng buộc tuyệt đối về hành vi của linh kiện đối với các tài nguyên nghiệp vụ cốt lõi của VSC Platform.

| Tên Component | Đọc/Ghi Firestore trực tiếp | Chứa Logic xếp hạng | Có can thiệp vào cách tính điểm | Cho phép hardcode giao diện | Thích nghi thiết bị (Responsive) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `AppShell` | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **YES (Sidebar/Bottom-nav)** |
| `DashboardMetricCard` | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **YES (Bento Grid Item)** |
| `LeaderboardTable` | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **YES (Sticky Columns)** |
| `ScoreKeyboard` | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **YES (Large Touch Targets)** |
| `RoundSettingsAccordion`| **NEVER** | **NEVER** | **NEVER** | **NEVER** | **YES (Multi-column list)** |
| `SoloBattleCard` | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **YES (Split View/Stack)** |
| `OBSChromaKeyCanvas` | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NO (Fixed Broadcast standard)** |
| `GlobalToastNotification`| **NEVER** | **NEVER** | **NEVER** | **NEVER** | **YES (Neo góc/Dưới đáy)** |
| `DoubleConfirmationDialog`| **NEVER** | **NEVER** | **NEVER** | **NEVER** | **YES (Modal/BottomSheet)** |

---

### PHẦN KẾT: GIÁM SÁT TUÂN THỦ COMPONENT BIBLE
Tài liệu **VSC Component Specification V1.0 (Component Bible)** là hiến chương kỹ thuật duy nhất quy định chi tiết kết cấu và hành vi của mọi linh kiện UI trên hệ thống **VSC Platform V3**. 

Mọi hành vi vi phạm (ví dụ: tự ý gọi Firestore trực tiếp bên trong component Atom/Molecule, tự viết giải thuật xếp hạng đè lên Ranking Engine, hoặc bypass hệ thống màu Design Tokens để dùng mã hex màu tùy tiện) đều sẽ bị **từ chối phê duyệt (Reject)** trong các đợt kiểm tra chất lượng mã nguồn tự động của hệ thống.

Sự nhất quán, khoa học và chỉn chu trong thiết kế linh kiện là nền tảng tối thượng đưa **VSC Platform V3** trở thành giải pháp số hóa giải đấu slingshot hàng đầu Việt Nam!
