# VSC UI CONSTITUTION V1.0 (HIẾN PHÁP GIAO DIỆN)
## BỘ LUẬT TỐI CAO VỀ THIẾT KẾ VÀ TRẢI NGHIỆM NGƯỜI DÙNG VSC PLATFORM V3

---

### MỞ ĐẦU
Tài liệu này là Hiến pháp Giao diện (UI Constitution) tối cao và duy nhất của VSC Platform V3. Mọi quyết định thiết kế, phát triển frontend, hoặc điều chỉnh giao diện bởi lập trình viên hay trí tuệ nhân tạo (AI) đều phải tuân thủ tuyệt đối các quy tắc trong tài liệu này. 

**Nguyên tắc cốt lõi:**
1. **Tuyệt đối không thay đổi Core Logic:** Giao diện chỉ đọc và biểu diễn dữ liệu. Không thay đổi Firestore Schema, Database Structure, Tournament Engine, Ranking Engine, Qualification Engine, hay các thuật toán liên quan.
2. **Tính Động Tuyệt Đối (Dynamic Mastery):** Không hardcode bất kỳ tham số giải đấu nào. Toàn bộ cấu trúc giao diện phải thích ứng động theo dữ liệu cấu hình thực tế (`DistanceConfig`, `roundResults`, v.v.).
3. **Tính Nghiêm Ngặt:** Toàn bộ quy tắc được định nghĩa bằng các từ khóa tiêu chuẩn: **MUST**, **MUST NOT**, **SHALL**, **SHALL NOT**, **ALWAYS**, **NEVER**, **REQUIRED**, **FORBIDDEN**.

---

## CHAPTER 1: GLOBAL UI RULES

### RULE-001: Mobile-First Responsive Breakpoints
* **Purpose**: Bảo đảm tính tương thích của toàn hệ thống trên mọi thiết bị di động và máy tính để bàn.
* **Requirement**: The application MUST follow Tailwind CSS mobile-first breakpoint system. Default views MUST target portrait mobile layouts (width < 640px) first, and progressively scale up to widescreen layouts (lg: 1024px, xl: 1280px) using flexible flexbox and grid components.
* **Rationale**: Ban tổ chức và trọng tài chủ yếu vận hành qua máy tính bảng hoặc điện thoại ngoài sân bắn, trong khi khán giả xem Liveboard trên màn hình cực lớn.
* **Example**: `className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"`
* **Edge Cases**: Giao diện màn hình gập (Foldable devices) MUST NOT break columns; they SHALL fall back to a single column layout.
* **Compliance Criteria**: 100% of custom UI views pass physical rendering tests on iPhone 13 (390px) and iPad Pro (1024px) without horizontal scrolling.

### RULE-002: Fixed Container Bounds
* **Purpose**: Ngăn chặn tình trạng vỡ layout hoặc giãn rộng quá mức trên các màn hình siêu rộng (Ultra-wide).
* **Requirement**: The main layout wrapper MUST specify a maximum width boundary of `max-w-7xl` and be centered horizontally using `mx-auto`.
* **Rationale**: Giữ cho thông tin tập trung vào tầm mắt người dùng, tránh mỏi mắt trên màn hình 4K hoặc 21:9.
* **Example**: `<div id="app-container" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">`
* **Edge Cases**: Liveboard view (TV/OBS) is exempt from this rule to allow full-screen immersive rendering.
* **Compliance Criteria**: App shell contains exactly one master wrapper enforcing `max-w-7xl mx-auto`.

### RULE-003: App Shell Navigation Adaptability
* **Purpose**: Đảm bảo điều hướng trực quan nhất dựa trên kích thước vật lý của thiết bị.
* **Requirement**: On desktop viewports (>= 1024px), the App Shell MUST render a persistent left-side navigation rail. On mobile viewports (< 1024px), the navigation MUST switch immediately to a bottom navigation bar.
* **Rationale**: Tối ưu hóa "Thumb Zone" (vùng chạm ngón cái) trên điện thoại và tối đa hóa diện tích làm việc trên máy tính.
* **Example**: Hide sidebar via `hidden lg:flex` and display bottom bar via `flex lg:hidden`.
* **Edge Cases**: Portrait tablets (768px to 1023px) MUST render the bottom bar to prevent cramping.
* **Compliance Criteria**: Navigation component implements reactive window resize observer or Tailwind classes to switch view states.

### RULE-004: Safe Area Insets Enforcement
* **Purpose**: Đảm bảo các thành phần UI không bị che khuất bởi tai thỏ (Notch), camera ẩn hoặc thanh điều hướng hệ điều hành.
* **Requirement**: App Shell layout MUST incorporate safe area padding-bottom and padding-top variables in CSS.
* **Rationale**: Tránh việc nút bấm quan trọng hoặc thanh bottom navigation bị đè bởi Home Indicator của iOS/Android.
* **Example**: `pb-[env(safe-area-inset-bottom,16px)]`
* **Edge Cases**: Standalone installed progressive web apps (PWAs) MUST auto-expand padding-top to fit the native status bar.
* **Compliance Criteria**: Visual audit on iOS device shows at least 12px clear space between bottom navigation buttons and screen edge.

### RULE-005: Scroll Containment and Overflow Guard
* **Purpose**: Loại bỏ hiện tượng cuộn kép (double scrollbars) gây nhầm lẫn cho người sử dụng.
* **Requirement**: Scrollable sections inside panels or grids MUST utilize the CSS property `overflow-y-auto` combined with a fixed height or `h-full`, while the global body wrapper MUST lock overflow using `overflow-hidden`.
* **Rationale**: Giữ cho khung nhìn chính ổn định và chỉ cuộn các danh sách dữ liệu dài (như danh sách VĐV).
* **Example**: `<div id="athlete-list-container" className="h-[calc(100vh-200px)] overflow-y-auto">`
* **Edge Cases**: When modal dialogs are open, parent window scrolling MUST be completely frozen using body pointer events lock.
* **Compliance Criteria**: Zero secondary scrollbars visible in the browser window under any zoom level (80% to 150%).

### RULE-006: Loading Skeleton States
* **Purpose**: Tránh hiện tượng nhấp nháy bố cục (layout shift) khi dữ liệu đang được tải từ Firestore.
* **Requirement**: Every data-driven component (Leaderboard, Settings, Dashboard) MUST render a precise structural Skeleton component matching the shape of the expected content instead of displaying a blank screen or a generic spinner.
* **Rationale**: Cải thiện chỉ số Cumulative Layout Shift (CLS) và nâng cao trải nghiệm cảm giác của người dùng.
* **Example**: A skeleton row with pulsating grey bars matching the table layout.
* **Edge Cases**: If data loading takes less than 150ms, skeleton display MUST be delayed to prevent visual flickering.
* **Compliance Criteria**: DevTools performance audit shows zero layout shift when switching Firestore collections.

### RULE-007: Standard Empty States
* **Purpose**: Hướng dẫn người dùng hành động rõ ràng khi không có dữ liệu để hiển thị.
* **Requirement**: When a collection, query, or search filter returns empty, the UI MUST render an elegant centered container containing a custom Lucide-react icon, a high-contrast heading, and a descriptive subtitle.
* **Rationale**: Tránh hiểu lầm rằng ứng dụng bị lỗi hoặc bị đơ khi dữ liệu rỗng.
* **Example**: `<div id="empty-athletes-state" className="flex flex-col items-center justify-center p-8 text-gray-500">`
* **Edge Cases**: Search results empty state MUST include a button to clear the active filter.
* **Compliance Criteria**: Code contains explicit `if (data.length === 0)` rendering blocks with structural illustrations for all master views.

### RULE-008: Error Boundaries and Fallbacks
* **Purpose**: Ngăn chặn lỗi runtime làm hỏng toàn bộ giao diện của ứng dụng.
* **Requirement**: The App Shell and all major widgets MUST be wrapped in React Error Boundaries that capture runtime errors, log them silently to the database audit console, and display an eye-safe "Component Recovering" warning with a manual reload button.
* **Rationale**: Đảm bảo giải đấu không bị gián đoạn hoàn toàn chỉ vì một lỗi nhỏ trong quá trình render dòng.
* **Example**: An ErrorBoundary component returning a clean card with "Hệ thống đang tự khôi phục..."
* **Edge Cases**: If Firestore connection fails, the error boundary MUST show a clear connection status indicator.
* **Compliance Criteria**: Intentionally throwing an error inside a row render does not crash the app; only that specific row or panel displays a fallback UI.

### RULE-009: Strict Keyboard Focus States
* **Purpose**: Bảo đảm khả năng vận hành nhanh bằng bàn phím cho các trọng tài nhập điểm.
* **Requirement**: All interactive elements (inputs, tabs, buttons) MUST have highly visible focus states using a consistent, contrasting outline ring with a minimum thickness of 2px.
* **Rationale**: Trọng tài nhập điểm liên tục qua bàn phím cơ cần biết chính xác con trỏ đang ở ô nhập nào mà không cần dùng chuột.
* **Example**: `focus:outline-none focus:ring-2 focus:ring-emerald-500`
* **Edge Cases**: Focus outlines SHALL NOT be hidden on mobile devices if keyboard navigation is active.
* **Compliance Criteria**: Pressing the Tab key cycles through input elements with clear, non-ambiguous visual highlighting.

### RULE-010: Native Form Validation UI
* **Purpose**: Ngăn chặn việc nhập sai dữ liệu trước khi gửi lên Tournament Engine.
* **Requirement**: Input fields MUST display real-time inline validation feedback using standard color coding (green for valid, red for invalid) and helper text underneath the field, instead of showing generic browser alert dialogs.
* **Rationale**: Tránh việc dán/gõ nhầm điểm số ngoài khoảng cho phép (ví dụ: điểm bắn cung vượt quá 10, hoặc số âm).
* **Example**: An error message "Điểm số phải từ 0 đến 10" below the input with `text-red-500`.
* **Edge Cases**: Validation error messages MUST NOT shift the layout of surrounding elements (use absolute positioning or reserved space).
* **Compliance Criteria**: Entering invalid input triggers error classes instantly on keyup without shifting the table grid.

### RULE-011: Virtualized Scroll for Large Datasets
* **Purpose**: Đảm bảo hiệu năng mượt mà khi hiển thị số lượng lớn VĐV (lên tới 500+).
* **Requirement**: Whenever a list or table renders more than 100 concurrent rows, the UI MUST implement a virtualization list component (such as `react-window` or custom container slice) to only render active DOM nodes in the viewport.
* **Rationale**: Giảm thiểu tải RAM trên các máy tính bảng rẻ tiền hoặc điện thoại thông minh của trọng tài khi giải đấu mở rộng quy mô.
* **Example**: Rendering sliced array `visibleAthletes = sortedAthletes.slice(startIndex, endIndex)`.
* **Edge Cases**: Virtualized scroll MUST retain the exact relative positioning of the dynamic cutoff line.
* **Compliance Criteria**: Page scrolling maintains a consistent 60 FPS under audit on an low-end Android mobile device with 500 athlete rows.

### RULE-012: Dynamic Iframe Guard
* **Purpose**: Đảm bảo trải nghiệm mượt mà khi chạy trong môi trường nhúng (iframe) của AI Studio.
* **Requirement**: The application MUST NOT use features that are restricted in iframe sandboxes, such as `window.alert`, `window.open`, or modifying `window.top.location`. All external links MUST use `target="_blank" rel="noopener noreferrer"`.
* **Rationale**: Ngăn chặn lỗi bảo mật và giữ cho người dùng không bị văng khỏi môi trường xem trước (preview) của ứng dụng.
* **Example**: Use custom UI dialogs or toasts instead of native browser `alert()` or `confirm()`.
* **Edge Cases**: Permission requests (camera, location) MUST degrade gracefully if iframe blocks them.
* **Compliance Criteria**: Zero console warnings or errors regarding iframe sandboxing policies during execution.

---

## CHAPTER 2: DESIGN TOKEN RULES

### RULE-013: Brand Palette Authority
* **Purpose**: Định hình bản sắc trực quan mạnh mẽ, hiện đại, và chuyên nghiệp cho giải đấu thể thao điện tử/bắn cung.
* **Requirement**: The system MUST enforce a strict color palette mapped directly to functional roles:
  * Primary/Canvas Background: Deep Carbon Black (`#0B0F19`) or Soft Off-White (`#F9FAFB`).
  * Surface/Cards: Obsidian Dark (`#1E293B`) or Pristine White (`#FFFFFF`).
  * Brand Accent: Vibrant Emerald (`#10B981`) or Electric Archery Gold (`#F59E0B`).
  * Status Alert: High-Alert Crimson (`#EF4444`).
* **Rationale**: Màu sắc thống nhất tạo nên cảm giác uy tín, chuyên nghiệp và có độ tương phản cao, hỗ trợ việc đọc nhanh số điểm.
* **Example**: `bg-slate-900 text-slate-100 border-slate-800`
* **Edge Cases**: Custom brand color tokens MUST NOT be bypassed by hardcoded hex colors inside components.
* **Compliance Criteria**: CSS uses strictly Tailwind class tokens or CSS variables. No inline hex values like `color: #ff3300` are permitted.

### RULE-014: Color Contrast Standards (WCAG 2.1)
* **Purpose**: Đảm bảo mọi đối tượng người dùng đều đọc được thông tin điểm số một cách dễ dàng.
* **Requirement**: Text-to-background contrast ratio MUST meet or exceed WCAG 2.1 AA standard. Normal text (size < 18px) MUST have a contrast ratio of at least 4.5:1, and large text (>= 18px) MUST have a contrast ratio of at least 3:1.
* **Rationale**: Trọng tài làm việc ngoài trời nắng gắt hoặc khán giả đứng xa màn hình LED cần đọc rõ điểm số của VĐV.
* **Example**: White text on obsidian bg (`#FFFFFF` on `#1E293B`) is highly compliant.
* **Edge Cases**: Dimmed text (subtitles, secondary info) MUST NOT fall below 4.5:1 contrast against its background.
* **Compliance Criteria**: Automated accessibility scanner returns zero color contrast violations on key panels.

### RULE-015: Typography Scale Hierarchy
* **Purpose**: Tạo ra nhịp điệu thị giác rõ ràng thông qua phân cấp cỡ chữ.
* **Requirement**: The system typography scale MUST strictly map as follows:
  * Title Widescreen: `font-sans text-4xl font-extrabold tracking-tight`
  * Heading 1: `font-sans text-2xl font-bold`
  * Subheading/Card Title: `font-sans text-lg font-semibold`
  * Body Text: `font-sans text-sm font-medium`
  * Score Numbers: `font-mono font-bold`
* **Rationale**: Giúp mắt người dùng tự động phân loại thông tin quan trọng nhất (như thứ tự xếp hạng và điểm số) trước khi đọc chi tiết.
* **Example**: Mapping leader numbers to `text-3xl font-mono`.
* **Edge Cases**: Liveboard numbers are exempt and scale up to `text-6xl` or larger.
* **Compliance Criteria**: App uses `Inter` for general UI and `JetBrains Mono` or `Fira Code` exclusively for numbers, times, and round tallies.

### RULE-016: Border Radius Uniformity
* **Purpose**: Đảm bảo tính nhất quán về hình học trong mọi khối thành phần UI.
* **Requirement**: Corner rounding MUST be strictly applied as follows:
  * Interactive inputs and buttons: `rounded-lg` (8px).
  * Data cards, modal dialogs, and outer container panels: `rounded-xl` (12px) or `rounded-2xl` (16px).
  * Status badges and avatar overlays: `rounded-full` (9999px).
* **Rationale**: Việc đồng bộ hóa góc bo tròn giúp giao diện gọn gàng, hiện đại và không có cảm giác rời rạc.
* **Example**: `<div className="bg-slate-800 rounded-xl border border-slate-700 p-6">`
* **Edge Cases**: Extreme custom layouts (such as bento grids) SHALL NOT mix square corners with rounded corners.
* **Compliance Criteria**: Static code analysis confirms zero usage of arbitrary rounded values (e.g. `rounded-[20px]`).

### RULE-017: Soft Elevation Shadows
* **Purpose**: Tạo chiều sâu không gian ba chiều (3D depth) để phân tách các lớp thông tin.
* **Requirement**: Outer components MUST utilize clean, custom shadow tokens instead of harsh default shadows:
  * Floating cards: `shadow-sm` or `shadow-md` (slate-toned shadows).
  * Hovered states: Smooth transition to `shadow-lg` with subtle upward translate motion.
  * Modals and dropdowns: `shadow-xl` (with black opacity-30).
* **Rationale**: Shadows giúp mắt nhận biết lớp nào nằm trên cùng (như dropdown điều hướng hoặc hộp thoại xác nhận).
* **Example**: `transition-shadow duration-200 shadow-md hover:shadow-lg`
* **Edge Cases**: On high-contrast black interfaces (Liveboard), physical borders (`border`) MUST be preferred over drop shadows.
* **Compliance Criteria**: Shadow tokens are explicitly mapped to the theme or Tailwind configurations; no custom heavy black drop-shadows are used.

### RULE-018: Spacing and Grid Rhythm
* **Purpose**: Thiết lập khoảng trống thở cho mắt và tổ chức thông tin khoa học.
* **Requirement**: All spacing (margins, paddings, gap widths) MUST conform to a strict 4px grid system (multiples of 4px: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px).
* **Rationale**: Tránh hiện tượng bố cục lộn xộn, mất đối xứng hoặc quá khít sát khiến dữ liệu khó đọc.
* **Example**: Use padding classes like `p-1`, `p-2`, `p-3`, `p-4`, `p-6`, `p-8` exclusively.
* **Edge Cases**: Fractional spacing (e.g. `p-[10px]`) is STRIPCALLY FORBIDDEN unless centering specific micro-icons.
* **Compliance Criteria**: Layout inspection confirms all spacing values map exactly to Tailwind's default 4px increments (factor of 4).

### RULE-019: Interaction Elevation Transition
* **Purpose**: Tạo phản hồi trực quan sinh động khi di chuột qua hoặc tương tác với UI.
* **Requirement**: Every button, clickable table row, and tab option MUST have a smooth hover and focus scale or color transition. The standard transition duration MUST be 150ms to 200ms using the `ease-in-out` timing function.
* **Rationale**: Giúp người dùng cảm thấy ứng dụng mượt mà, phản hồi tức thì và có cảm giác cao cấp.
* **Example**: `<button className="transition-all duration-200 ease-in-out hover:bg-emerald-600 active:scale-95">`
* **Edge Cases**: Transitions MUST be fully disabled if the client device has motion reduction enabled (`motion-reduce:transition-none`).
* **Compliance Criteria**: Interactivity audit shows zero immediate/jumpy color changes on clickable components.

### RULE-020: Icon Standard Library
* **Purpose**: Đồng bộ hóa toàn bộ biểu tượng trực quan trên hệ thống, tránh xung đột phong cách vẽ.
* **Requirement**: The application MUST exclusively utilize icons from the `lucide-react` library. Custom SVGs, FontAwesome, or other icon packs are STRIPCALLY FORBIDDEN unless specifically requested.
* **Rationale**: Giữ cho dung lượng gói tải (bundle size) nhỏ gọn và phong cách vẽ các nét đồng nhất (stroke width, corner style).
* **Example**: `import { Trophy, Clock, Settings, User } from 'lucide-react';`
* **Edge Cases**: If a specific brand icon (like Facebook, Google) is required, a highly optimized SVG inside a container is allowed but MUST match the stroke guidelines.
* **Compliance Criteria**: Code audit confirms zero imports from other icon packages.

### RULE-021: Visual Border Contrast
* **Purpose**: Định hình biên giới các khối thông tin rõ ràng trên giao diện tối (Dark mode).
* **Requirement**: All card, table, and sidebar borders MUST have a high-contrast border definition relative to the canvas background (minimum contrast ratio of 3:1).
* **Rationale**: Trên màn hình OLED hoặc màn hình chất lượng kém, nếu không có viền phân tách, các khối sẽ bị hòa lẫn thành một mảng đen lớn.
* **Example**: For background `#0B0F19`, borders MUST be at least `#1E293B` or `#334155`.
* **Edge Cases**: Active states MUST highlight the border using the primary brand color (`#10B981` or `#F59E0B`).
* **Compliance Criteria**: Visually inspect the app on a medium-brightness TN panel; all layout sections remain perfectly distinct.

### RULE-022: Layout Density Adaptability
* **Purpose**: Tối ưu hóa không gian hiển thị dựa trên mục tiêu sử dụng của từng màn hình.
* **Requirement**: The system MUST implement two layout density modes: "Compact" (for multi-row leaderboards and settings panels, row height 40px-48px) and "Comfortable" (for app dashboard, scoring pads, and settings cards, row height 56px-72px).
* **Rationale**: Màn hình bảng điểm cần nén tối đa dòng để hiển thị nhiều VĐV cùng lúc, trong khi bảng điều khiển và nhập điểm cần nút lớn để tránh bấm nhầm.
* **Example**: Applying conditional padding `py-1` (compact) vs `py-3` (comfortable).
* **Edge Cases**: Switching density MUST NOT recalculate core data states or cause layout shifts.
* **Compliance Criteria**: Compact lists easily render 15 athletes above the fold on standard desktop screens (1080p).

### RULE-023: Alert Color System Integrity
* **Purpose**: Tạo tín hiệu khẩn cấp đồng bộ cho toàn bộ hệ thống vận hành giải đấu.
* **Requirement**: Color coding for emergency statuses, errors, and alerts MUST be consistently mapped to red shades (`#EF4444` to `#991B1B`), informational updates to blue shades (`#3B82F6`), and active/success states to green (`#10B981`).
* **Rationale**: Tránh hiện tượng nhầm lẫn nguy hiểm như sử dụng màu vàng cho trạng thái "Đang chờ Solo" hoặc màu đỏ cho trạng thái "Đã đạt chuẩn".
* **Example**: Emergency Widget MUST use red styling (`bg-red-950 border-red-800 text-red-200`).
* **Edge Cases**: Under no circumstances SHALL red be used for secondary or normal ranking operations.
* **Compliance Criteria**: Visual check of all alert banners and status badges maps 100% to this strict coding.

### RULE-024: Font-Smoothing and Subpixel Rendering
* **Purpose**: Đảm bảo văn bản sắc nét và dễ đọc nhất trên tất cả trình duyệt và hệ điều hành.
* **Requirement**: The root CSS file MUST apply antialiasing and subpixel font smoothing options to the global body element.
* **Rationale**: Tối ưu hóa việc hiển thị phông chữ Inter và JetBrains Mono trên hệ điều hành Windows và macOS.
* **Example**: Add `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` to `@import "tailwindcss";` layer base.
* **Edge Cases**: Liveboard fonts with thick weights MUST NOT look blurry or bloated on old browsers.
* **Compliance Criteria**: Running App inspection on Chromium/Firefox shows active font smoothing classes in the CSS tree.

---

## CHAPTER 3: DASHBOARD RULES

### RULE-025: Bento Grid Responsive Layout
* **Purpose**: Hiển thị tổng quan thông số giải đấu một cách khoa học và cân xứng.
* **Requirement**: The dashboard homepage MUST implement a Bento Grid layout that dynamically adjusts from a single column on mobile, to two columns on tablet, and three/four columns on widescreen desktops.
* **Rationale**: Khách hàng, báo chí, và trọng tài chính có thể nắm bắt nhanh quy mô, số lượng VĐV, vòng đấu, và trạng thái khẩn cấp trong vòng 3 giây đầu tiên.
* **Example**: `className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"`
* **Edge Cases**: If there is an emergency (such as pending Solo shootoffs), the Emergency Alert Widget MUST span the entire grid width at the absolute top of the bento grid.
* **Compliance Criteria**: Grid components are fluid; rearranging widgets does not break the layout or overlap blocks.

### RULE-026: Real-Time Metric Cards
* **Purpose**: Biểu diễn các thông số vận hành giải đấu một cách sống động.
* **Requirement**: Metric cards (Total Athletes, Current Round, Active Teams, Top Score) MUST fetch values directly from the active Firestore snapshots. They MUST include a subtle glowing accent border matching their status.
* **Rationale**: Người điều hành cần theo dõi nhịp độ giải đấu liên tục mà không cần tải lại trang.
* **Example**: Card component showing "VĐV Hoạt Động" with a live count that pulses gently on change.
* **Edge Cases**: If Firestore connection is offline, metrics MUST display the last cached value accompanied by a small gray cloud icon with a slash.
* **Compliance Criteria**: Metrics auto-update when database change events occur, verified via mock Firestore mutations.

### RULE-027: Active Tournament Progress Indicator
* **Purpose**: Minh họa tiến trình giải đấu trực quan theo phần trăm hoàn thành.
* **Requirement**: The dashboard MUST display a central, high-contrast linear progress bar indicating the active round progression.
* **Rationale**: Tạo cái nhìn trực quan về khối lượng công việc đã hoàn thành và thời lượng còn lại của giải đấu.
* **Example**: A progress bar calculated as `(Current Round / Total Rounds) * 100`.
* **Edge Cases**: For tournaments with non-sequential or single-round configuration, this progress bar SHALL adapt dynamically or hide elegantly without throwing structural null-pointer errors.
* **Compliance Criteria**: Layout correctly displays progression from 0% to 100% based on Firestore's rounds configuration data.

### RULE-028: Recent Activity Log Feed
* **Purpose**: Hiển thị lịch sử ghi điểm và tương tác gần nhất của các trọng tài.
* **Requirement**: The dashboard MUST include a card displaying the last 5 score recordings or status changes (e.g., "Trọng tài A đã nhập điểm cho VĐV B tại Vòng 3").
* **Rationale**: Đảm bảo tính minh bạch và giúp Ban tổ chức dễ dàng kiểm tra hoạt động tại các bệ bắn.
* **Example**: A chronological vertical timeline of logs with relative time formatting (e.g., "2 phút trước").
* **Edge Cases**: When no logs exist, the container MUST render the standard empty state.
* **Compliance Criteria**: Logs dynamically append to the top of the list when a score is submitted.

### RULE-029: Quick-Action Floating Bar
* **Purpose**: Cung cấp lối tắt nhanh đến các tính năng vận hành quan trọng từ trang chủ.
* **Requirement**: The dashboard MUST include a persistent or easily accessible quick-action panel/bar allowing one-click access to: Nhập Điểm, Cấu Hình Vòng, Liveboard, and Trợ Giúp.
* **Rationale**: Giảm thời gian điều hướng và đơn giản hóa thao tác cho trọng tài trong môi trường thi đấu áp lực cao.
* **Example**: A persistent bottom right utility dial or top button group.
* **Edge Cases**: Access to actions MUST be dynamically restricted or warning-gated based on tournament state.
* **Compliance Criteria**: UI elements are accessible with a single tap, loading their respective panels instantly.

### RULE-030: Leaderboard Preview Widget
* **Purpose**: Cung cấp một bản tóm tắt nhanh về Top 3 VĐV xuất sắc nhất tại trang chủ.
* **Requirement**: The dashboard MUST contain a micro-leaderboard widget showing the current top 3 leading athletes, complete with their rank, name, and total accumulated score.
* **Rationale**: Kích thích tính tò mò và cung cấp thông tin tiêu điểm tức thì mà không yêu cầu người dùng phải chuyển sang tab Leaderboard đầy đủ.
* **Example**: A minimalist table displaying the top 3 rows with small gold, silver, and bronze badges.
* **Edge Cases**: If there are no athletes registered, this preview widget MUST show a "Đang chờ đăng ký VĐV" warning.
* **Compliance Criteria**: Preview rankings exactly match the master Leaderboard component data.

### RULE-031: System Status Dashboard Header
* **Purpose**: Xác nhận độ ổn định của hệ thống mạng và kết xuất dữ liệu.
* **Requirement**: At the top of the dashboard, there MUST be a system header showing the Tournament Name, current local time, and an explicit connection indicator green dot representing "Kết nối Firebase: Hoạt động".
* **Rationale**: Tránh trường hợp trọng tài không nhận ra mạng bị mất kết nối và tiếp tục thao tác trên dữ liệu offline lỗi thời.
* **Example**: A slim banner with a green pulsing dot next to the text "DỮ LIỆU ĐỒNG BỘ THỜI GIAN THỰC".
* **Edge Cases**: If Firestore enters an offline state, the dot MUST turn amber or red within 3 seconds.
* **Compliance Criteria**: The component tracks `window.navigator.onLine` and Firestore network states actively.

### RULE-032: Emergency Alert Center Layout
* **Purpose**: Thu hút sự chú ý tuyệt đối của ban điều hành vào các trường hợp khẩn cấp của giải đấu.
* **Requirement**: The Emergency Alert Card MUST have a minimum visual height of 80px, be styled with a pulsing blood-red background border, and contain a prominent alarm icon from Lucide.
* **Rationale**: Đảm bảo Ban tổ chức không bỏ lỡ các trận đấu Solo quyết định khi có hai VĐV trùng điểm số ở ranh giới đi tiếp.
* **Example**: `<div className="animate-pulse bg-red-950 border border-red-800 rounded-xl p-4 text-red-200">`
* **Edge Cases**: This widget MUST automatically hide itself when `pendingSoloIds` and `pendingResoloIds` arrays in Firestore are empty.
* **Compliance Criteria**: Automated check verifies widget display condition is strictly tied to pending solo/resolo data states.

### RULE-033: Dashboard Layout Grid Proportionality
* **Purpose**: Phân bổ diện tích hiển thị hợp lý dựa trên độ quan trọng của thông tin.
* **Requirement**: The main dashboard grid MUST divide space with a ratio of 2/3 for core metrics and live tournament activity, and 1/3 for quick controls, system status, and emergency indicators.
* **Rationale**: Đảm bảo các chỉ số quan trọng thu hút sự chú ý nhiều nhất, tránh lãng phí diện tích vào các chức năng phụ.
* **Example**: `className="grid grid-cols-1 lg:grid-cols-3 gap-6"`, where metric grid uses `lg:col-span-2` and side panel uses `lg:col-span-1`.
* **Edge Cases**: On mobile viewports, this grid MUST collapse into a single vertical stream preserving the order: Emergency -> Core Metrics -> Activity Feed.
* **Compliance Criteria**: Proportion is enforced across screen widths from 1024px upwards.

### RULE-034: Interactive Quick Search Bar
* **Purpose**: Cho phép tra cứu nhanh thông tin VĐV ngay tại màn hình chính.
* **Requirement**: The dashboard header MUST integrate a search input that auto-suggests athletes as the user types, displaying their ranking, current status, and a button to jump directly to their scorecard.
* **Rationale**: Hỗ trợ Ban tổ chức tìm kiếm hồ sơ của một VĐV cụ thể một cách nhanh nhất khi có khiếu nại.
* **Example**: Search input with a drop-down list of results filtered by name or code.
* **Edge Cases**: If search query length < 2 characters, the auto-suggest container MUST remain closed.
* **Compliance Criteria**: Search query is debounced by 200ms and executes locally on the pre-fetched client-side athlete array.

---

## CHAPTER 4: SETTINGS RULES

### RULE-035: Accordion Layout for Multi-Round Settings
* **Purpose**: Giảm thiểu sự phức tạp trực quan khi cấu hình một giải đấu có rất nhiều vòng đấu (lên tới 20+ vòng).
* **Requirement**: The Settings Panel MUST organize the parameters of each round into separate, collapsible Accordion items. Each accordion card header MUST display the round number, round custom name, and an active status chip showing summary configs.
* **Rationale**: Tránh hiện tượng cuộn vô tận và cho phép người quản trị tập trung chỉnh sửa duy nhất một vòng đấu cụ thể mà không lo nhìn nhầm sang vòng khác.
* **Example**: An accordion card styled with a chevron icon that rotates 180 degrees when expanded.
* **Edge Cases**: Expanding a round accordion MUST NOT collapse other accordions automatically unless the user has enabled the "Single-Focus Mode" preference.
* **Compliance Criteria**: Code implements a clean state-based accordion list (`expandedRoundId === round.id`).

### RULE-036: Round Summary Header Chips
* **Purpose**: Giúp người quản trị nhận biết nhanh các luật đặc biệt của từng vòng mà không cần mở rộng accordion.
* **Requirement**: Each round's accordion header MUST render miniature high-contrast color badges representing:
  * Multiplier (e.g. "x1.5" or "x2")
  * Cumulative ("Cộng dồn" - Blue badge) or Single Round ("Vòng riêng" - Amber badge)
  * Max Round Score ("Điểm Cao Nhất" - Emerald badge)
  * Elimination ("Loại" - Crimson badge)
  * Solo / Resolo ("Solo" - Violet badge)
* **Rationale**: Cung cấp cái nhìn toàn cảnh về cấu trúc giải đấu trong nháy mắt.
* **Example**: `<span className="px-2 py-0.5 text-xs roundedbg-slate-700 text-slate-200 font-bold">x1.5</span>`
* **Edge Cases**: If all settings for a round are standard/default, the summary area MUST state "Mặc định (Không áp dụng luật đặc biệt)" in muted text.
* **Compliance Criteria**: Badges render dynamically based on the round's actual parameters within the configuration array.

### RULE-037: Reorder Round Drag and Drop Safety
* **Purpose**: Cho phép thay đổi thứ tự các vòng đấu một cách trực quan, đồng thời đảm bảo không làm đứt gãy tính liên kết dữ liệu.
* **Requirement**: The Settings Panel MUST support rearranging rounds using a safe drag-and-drop mechanism (e.g., Lucide grab handles). During dragging, the active card MUST display a semi-transparent overlay, and the target drop zones MUST expand dynamically to accept the card.
* **Rationale**: Hỗ trợ việc dời lịch thi đấu hoặc sắp xếp lại thứ tự ưu tiên các vòng đấu dễ dàng mà không cần nhập liệu lại.
* **Example**: A grab icon `:::` placed at the absolute left of the round header card.
* **Edge Cases**: Dragging a round that already has shot records submitted MUST trigger a blocking warning modal: "Vòng đấu này đã có điểm thi đấu. Thay đổi thứ tự có thể ảnh hưởng đến kết quả tính toán cộng dồn. Bạn có muốn tiếp tục?".
* **Compliance Criteria**: Drag-and-drop actions produce a reordered configuration array which is successfully validated before saving.

### RULE-038: Strict Multiplier Boundaries
* **Purpose**: Ngăn chặn cấu hình hệ số nhân sai lệch gây méo mó kết quả xếp hạng.
* **Requirement**: The multiplier setting input for any round MUST be a numeric field capped strictly between `0.5` and `5.0` with increments of `0.1` or `0.5`.
* **Rationale**: Đảm bảo điểm số không bị nhân lên vô lý làm hỏng logic của Ranking Engine.
* **Example**: An HTML input element `<input type="number" min="0.5" max="5" step="0.1" />`.
* **Edge Cases**: If a user tries to type a value manually outside this range, the input MUST auto-reset to the closest boundary (e.g., 0.4 becomes 0.5) and flash a brief red alert.
* **Compliance Criteria**: Frontend validator enforces maximum and minimum restrictions at the change-handler level.

### RULE-039: Cumulative Mode Toggle Logic
* **Purpose**: Bảo đảm cấu hình cách tính điểm tích lũy được đồng bộ chính xác với Leaderboard.
* **Requirement**: The Settings Panel MUST provide a high-contrast slide toggle or switch component for `isCumulative`. When enabled, the label MUST clearly state: "Tính cộng dồn điểm của vòng này vào tổng điểm". When disabled, the label MUST state: "Chỉ tính điểm riêng của vòng này (Không cộng dồn)".
* **Rationale**: Tránh việc trọng tài kích hoạt nhầm cơ chế cộng dồn cho các vòng đấu độc lập hoặc vòng loại trực tiếp riêng lẻ.
* **Example**: A standard toggle styled with an emerald green background when active.
* **Edge Cases**: If `isCumulative` is disabled, the system MUST show a warning if subsequent rounds are set to cumulative.
* **Compliance Criteria**: Toggle component updates the `DistanceConfig` object dynamically and changes help-text in real-time.

### RULE-040: Max Round Score Enforcement UI
* **Purpose**: Bảo vệ tính toàn vẹn của dữ liệu điểm bắn cung/bắn súng.
* **Requirement**: The Settings Panel MUST include a numeric field for `maxRoundScore` that is visible ONLY when the round type requires a ceiling cap. The input field MUST NOT accept decimal values and MUST be strictly positive.
* **Rationale**: Ngăn chặn sai sót của trọng tài khi ghi nhận số điểm vượt quá năng lực tối đa của thiết bị hoặc cung bắn (ví dụ: tối đa 60 điểm cho một lượt bắn 6 mũi).
* **Example**: Input field restricted to integers with clear label "Điểm Tối Đa Có Thể Đạt Được".
* **Edge Cases**: If `isMaxRoundScore` is enabled, the scoring keyboard input for that round MUST automatically lock keys exceeding the configured maximum value.
* **Compliance Criteria**: Form validation throws an error if `maxRoundScore` contains a floating point or negative number.

### RULE-041: Elimination Rules Configuration Panel
* **Purpose**: Định nghĩa rõ ràng cơ chế loại bỏ VĐV sau mỗi vòng đấu.
* **Requirement**: When `isElimination` is toggled active, the settings interface MUST expand an inner options card allowing the selection of:
  * `eliminationType`: Dropdown options: "Xếp hạng cố định (Top N)", "Phần trăm (Top N%)", or "Theo điểm tối thiểu".
  * `eliminationValue`: Numeric input mapping to the selected type.
* **Rationale**: Cung cấp cấu hình linh hoạt cho Ban tổ chức tùy theo thể thức giải (ví dụ: chỉ lấy Top 16 đi tiếp, hoặc loại 50% số VĐV thấp nhất).
* **Example**: Selector dropdown pairing perfectly with a description label that updates dynamically based on the choice (e.g., "Sẽ loại bỏ toàn bộ VĐV có thứ hạng lớn hơn 10").
* **Edge Cases**: If `eliminationValue` is configured to a value larger than the total active athlete count, the validator MUST display a warning: "Giá trị loại bỏ vượt quá số lượng VĐV đăng ký".
* **Compliance Criteria**: Sub-parameters are successfully packaged and written into the `DistanceConfig` schema structure.

### RULE-042: Emergency Solo Configuration Trigger
* **Purpose**: Cho phép thiết lập thủ công hoặc kích hoạt cưỡng bức vòng đấu Solo quyết định.
* **Requirement**: The settings panel MUST contain a toggle labeled `isSolo` or "Kích hoạt Solo Shootoff". Enabling this MUST show an informational alert box explaining: "Cơ chế này sẽ tự động khóa thứ hạng ranh giới và kích hoạt widget chờ nhập điểm Solo đối đầu trực tiếp khi có hiện tượng đồng điểm".
* **Rationale**: Giúp giải quyết nhanh chóng tình huống đồng điểm ở vị trí ranh giới loại (Cutoff) mà không cần ban tổ chức can thiệp thủ công vào cơ sở dữ liệu.
* **Example**: A purple-themed switch panel with a warning icon and a short description.
* **Edge Cases**: Enabling Solo MUST NOT reset existing scores in the database; it only updates the metadata config of the active round.
* **Compliance Criteria**: Toggle updates `isSolo: true` in the selected round configuration block.

### RULE-043: Settings Configuration Rollback Mechanism
* **Purpose**: Cho phép hủy bỏ các thay đổi cấu hình chưa được lưu mà không làm hỏng dữ liệu đang chạy.
* **Requirement**: The Settings Panel MUST contain two prominent, easily distinguishable action buttons at the absolute bottom of the panel: "Hủy thay đổi" (Neutral secondary style) and "Lưu cấu hình" (Accent emerald primary style). Clicking "Hủy" MUST revert all temporary state changes to match the current Firestore state exactly.
* **Rationale**: Tránh việc người quản trị vô tình thay đổi thông số giải đấu và lưu lại một cách không thể cứu vãn.
* **Example**: A button group anchored sticky at the bottom of the viewport with a blurred background.
* **Edge Cases**: If there are unsaved changes, navigating away from the settings view MUST trigger a browser confirmation dialog: "Bạn có những thay đổi chưa được lưu. Bạn có chắc chắn muốn rời đi?".
* **Compliance Criteria**: State comparison is run before rendering navigation blocks to detect unsaved modifications.

### RULE-044: Add and Delete Round Safety Locks
* **Purpose**: Ngăn chặn hành động vô tình xóa một vòng đấu có chứa dữ liệu thực tế.
* **Requirement**: The "Xóa Vòng" button inside the round accordion MUST require double-confirmation. The first click MUST change the button text to "Xác Nhận Xóa Vòng?", and the second click MUST occur within 3 seconds, otherwise the button resets to its original state.
* **Rationale**: Việc xóa nhầm một vòng đấu sẽ gây thảm họa mất dữ liệu điểm số của hàng trăm VĐV trong giải đấu thực tế.
* **Example**: Clicking "Xóa" starts a 3-second countdown progress bar inside the button width.
* **Edge Cases**: If a round has at least one shot recorded in the database, the "Xóa Vòng" button MUST be completely disabled and grayed out, showing a tooltip explanation: "Không thể xóa vòng đấu đã có điểm thi đấu ghi nhận".
* **Compliance Criteria**: Double-confirmation state machine implemented securely on click handlers.

### RULE-045: Instant Settings Sync indicator
* **Purpose**: Thông báo cho người điều hành trạng thái lưu trữ của cấu hình trên đám mây.
* **Requirement**: After clicking "Lưu cấu hình", the UI MUST display a micro-loading spinner inside the primary button, followed by an elegant, green toast notification confirming: "Đã lưu cấu hình giải đấu thành công".
* **Rationale**: Tránh hiện tượng nhấp nút nhiều lần liên tục (double-submission) gây lỗi đồng bộ dữ liệu.
* **Example**: Disabled button state with text "Đang lưu cấu hình..." during write operations.
* **Edge Cases**: If database write fails, the button MUST revert to active state and display a red error toast with the corresponding error message.
* **Compliance Criteria**: Save operation is bound to a loading state and successfully resolves the Firestore Promise.

### RULE-046: Database Schema Freeze Guard
* **Purpose**: Bảo đảm cấu hình thiết lập không thay đổi cấu trúc dữ liệu của Tournament Engine.
* **Requirement**: All form fields, inputs, and toggles in the Settings view MUST bind and write exclusively to the existing Firestore `DistanceConfig` and `roundResults` models. No new fields or custom properties SHALL be created or sent to the database.
* **Rationale**: Giữ vững cam kết tuyệt đối không làm gãy vỡ hệ thống tính điểm, xếp hạng hiện tại của VSC Platform.
* **Example**: Object transformations are performed locally to match the exact schema structure before executing Firestore database updates.
* **Edge Cases**: Any unused field generated by form-library helpers MUST be stripped out before the final payload is dispatched.
* **Compliance Criteria**: Outgoing payload structure strictly audited against original blueprint JSON.

---

## CHAPTER 5: LEADERBOARD RULES

### RULE-047: Widescreen/Compact Dynamic Round Selector
* **Purpose**: Tối ưu hóa không gian hiển thị danh sách vòng đấu trên Leaderboard dựa trên số lượng vòng thi thực tế.
* **Requirement**: If the total number of rounds configured is <= 5, the Round Selector MUST render all round options as persistent directly visible tabs. If the number of rounds > 5, the selector MUST display:
  * A master tab [Tổng]
  * Tabs for [V1], [V2], [V3], [V4]
  * A final dynamic tab [Thêm ▼] containing a dropdown menu containing all remaining configured rounds.
* **Rationale**: Tránh tình trạng tràn hàng, vỡ menu, hoặc ép các tab thành kích thước quá nhỏ không thể đọc được trên màn hình điện thoại hoặc máy tính bảng.
* **Example**: A beautiful tab strip where clicking [Thêm ▼] displays a clean dropdown floating card with Obsidian styling.
* **Edge Cases**: The active round selected from the dropdown menu MUST replace the [V4] tab visually, keeping the selected round instantly visible and accessible, with an active indicator highlight.
* **Compliance Criteria**: React component measures window space or reads round array length to switch tab mode seamlessly.

### RULE-048: Persistent Rule Banner Integration
* **Purpose**: Cung cấp thông tin luật thi đấu minh bạch cho VĐV và khán giả ngay trên bảng xếp hạng.
* **Requirement**: The Leaderboard view MUST display a thin, informative Rule Banner immediately below the round selector. This banner MUST read and format values directly from the active `DistanceConfig` collection, showing:
  * Cách tính điểm: [Cộng dồn] or [Điểm vòng riêng]
  * Hệ số nhân: [x1.0], [x1.5], or [x2.0]
  * Giới hạn điểm: [Max Round Score: N] or [Không giới hạn]
  * Trạng thái loại: [Loại trực tiếp: Top N] or [Không loại]
* **Rationale**: Đảm bảo mọi người xem đều hiểu rõ luật chơi đang được áp dụng cho vòng đấu đang hiển thị mà không cần vào phần Settings.
* **Example**: A horizontal flex row with subtle light-blue background and elegant spacing containing informative icons.
* **Edge Cases**: If no custom rules are configured for the active round, the banner MUST state: "Thể thức chuẩn: Tính điểm cộng dồn, hệ số mặc định".
* **Compliance Criteria**: Dynamic text formatting updates instantly when the user switches between rounds.

### RULE-049: Structural Dynamic Cutoff Line
* **Purpose**: Phân định ranh giới sinh tử trực quan giữa nhóm đi tiếp (Qualified) và nhóm bị loại (Eliminated).
* **Requirement**: The Leaderboard table MUST render a physical, solid, high-contrast horizontal divider line (Cutoff Line) directly between the last qualifying rank and the first eliminated rank. This line MUST span the entire width of the table.
* **Rationale**: Giúp VĐV và khán giả nhìn thấy ngay lập tức ranh giới loại trừ mà không cần tự đếm dòng thủ công.
* **Example**: `<tr id="leaderboard-cutoff-line" className="border-t-4 border-red-500 bg-red-950/20"><td colSpan={100} className="text-center text-xs font-bold py-1.5 text-red-400">--- RANH GIỚI LOẠI (TOP 16 ĐI TIẾP) ---</td></tr>`
* **Edge Cases**: The Cutoff Line MUST NOT render if the selected round has `isElimination` set to false, or if there is no qualification rule active. It MUST adjust position dynamically if search filters reduce the visible rows, while retaining its original calculation context.
* **Compliance Criteria**: Cutoff position is calculated purely from the `roundResults` or dynamic rule values (e.g. at index N), never hardcoded.

### RULE-050: Floating Emergency Solo Alert Widget
* **Purpose**: Cảnh báo tức thì cho ban tổ chức và trọng tài về các trận đấu phụ quyết định.
* **Requirement**: If the Firestore collection indicates that there are active pending Solo shootoffs (using `pendingSoloIds` array metadata), a prominent pulsing alert card MUST be displayed directly above the Leaderboard component.
* **Rationale**: Trận đấu Solo Shootoff diễn ra rất nhanh và cần sự tập trung tuyệt đối của tất cả trọng tài để hoàn tất thủ tục nhập điểm trước khi giải đấu có thể tiếp tục.
* **Example**: `<div id="emergency-solo-alert" className="animate-pulse bg-red-950 border border-red-800 text-red-200 rounded-xl p-4 mb-4 flex items-center justify-between">` with a "🚨 ĐANG CHỜ SOLO SHOOTOFF" bold label.
* **Edge Cases**: This widget MUST remain sticky to the top of the viewport when the user scrolls down the long leaderboard list.
* **Compliance Criteria**: Alert visibility is tightly bound to `pendingSoloIds.length > 0` condition in real-time.

### RULE-051: Floating Emergency Resolo Alert Widget
* **Purpose**: Cảnh báo khẩn cấp các trận đấu phụ cho đồng đội (Resolo).
* **Requirement**: If the Firestore collection indicates that there are active pending Resolo matches (using `pendingResoloIds` array metadata), a prominent pulsing alert card MUST be displayed directly above the Leaderboard component.
* **Rationale**: Tương tự như Solo cá nhân, các trận đấu Resolo ảnh hưởng trực tiếp đến ranh giới loại của bảng xếp hạng đồng đội và cần được giải quyết khẩn cấp.
* **Example**: A violet-themed alert bar labeled "🚨 ĐANG CHỜ TIẾN HÀNH RESOLO ĐỒNG ĐỘI" with an action button to navigate directly to the Resolo entry screen.
* **Edge Cases**: If both Solo and Resolo are pending simultaneously, the widget MUST stack them vertically or combine them with a clear counter: "Có 2 trận đấu phụ đang chờ giải quyết (1 Solo, 1 Resolo)".
* **Compliance Criteria**: Bound to the active snapshot of the tournament team metadata collection.

### RULE-052: Athlete Status Badge Priority System
* **Purpose**: Phân loại trạng thái thi đấu của VĐV bằng màu sắc và văn bản chuẩn hóa.
* **Requirement**: Each athlete row in the Leaderboard MUST display an explicit Status Badge matching their current standing, using the following color codes:
  * **Qualified** (Đi tiếp): Emerald badge (`bg-emerald-500/10 text-emerald-400 border-emerald-500/20`)
  * **Boundary** (Ranh giới): Amber badge (`bg-amber-500/10 text-amber-400 border-amber-500/20`)
  * **Solo/Resolo** (Đấu phụ): Violet badge (`bg-violet-500/10 text-violet-400 border-violet-500/20`)
  * **Eliminated** (Bị loại): Dark Grey badge (`bg-slate-800 text-slate-400 border-slate-700`)
* **Rationale**: Giúp người xem nhận diện nhanh chóng số phận của từng VĐV chỉ bằng cách lướt mắt qua màu sắc.
* **Example**: A custom badge element: `<span className="px-2.5 py-1 text-xs font-bold rounded-full border ...">`
* **Edge Cases**: A VĐV with status "Solo" or "Resolo" MUST have highest visual priority and flash gently to indicate they are actively competing in a tie-breaker.
* **Compliance Criteria**: Badge styling classes are resolved dynamically through a utility function (`getAthleteStatusBadge(athlete)`) in `/src/utils.ts`.

### RULE-053: Athlete Rank Number Highlighting
* **Purpose**: Tôn vinh các vị trí dẫn đầu giải đấu.
* **Requirement**: The rank column (first column) of the Leaderboard MUST style the top three positions with special trophy indicators or high-contrast backgrounds:
  * Rank 1: Gold Badge/Text (`#F59E0B` or a customized gold crown icon).
  * Rank 2: Silver Badge/Text (`#94A3B8` or a silver circle).
  * Rank 3: Bronze Badge/Text (`#B45309` or a bronze circle).
* **Rationale**: Tạo động lực thi đấu cho VĐV và làm nổi bật tiêu điểm bảng xếp hạng trên các màn hình hiển thị công cộng.
* **Example**: Replacing standard rank number "1" with a gold cup icon followed by a bold `#1`.
* **Edge Cases**: If there is a tie at rank 1, both athletes MUST render with Gold styling; the subsequent rank will skip to Rank 3.
* **Compliance Criteria**: Highlighting is applied strictly to calculated rank indices 1, 2, and 3.

### RULE-054: Sticky Table Header Enforcement
* **Purpose**: Đảm bảo người dùng luôn biết rõ các cột điểm số tương ứng với vòng nào khi cuộn danh sách dài.
* **Requirement**: The table head (`<thead>`) element of the Leaderboard MUST be styled with `sticky top-0 z-10` and have a solid, opaque background color matching the surface card background.
* **Rationale**: Ngăn chặn tình trạng các tiêu đề cột bị cuộn mất khi người dùng xem đến các VĐV ở thứ hạng 50 trở đi.
* **Example**: `<thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10">`
* **Edge Cases**: On mobile, the sticky header height MUST be accounted for to prevent overlapping with the bottom navigation bar or top safe area.
* **Compliance Criteria**: Scrolling the table body keeps the column titles perfectly locked at the absolute top of the table viewport.

### RULE-055: Real-time Snapshot Delta Highlight
* **Purpose**: Minh họa sự thay đổi thứ hạng tức thì khi có điểm số mới được ghi nhận.
* **Requirement**: When an athlete's rank or score updates in real-time from a Firestore snapshot, the modified table row MUST flash a soft green overlay (`bg-emerald-500/10`) for exactly 1.5 seconds, then smoothly fade back to its default transparent state.
* **Rationale**: Giúp người điều hành giải đấu nhận biết ngay bệ bắn nào vừa hoàn tất ghi điểm mà không cần căng mắt dò tìm.
* **Example**: Incorporating CSS keyframes animation `row-flash` triggered by checking row update timestamp keys.
* **Edge Cases**: If multiple rows update simultaneously, all modified rows MUST flash independently without causing rendering lags.
* **Compliance Criteria**: Flash effect is implemented via clean CSS transitions; no expensive re-render loops are introduced.

### RULE-056: High-Contrast Search and Filter Bar
* **Purpose**: Cho phép trọng tài và khán giả lọc tìm VĐV nhanh nhất.
* **Requirement**: The Leaderboard MUST include a highly responsive search input field with an attached Lucide search icon. Typing in this field MUST instantly filter rows by Athlete Name or Athlete Code (ID) with zero latency.
* **Rationale**: Rút ngắn thời gian tra cứu thành tích của một VĐV cụ thể trong một danh sách khổng lồ gồm hàng trăm người.
* **Example**: `<input type="text" placeholder="Tìm tên hoặc mã VĐV..." className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200" />`
* **Edge Cases**: The search filter MUST be case-insensitive and handle accented Vietnamese characters gracefully (normalize strings before comparison).
* **Compliance Criteria**: Filter operations execute in under 10ms on a client-side dataset of 500 athletes.

### RULE-057: Tie-Breaker Visual Indicator
* **Purpose**: Thể hiện rõ lý do một VĐV xếp trên VĐV khác khi họ có cùng tổng điểm số.
* **Requirement**: When two or more athletes have the exact same total score, the Leaderboard MUST display a small informational indicator (such as a gray "T" badge or footnote) representing that their rank position is resolved via standard tie-breaker logic (e.g. higher single round score, count of 10s, or Solo shootoff).
* **Rationale**: Tránh khiếu nại từ VĐV hoặc huấn luyện viên khi thấy hai người bằng điểm nhau nhưng thứ tự xếp hạng lại khác nhau.
* **Example**: A subtle icon next to the score displaying a tooltip on hover explaining: "Xếp trên nhờ điểm vòng phụ cao hơn".
* **Edge Cases**: If the tie is unresolved and pending Solo shootoff, both rows MUST display the pulsing "Solo" status badge.
* **Compliance Criteria**: Row metadata displays a tie indicator when score equality with adjacent rows is detected.

### RULE-058: Column Visibility Adaptability
* **Purpose**: Ngăn chặn tình trạng vỡ bảng điểm trên các thiết bị màn hình nhỏ.
* **Requirement**: The Leaderboard table columns MUST adjust visibility reactively. The columns: Rank, Name, and Total Score MUST always remain visible. Individual round scores (V1, V2, V3, etc.) and detail metrics MUST be hidden on screens < 640px and only display on screens >= 768px.
* **Rationale**: Giữ cho bảng điểm luôn cân đối, chữ không bị tràn viền hoặc thu nhỏ quá mức trên màn hình điện thoại.
* **Example**: Use Tailwind classes `hidden md:table-cell` on individual round columns.
* **Edge Cases**: Users on mobile MUST be able to tap a row to expand a mini-card displaying the hidden individual round scores.
* **Compliance Criteria**: Responsive table layout scales smoothly down to 320px viewport width without breaking cell bounds.

### RULE-059: Dynamic Row Background Striping
* **Purpose**: Tăng cường khả năng đọc lướt qua các dòng dữ liệu sát nhau.
* **Requirement**: The Leaderboard rows MUST use alternating zebra background striping. Odd rows SHALL use a slightly darker or tinted surface color compared to even rows.
* **Rationale**: Giúp mắt người xem định vị dòng chính xác, không bị đọc lệch hàng khi xem bảng điểm rộng nhiều cột.
* **Example**: `className="even:bg-slate-900/50 odd:bg-slate-900/20 hover:bg-slate-800/40"`
* **Edge Cases**: Striping MUST NOT override special highlights like top 3 ranks, dynamic cutoff lines, or flashing updates.
* **Compliance Criteria**: Rows render with a distinct 5% lightness difference between alternating items.

### RULE-060: Cumulative vs Single Round Score Display Toggle
* **Purpose**: Cho phép khán giả chuyển đổi góc nhìn thành tích.
* **Requirement**: When a specific round is selected, the Leaderboard MUST provide a secondary visual control to switch the score column between: "Điểm Vòng Này" and "Tổng Cộng Dồn" (nếu vòng này được cấu hình cộng dồn).
* **Rationale**: Giúp người xem so sánh trực tiếp phong độ của VĐV trong riêng vòng đấu hiện tại với tổng điểm tích lũy của họ từ đầu giải.
* **Example**: A segmented control switch with options: [Tổng điểm] [Điểm V1].
* **Edge Cases**: Switching this view mode MUST NOT trigger any database write; it is purely a local frontend map of pre-fetched scores.
* **Compliance Criteria**: UI rendering of score values switches instantly on user click with zero computation lag.

### RULE-061: Automatic Paging for Unattended Displays
* **Purpose**: Hỗ trợ trình chiếu bảng xếp hạng tự động tại các khu vực sảnh chờ giải đấu.
* **Requirement**: The Leaderboard MUST include an optional "Auto-Scroll" or "Auto-Page" toggle. When activated, the list MUST automatically scroll downward by page height every 10 seconds, and wrap back to the top once the end of the list is reached.
* **Rationale**: Cho phép trình chiếu bảng điểm liên tục trên các màn hình TV treo tường mà không cần có người đứng tương tác, điều khiển.
* **Example**: A play/pause floating button with a circular countdown progress indicator.
* **Edge Cases**: Interactive user scrolling MUST temporarily pause the auto-paging timer for 30 seconds before resuming automatically.
* **Compliance Criteria**: Auto-paging utilizes high-performance browser animation intervals or timeouts without locking the UI thread.

### RULE-062: Virtual High-Contrast Print Mode Support
* **Purpose**: Đảm bảo bảng xếp hạng hiển thị hoàn hảo khi được in ra giấy để dán lên bảng thông báo vật lý.
* **Requirement**: The Leaderboard view MUST incorporate CSS media print queries to automatically hide all navigation elements, background colors, and action buttons, converting the table to high-contrast black text on a pure white background upon triggering the browser print dialog.
* **Rationale**: Tiết kiệm mực in và đảm bảo bảng xếp hạng giấy rõ nét nhất cho các trọng tài và VĐV ký xác nhận kết quả.
* **Example**: `@media print { body { background: white; color: black; } #sidebar, #navigation, .btn { display: none; } }`
* **Edge Cases**: The dynamic cutoff line MUST print as a thick, solid black line to maintain structural information.
* **Compliance Criteria**: Pressing Ctrl+P displays a perfectly formatted, single or multi-page table optimized for standard A4 paper size.

### RULE-063: Athlete Profile Quick-View Modal
* **Purpose**: Xem chi tiết lịch sử thi đấu của một VĐV mà không cần chuyển trang.
* **Requirement**: Clicking on any athlete row in the Leaderboard MUST open an eye-safe overlay Modal displaying the athlete's full profile: Họ tên, Mã VĐV, Đơn vị/Đội, Chi tiết điểm số của từng mũi bắn tại tất cả các vòng, và biểu đồ phong độ đường thẳng (line chart).
* **Rationale**: Cung cấp thông tin chuyên sâu cho huấn luyện viên và khán giả khi cần phân tích kỹ chiến thuật thi đấu của một VĐV.
* **Example**: An Obsidian-themed overlay modal with a blurred background (`backdrop-blur-sm`).
* **Edge Cases**: The modal MUST be fully closeable via clicking outside, pressing the Esc key, or tapping a prominent "X" close button in the top right.
* **Compliance Criteria**: Modal implementation utilizes accessible portal components (`@radix-ui/react-dialog` or similar) with correct ARIA bindings.

### RULE-064: Dynamic Score Font Sizing
* **Purpose**: Giữ cho điểm số luôn nổi bật và không bao giờ bị cắt ngắn hoặc tràn ô.
* **Requirement**: Athlete score numbers in table cells MUST be rendered inside a fixed-width container using a monospace font family, and use responsive font sizes that automatically shrink on smaller screens.
* **Rationale**: Điểm số là dữ liệu cốt lõi nhất của Leaderboard và không được phép bị che khuất bởi bất kỳ lỗi CSS nào.
* **Example**: `className="font-mono text-base sm:text-lg font-bold text-slate-100"`
* **Edge Cases**: If a VĐV achieves a perfect score (e.g., 60/60), the number container MUST include a subtle golden outline or fire effect animation.
* **Compliance Criteria**: Score containers possess explicit styling properties ensuring overflow-hidden and text-ellipsis if boundaries are breached.

### RULE-065: Hybrid Leaderboard Sidebar Mode
* **Purpose**: Hỗ trợ chế độ hiển thị song song bảng xếp hạng cá nhân và đồng đội trên màn hình rộng.
* **Requirement**: When the viewport width is >= 1280px (xl breakpoint) and the user enables "Chế độ Hybrid", the screen MUST split into a 65% main panel displaying the Individual Leaderboard, and a 35% side panel displaying the Team Leaderboard.
* **Rationale**: Ban giám sát giải đấu cần so sánh trực tiếp tác động của điểm số cá nhân lên vị trí xếp hạng đồng đội của họ trong thời gian thực.
* **Example**: A dual-grid layout wrapper activated by a persistent header switch.
* **Edge Cases**: If the screen size drops below 1280px, the layout MUST automatically collapse to single tab view mode with standard tab selection.
* **Compliance Criteria**: Split-view transitions are fluid and execute without rendering duplicate Firestore subscription events.

---

## CHAPTER 6: TEAM LEADERBOARD RULES

### RULE-066: Complete Synchronization with Individual Scores
* **Purpose**: Đảm bảo tính nhất quán tuyệt đối về mặt dữ liệu trên toàn hệ thống.
* **Requirement**: The Team Leaderboard MUST compute team scores dynamically in real-time by aggregating the active scores of its primary members from the individual athlete collections. It MUST NOT store duplicate static scores in the database.
* **Rationale**: Loại bỏ hoàn toàn nguy cơ lệch điểm giữa bảng xếp hạng cá nhân và đồng đội khi có quyết định sửa điểm hoặc hủy kết quả bắn.
* **Example**: Team total calculation loop: `teamScore = activeMembers.reduce((sum, m) => sum + m.totalScore, 0)`.
* **Edge Cases**: If an individual athlete is disqualified or removed from the tournament, their contribution MUST be instantly subtracted from the team's total score in the next render frame.
* **Compliance Criteria**: Team ranking matches the exact mathematical aggregation of its member rankings in the Individual Leaderboard.

### RULE-067: Dynamic Cutoff Line for Teams
* **Purpose**: Xác định rõ ràng các đội vượt qua vòng loại hoặc bước vào lượt đấu đồng đội trực tiếp.
* **Requirement**: The Team Leaderboard MUST display a high-contrast horizontal divider line representing the team qualification boundary (e.g., Top 4 or Top 8 teams đi tiếp), calculated dynamically from the tournament rules.
* **Rationale**: Giúp các đội theo dõi bám đuổi vị trí đi tiếp trực quan nhất.
* **Example**: A purple-tinted horizontal bar with explicit label "--- KHU VỰC ĐI TIẾP ĐỒNG ĐỘI (TOP 4) ---".
* **Edge Cases**: If the tournament settings do not specify team elimination rules, the cutoff line MUST be completely hidden.
* **Compliance Criteria**: Cutoff position dynamically tracks team ranks and aligns with configuration data bounds.

### RULE-068: Expand Team Row Drawer
* **Purpose**: Cho phép xem danh sách thành viên chi tiết ngay trên hàng của đội.
* **Requirement**: Clicking on a team row in the Team Leaderboard MUST slide open an inner collapsible drawer directly below the row, displaying the names, ranks, and individual scores of all members belonging to that team.
* **Rationale**: Giúp người xem biết được ai là người đóng góp nhiều điểm nhất cho đội mà không cần phải thoát ra ngoài để tra cứu bảng cá nhân.
* **Example**: A nested table row using smooth transition height animation (`transition-all duration-300`).
* **Edge Cases**: Open drawers MUST NOT be closed automatically when another team row is clicked, unless the user has opted for the "Single-Expanded" preference.
* **Compliance Criteria**: Collapsible section is rendered inside the table markup as a clean sub-row spanning all columns.

### RULE-069: Primary vs Reserve Member Distinction
* **Purpose**: Hiển thị rõ vai trò và quyền đóng góp điểm số của từng thành viên trong đội.
* **Requirement**: The expanded team drawer MUST explicitly label each member's role:
  * Primary Member (VĐV Chính thức - Green badge, score counts toward team total).
  * Reserve Member (VĐV Dự bị - Grey badge, score is displayed but excluded from team total).
* **Rationale**: Tuân thủ luật thi đấu thể thao chuyên nghiệp về việc chỉ tính điểm của 3 thành viên chính thức được đăng ký trước.
* **Example**: Labels "Chính thức" and "Dự bị" placed next to the names with corresponding opacity settings.
* **Edge Cases**: If an athlete is promoted from reserve to primary, the Team Leaderboard score calculations MUST swap their contribution values instantly.
* **Compliance Criteria**: Exclusions in sum calculations strictly check the member role metadata attribute.

### RULE-070: Team Score Calculation Formula Display
* **Purpose**: Minh bạch hóa cách tính tổng điểm cho khán giả và các đội tự kiểm tra.
* **Requirement**: The Team Leaderboard table head or card header MUST include an informative footnote or tooltip displaying the active team formula (e.g., "Tổng điểm đồng đội = Điểm VĐV 1 + Điểm VĐV 2 + Điểm VĐV 3").
* **Rationale**: Tránh thắc mắc về cách tính điểm khi một đội có nhiều hơn 3 thành viên đăng ký trong danh sách.
* **Example**: A small info icon next to the team score column header that triggers a micro-popup.
* **Edge Cases**: If a team has fewer than the required primary members, the formula area MUST highlight: "Đội chưa đủ thành viên chính thức (Đang thiếu N người)".
* **Compliance Criteria**: Formula description string adjusts dynamically to reflect tournament team size regulations.

### RULE-071: Team Hybrid View Mode Alignment
* **Purpose**: Duy trì sự đồng bộ bố cục khi chạy ở chế độ chia đôi màn hình (Split screen).
* **Requirement**: When rendered side-by-side with the Individual Leaderboard, the Team Leaderboard MUST automatically switch to its compact layout mode, hiding secondary columns (such as unit, member count, and individual round averages) to focus purely on: Rank, Team Name, and Total Score.
* **Rationale**: Giữ cho thông tin không bị xô lệch hoặc chồng chéo lên nhau khi không gian hiển thị bị thu hẹp.
* **Example**: Hiding columns dynamically via CSS media classes or react state bindings.
* **Edge Cases**: Clicking on a team row in compact split-screen mode MUST open the member list in an overlay popup instead of a drawer to prevent vertical stretching.
* **Compliance Criteria**: Interface adapts gracefully to widths as low as 350px.

### RULE-072: Highlight Member Contribution Leader
* **Purpose**: Tôn vinh thành viên có thành tích xuất sắc nhất trong mỗi đội.
* **Requirement**: In the expanded team member list, the athlete who contributed the highest score to the team's total MUST display a small gold star icon next to their name, and their score text MUST be styled with a bold emerald color.
* **Rationale**: Khuyến khích tinh thần thi đấu xuất sắc của cá nhân trong tập thể đồng đội.
* **Example**: A gold Lucide star icon next to the member's name.
* **Edge Cases**: If multiple members tie for the highest score, all tied members MUST receive the star icon.
* **Compliance Criteria**: Contribution leader is identified dynamically using a maximum score lookup algorithm within the member array.

### RULE-073: Safe Team Deletion Lock
* **Purpose**: Bảo vệ sự toàn vẹn của dữ liệu phân đội trên hệ thống.
* **Requirement**: Any action button to disband or delete a team in the administrative panels MUST be completely disabled and grayed out if the tournament has already commenced (at least one score submitted in the individual collection).
* **Rationale**: Việc xóa một đội giữa chừng giải đấu sẽ gây lỗi nghiêm trọng cho các bảng tính toán và báo cáo xếp hạng lịch sử.
* **Example**: Disabling button with hover tooltip "Không thể giải tán đội khi giải đấu đã bắt đầu".
* **Edge Cases**: If a team must be disqualified, their status MUST be changed to "DQ" instead of being physically deleted from the database.
* **Compliance Criteria**: The button disabled status checks the global score counter variable in Firestore.

### RULE-074: Team Representation Logo Support
* **Purpose**: Tăng cường tính chuyên nghiệp và nhận diện thương hiệu cho các đơn vị tham gia.
* **Requirement**: The Team Leaderboard rows MUST support rendering a small circular team representation icon or unit logo (size 24px x 24px) at the left of the Team Name. If no logo is uploaded, it MUST fallback to a clean, dual-character monogram containing the first letters of the team's name.
* **Rationale**: Tạo giao diện trực quan sinh động và dễ nhận diện giống các giải đấu thể thao điện tử chuyên nghiệp quốc tế.
* **Example**: `<div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400">HN</div>`
* **Edge Cases**: Image load failures MUST automatically degrade to the text monogram fallback without breaking the table layout.
* **Compliance Criteria**: Profile image component implements standard error handling (`onError` triggers monogram fallback).

### RULE-075: Team Solo/Resolo Tie-Breaker UI
* **Purpose**: Hiển thị rõ ràng các trận đấu súng phụ để giành quyền đi tiếp của đồng đội.
* **Requirement**: When a team enters a Resolo tie-breaker state, their row on the Team Leaderboard MUST be highlighted with a pulsing violet border, and the Rank column MUST display "RESOLO" instead of a numeric position.
* **Rationale**: Thu hút sự chú ý vào kịch tính của loạt đấu đồng đội trực tiếp.
* **Example**: `<tr className="animate-pulse border-y-2 border-violet-500 bg-violet-950/20 text-violet-200">`
* **Edge Cases**: Once the Resolo is completed, the row MUST smoothly transition back to standard styling within 3 seconds of the ranking recalculation.
* **Compliance Criteria**: Style changes are driven by the Team status attribute in Firestore.

---

## CHAPTER 7: SCORING RULES

### RULE-076: Trọng Tài Nhập Điểm - Mobile First Layout
* **Purpose**: Đảm bảo bảng nhập điểm cực kỳ dễ thao tác trên điện thoại di động và máy tính bảng ngoài sân bắn.
* **Requirement**: The scoring control interface MUST prioritize a mobile-first, single-column vertical layout. All interactive elements MUST be grouped within natural reach of the user's thumbs, avoiding top corners.
* **Rationale**: Trọng tài thường cầm điện thoại bằng một tay ngoài bệ bắn, cần giao diện dễ với tới để tránh mỏi tay và đánh rơi thiết bị.
* **Example**: A layout placing athlete selector at the top and the scoring grid directly in the middle and bottom sections.
* **Edge Cases**: On landscape screens, the layout MUST adapt to a split view placing the athlete card on the left and the scoring buttons on the right.
* **Compliance Criteria**: All touch elements are positioned within the lower 60% of the screen height on mobile viewports.

### RULE-077: Nút Nhập Điểm Tối Thiểu 56px (Fitts's Law)
* **Purpose**: Ngăn chặn tối đa việc bấm trượt hoặc bấm nhầm phím khi nhập điểm thi đấu dưới thời tiết khắc nghiệt.
* **Requirement**: Every numeric entry button (keys 0 to 10, and 'X' or 'M') on the custom scoring keypad MUST have a minimum physical touch target size of 56px x 56px, accompanied by a spacious gap of at least 8px between buttons.
* **Rationale**: Trọng tài ngoài trời nắng nóng, tay có thể có mồ hôi hoặc run, cần nút bấm lớn, cách xa nhau để đảm bảo độ chính xác tuyệt đối khi bấm.
* **Example**: `<button className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-xl bg-slate-800 text-lg font-bold">`
* **Edge Cases**: On small screen devices (width < 360px), the layout SHALL scale down to a minimum of 48px to prevent screen clipping, but MUST NOT go lower.
* **Compliance Criteria**: Visual check and CSS inspection verifies zero buttons with width/height attributes below 56px on standard screens.

### RULE-078: Trọng Tài Nhập Điểm Fast-Feedback Sound and Haptic
* **Purpose**: Cung cấp xác nhận cảm giác tức thì khi phím được bấm thành công.
* **Requirement**: Clicking any scoring key MUST trigger a micro-vibration feedback (Haptic Feedback using HTML5 Vibration API `window.navigator.vibrate(15)`) and a subtle, low-frequency audio tone (if enabled by user settings).
* **Rationale**: Giúp trọng tài nhận biết phím đã được ghi nhận mà không cần liên tục nhìn chằm chằm vào màn hình điện thoại, cho phép họ tập trung quan sát bia bắn.
* **Example**: `onClick={() => { window.navigator.vibrate(15); recordShot(value); }}`
* **Edge Cases**: Vibration MUST degrade gracefully with no console errors on devices that do not support the Vibration API (like iOS Safari in standard mode).
* **Compliance Criteria**: Vibrate API is safely guarded behind check condition `if ('vibrate' in navigator)` in the event handler.

### RULE-079: Instant Shot Score Undo Button
* **Purpose**: Cho phép trọng tài sửa sai nhanh nhất khi bấm nhầm phím.
* **Requirement**: The scoring interface MUST include a highly visible, distinct "Undo" (Hoàn tác) button positioned adjacent to the score input field. Clicking "Undo" MUST immediately erase the last entered shot value locally from the active draft array.
* **Rationale**: Cho phép trọng tài sửa lỗi gõ nhầm ngay tức thì trước khi lưu chính thức vào cơ sở dữ liệu.
* **Example**: A secondary neutral-styled button with a Lucide `RotateCcw` icon.
* **Edge Cases**: The Undo button MUST be disabled if the current athlete scorecard has no unsaved draft shots.
* **Compliance Criteria**: Clicking undo removes the last element of the temporary shot array state without triggering database transaction queries.

### RULE-080: Dual-Step Score Submission Guard
* **Purpose**: Ngăn chặn việc gửi nhầm bảng điểm chưa hoàn tất lên Tournament Engine.
* **Requirement**: Gửi điểm thi đấu MUST follow a strict dual-step process:
  1. Trọng tài click "Xác nhận & Lưu" (Button styled with primary brand color).
  2. A clean, non-intrusive bottom sheet or confirmation popover expands displaying a summary of the entered shots (e.g. "Ghi nhận: 9, 10, X. Tổng điểm lượt này: 29. Bạn có chắc chắn?"). Clicking "Xác nhận gửi" completes the database write.
* **Rationale**: Đảm bảo điểm số được kiểm duyệt thủ công bằng mắt một lần nữa bởi trọng tài trước khi ghi nhận vĩnh viễn vào hệ thống tính hạng.
* **Example**: A bottom-drawer overlay that blocks other interactions until confirmed or dismissed.
* **Edge Cases**: If the user taps outside the confirmation sheet, it MUST dismiss safely without deleting the draft shots.
* **Compliance Criteria**: Code contains explicit draft-to-final transition state management before calling Firestore service functions.

### RULE-081: Virtual Numpad Score Interceptor
* **Purpose**: Ngăn chặn bàn phím ảo của hệ điều hành tự động bật lên che khuất giao diện nhập điểm.
* **Requirement**: All score display inputs in the scoring view MUST set the HTML attribute `inputMode="none"` or `readOnly` to prevent native mobile keyboards from popping up, relying exclusively on the custom 56px scoring keypad.
* **Rationale**: Bàn phím mặc định của điện thoại (iOS/Android) chiếm 50% diện tích màn hình và che mất các nút thao tác nhanh quan trọng của ứng dụng.
* **Example**: `<input type="text" readOnly value={currentShots.join(' - ')} className="..." />`
* **Edge Cases**: If manual keyboard entry is absolutely necessary (e.g., typing athlete name during search), the input element MUST NOT have the `readOnly` property.
* **Compliance Criteria**: Tapping on score cells in the active scoring matrix does not trigger OS keyboard presentation on iOS or Android.

### RULE-082: Auto-Advance Athlete Selection
* **Purpose**: Tối ưu hóa tốc độ nhập điểm cho cả lượt bắn (end/round).
* **Requirement**: Upon successful score submission for the active athlete, the scoring interface MUST automatically select the next athlete in the target group sequence (e.g., Athlete B after Athlete A completes their turn).
* **Rationale**: Trọng tài không cần quay lại màn hình danh sách để chọn người tiếp theo, giúp đẩy nhanh tiến độ nhập điểm của cả bệ bắn.
* **Example**: Success callback updates `selectedAthleteId = getNextAthleteId(currentAthleteId)`.
* **Edge Cases**: If the current athlete is the last person in the group, the system MUST show a friendly notice: "Đã hoàn thành lượt bắn cho toàn bộ nhóm" and remain on the summary view.
* **Compliance Criteria**: Automatically switches focus and updates detail card to the next athlete index.

### RULE-083: Offline Score Buffer Queue
* **Purpose**: Bảo vệ dữ liệu điểm số khi đường truyền internet ngoài sân bắn chập chờn.
* **Requirement**: If the connection to Firestore is lost during score entry, the application MUST cache the submitted score locally inside `localStorage` using a secure JSON queue structure. Once the connection is restored, the client MUST automatically upload the buffered scores to the database.
* **Rationale**: Giải đấu bắn cung thường tổ chức ngoài trời rộng lớn, sóng 4G rất yếu. Trọng tài phải tiếp tục ghi điểm được bình thường mà không bị gián đoạn.
* **Example**: Appends score object to local storage array and flashes a status banner "Đang offline - Đang lưu trữ cục bộ N bảng điểm".
* **Edge Cases**: Buffered offline scores MUST be timestamped based on their actual creation time, NOT the upload time, to ensure accurate audit logs.
* **Compliance Criteria**: Turning off network connection in browser, submitting a score, turning connection back on updates Firestore with correct timestamp.

### RULE-084: Validation Alert for Out-of-Range Shots
* **Purpose**: Ngăn chặn nhập điểm vô lý do lỗi gõ phím.
* **Requirement**: The scoring keypad MUST disable or throw an instant visual error if a shot value violates the dynamic round limits configured in `DistanceConfig` (e.g. trying to enter an 11, or more arrows than permitted in a single end).
* **Rationale**: Bất kỳ điểm số sai lệch nào lọt vào cơ sở dữ liệu sẽ làm sai lệch nghiêm trọng bảng xếp hạng và cực kỳ khó khăn để phát hiện, sửa chữa sau đó.
* **Example**: Disabling key "10" if the target round is a simplified 3-arrow format and maximum score limit has been reached.
* **Edge Cases**: Special archery scores like "X" (perfect ten) and "M" (miss) MUST be translated correctly into numerical scores (e.g., X counts as 10) by the backend engine, while the UI retains their visual representations.
* **Compliance Criteria**: Form validator runs an assertion loop `isValidShot(value)` on keydown/click.

### RULE-085: Emergency Solo Score Entry Mode
* **Purpose**: Chuyển đổi giao diện nhập điểm sang thể thức đối đầu 1-1 trực tiếp khi có Solo Shootoff.
* **Requirement**: When a Solo shootoff is activated, the scoring screen MUST display a side-by-side vertical split view comparing the two tied athletes. Trọng tài MUST enter their shootoff shots sequentially (Athlete A shoots 1 arrow, then Athlete B shoots 1 arrow).
* **Rationale**: Phản ánh chính xác tâm lý và tiến trình thi đấu kịch tính của loạt đấu súng phụ trực tiếp dưới sự giám sát của khán giả.
* **Example**: Left column for Athlete A, right column for Athlete B with giant active indicator markers showing whose turn it is to shoot.
* **Edge Cases**: Shoot-off arrows MUST continue until the tie is mathematically broken based on tournament rules, meaning the grid MUST expand dynamically to accept extra arrows.
* **Compliance Criteria**: Activated automatically when selecting a pending Solo ID from the Emergency Widget.

### RULE-086: Real-Time Scorecard Progress Grid
* **Purpose**: Minh họa trạng thái hoàn thành lượt bắn của VĐV.
* **Requirement**: The scorecard header MUST display a progress grid of small squares representing each scheduled arrow in the active round (e.g., 6 boxes for a 6-arrow end). As scores are entered, the boxes fill in with high-contrast numbers; empty boxes remain outlined in grey.
* **Rationale**: Giúp trọng tài biết chính xác VĐV còn thiếu bao nhiêu mũi bắn chưa nhập điểm mà không cần đếm nhẩm.
* **Example**: A list of 6 circles with values: `[10] [9] [X] [ ] [ ] [ ]`.
* **Edge Cases**: If the round configuration allows an unlimited or variable number of arrows, the grid MUST render dynamically based on actual entries plus one empty box.
* **Compliance Criteria**: Grid size and layout strictly adapt to the round parameter `arrowsPerEnd` or `maxArrows`.

### RULE-087: Multi-User Score Collision Warning
* **Purpose**: Ngăn chặn tình trạng hai trọng tài ghi đè điểm số của nhau trên cùng một VĐV.
* **Requirement**: Before executing a score write to Firestore, the scoring page MUST check if the target scorecard document has been updated by another user since it was loaded. If a collision is detected, the UI MUST display a blocking modal displaying the two conflicting scores and ask: "Sử dụng điểm số của bạn hay chấp nhận điểm số mới từ Trọng tài khác?".
* **Rationale**: Tránh hiện tượng mất dữ liệu điểm số khi nhiều trọng tài cùng truy cập và sửa điểm của một bệ bắn.
* **Example**: Using a firestore transaction wrapper or comparing document version/timestamp keys.
* **Edge Cases**: Collision checks MUST NOT lock the app if the network connection is slow; the local change MUST remain cached with clear sync indicators.
* **Compliance Criteria**: Simulated simultaneous writes on the same athlete record successfully trigger the collision warning dialog.

---

---

## CHAPTER 8: LIVEBOARD RULES

### RULE-088: Full-Screen Cinematic TV Mode Layout
* **Purpose**: Tối ưu hóa giao diện hiển thị bảng điểm trực tiếp trên màn hình LED lớn ngoài sân đấu.
* **Requirement**: The Liveboard MUST support a distraction-free, full-screen cinematic mode that automatically hides all browser chrome, navigation menus, and footers when active, leaving 100% of the viewport dedicated to rankings and scoreboards.
* **Rationale**: Khán giả ở khán đài cần nhìn rõ bảng xếp hạng trên màn hình LED lớn mà không bị phân tâm bởi các thành phần điều hướng quản trị.
* **Example**: `<div id="liveboard-fullscreen" className="fixed inset-0 bg-slate-950 z-50 overflow-hidden select-none">`
* **Edge Cases**: Exiting full-screen mode MUST be easily achievable by pressing the Esc key or tapping a hidden close button in the top corner.
* **Compliance Criteria**: Cinematic view completely fills a 1920x1080 screen without showing scrollbars or navigation rails.

### RULE-089: Extreme Contrast Ratio for High Ambient Light
* **Purpose**: Đảm bảo bảng điểm hiển thị sắc nét dưới ánh nắng mặt trời trực tiếp.
* **Requirement**: The Liveboard visual theme MUST utilize deep obsidian black backgrounds (`#020617`) paired with high-luminance, saturated text colors (Emerald `#10B981` or Gold `#F59E0B`). The contrast ratio MUST exceed 7:1.
* **Rationale**: Bảng điểm ngoài trời thường bị lóa do ánh nắng gắt, đòi hỏi độ tương phản màu sắc cực đại để mắt thường có thể phân biệt được điểm số từ khoảng cách xa.
* **Example**: `<span className="text-emerald-400 font-bold drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]">`
* **Edge Cases**: Muted or thin text MUST NOT be used for score representations under any circumstances.
* **Compliance Criteria**: Contrast validation reports 100% compliance with WCAG AAA standards for all key text nodes.

### RULE-090: Auto-Scrolling Carousel with Zero Jitter
* **Purpose**: Duy trì hiển thị mượt mà toàn bộ danh sách VĐV khi bảng điểm quá dài.
* **Requirement**: When athlete count exceeds screen capacity (usually > 10 rows on TV displays), the Liveboard MUST automatically scroll through pages using a seamless CSS animation carousel, running with exactly 60 FPS and zero frame drops or visual jitter.
* **Rationale**: Đảm bảo tất cả VĐV đều có cơ hội hiển thị thành tích công bằng trên màn hình lớn mà không cần thao tác thủ công.
* **Example**: CSS translation loop: `transform: translateY(-100%)` with a transition duration of 1000ms.
* **Edge Cases**: The carousel MUST pause automatically for 15 seconds if any score updates, highlighting the newly updated row in place before resuming.
* **Compliance Criteria**: Carousel transition is handled via GPU-accelerated hardware layers (`transform: translate3d`) for ultra-smooth performance.

### RULE-091: Highlight Multiplier / Scaling Rule Badges
* **Purpose**: Giúp người xem nắm bắt ngay luật tính điểm đặc biệt của vòng đang thi đấu.
* **Requirement**: The Liveboard header MUST feature a prominent, high-visibility visual badge indicating the active round rules (e.g., "VÒNG 3: NHÂN HỆ SỐ x1.5", "VÒNG CHUNG KẾT: LOẠI TRỰC TIẾP").
* **Rationale**: Khán giả mới đến có thể hiểu ngay tại sao điểm số của một VĐV tăng lên nhanh chóng hoặc tại sao thứ tự xếp hạng có biến động lớn.
* **Example**: A large golden banner with a pulsing outer glow containing the active round metadata summary.
* **Edge Cases**: If no multiplier or special rules apply, the badge MUST display "THỂ THỨC THI ĐẤU CHUẨN" in high-contrast silver.
* **Compliance Criteria**: Rule badge adapts in real-time based on the active round configuration state in Firestore.

### RULE-092: Real-Time Sync Indicator for Liveboard
* **Purpose**: Đảm bảo độ tin cậy của thông tin hiển thị trên bảng điểm trực tiếp.
* **Requirement**: The Liveboard corner MUST display a subtle but clear real-time sync status widget containing a green heartbeat pulse indicating active connection to the database.
* **Rationale**: Giúp kỹ thuật viên giải đấu phát hiện lập tức nếu màn hình trình chiếu bị rớt mạng và đang hiển thị bảng điểm đóng băng.
* **Example**: A pulsing circular icon representing "DATABASE: CONNECTED".
* **Edge Cases**: If disconnect occurs, the pulse MUST turn red instantly and display a prominent warning banner: "MẤT KẾT NỐI - LIÊN HỆ KỸ THUẬT".
* **Compliance Criteria**: Heartbeat widget actively listens to Firestore connectivity state and online event listeners.

### RULE-093: Dynamic Solo Shoot-off Mode Split View
* **Purpose**: Tôn vinh kịch tính của các lượt đấu phụ quyết định.
* **Requirement**: When a Solo tie-breaker is active, the Liveboard MUST automatically transform into a high-impact, split-screen duel interface focusing exclusively on the two tied athletes, displaying their profiles side-by-side with large-format arrow shot counters.
* **Rationale**: Tạo bầu không khí sôi nổi, kịch tính giống các giải đấu chuyên nghiệp và thu hút sự chú ý của toàn bộ khán đài vào loạt bắn súng phụ quyết định.
* **Example**: Displaying the two duelists taking up 50% width each, with a central "SOLO SHOOTOFF" flashing title.
* **Edge Cases**: Standard leaderboards are completely hidden during this duel mode to maximize visual drama.
* **Compliance Criteria**: Triggered automatically when Firestore indicates pending solo matches are actively being scored.

### RULE-094: Font Size Scaling Guard for Numbers
* **Purpose**: Đảm bảo các chỉ số điểm số luôn rõ ràng ở mọi khoảng cách quan sát.
* **Requirement**: Score numbers on the Liveboard MUST be rendered at a minimum size of `text-3xl` on standard displays and use monospace font families exclusively to ensure perfect column alignment.
* **Rationale**: Điểm số bị co giãn hoặc lún phông chữ sẽ khiến khán giả từ xa không thể theo dõi chính xác thành tích của VĐV.
* **Example**: `<div className="font-mono text-4xl font-extrabold text-amber-400">98</div>`
* **Edge Cases**: Long names or units MUST truncate with ellipsis before encroaching on the score display area.
* **Compliance Criteria**: monospaced font alignment verified across all viewport sizes.

### RULE-095: Flash Row Animation on Score Update
* **Purpose**: Tạo điểm nhấn trực quan sinh động khi có thay đổi thứ hạng trực tiếp.
* **Requirement**: When a scorecard update changes an athlete's position on the Liveboard, their row MUST trigger a soft scale-up and high-luminance gold flash animation, sliding smoothly to its new position.
* **Rationale**: Tạo sự tương tác sống động, giúp khán giả nắm bắt diễn biến giải đấu giống như xem thể thao điện tử trên truyền hình.
* **Example**: Using CSS transition animation combined with React state reordering loops.
* **Edge Cases**: If dozens of athletes update simultaneously, the animation layout MUST optimize to render only the top 5 updates to prevent browser layout thrashing.
* **Compliance Criteria**: Row transitions execute smoothly with a rendering delay of under 50ms.

### RULE-096: Screen Saver and Inactive Display State
* **Purpose**: Bảo vệ tấm nền màn hình LED trình chiếu khỏi hiện tượng lưu ảnh (burn-in).
* **Requirement**: If there is no activity or score change recorded in the database for 15 continuous minutes, the Liveboard MUST dim its brightness by 50% or fade into an animated ambient screensaver displaying the tournament logo.
* **Rationale**: Tiết kiệm năng lượng và tăng tuổi thọ của các thiết bị hiển thị công cộng có giá trị cao ngoài sân đấu.
* **Example**: A full-screen backdrop overlay fading in smoothly on idle detection.
* **Edge Cases**: The screensaver MUST automatically and instantly deactivate the millisecond any database write or user interaction occurs.
* **Compliance Criteria**: Implements standard window idle timer logic inside a high-level React Hook.

### RULE-097: Dynamic Layout Scaling for LED Walls
* **Purpose**: Đảm bảo bảng điểm tương thích tốt với các cấu hình tỉ lệ màn hình Led dị biệt ngoài thực tế.
* **Requirement**: The Liveboard viewport structure MUST utilize modern flex and grid percentage layout configurations rather than hardcoded pixel bounds, ensuring perfect scaling on 16:9, 16:10, or custom widescreen LED configurations.
* **Rationale**: Các bức tường LED ghép ngoài sân đấu thường có độ phân giải không chuẩn, layout linh hoạt sẽ tránh được hiện tượng bị bóp méo hoặc mất lề.
* **Example**: Using aspect ratio scaling wrappers (`aspect-video` or dynamic flex layouts).
* **Edge Cases**: On extremely narrow LED banners, secondary text layers MUST automatically drop out to preserve score clarity.
* **Compliance Criteria**: Perfect display confirmed across standard resolutions (1080p, 4K) and custom LED processor bounds.

---

## CHAPTER 9: MOBILE RULES

### RULE-098: Mobile Safe-Zone Padding Bounds
* **Purpose**: Đảm bảo toàn bộ nội dung hiển thị an toàn trên màn hình điện thoại di động có tai thỏ hoặc bo góc tròn.
* **Requirement**: The outer wrapper container on mobile layouts MUST apply safe-area-inset padding on all four sides (`px-[safe-area-inset-left]` and `pb-[safe-area-inset-bottom]`).
* **Rationale**: Tránh hiện tượng nội dung hoặc các nút điều hướng cốt lõi bị che lấp bởi các chi tiết thiết kế phần cứng của điện thoại thông minh hiện đại.
* **Example**: `<div className="min-h-screen px-4 pb-[env(safe-area-inset-bottom,16px)]">`
* **Edge Cases**: Horizontal orientations MUST expand left/right safe zone paddings to prevent sidebar collision with cameras.
* **Compliance Criteria**: Perfect visual alignment verified across simulation profiles for iPhone 14 Pro and Samsung Galaxy S23.

### RULE-099: Bottom Navigation Bar Target Bounds
* **Purpose**: Tối ưu hóa khả năng thao tác một tay cực nhanh của người dùng di động.
* **Requirement**: On mobile viewports, the application MUST hide the sidebar navigation rail and replace it with a fixed bottom navigation bar with a physical height of exactly 64px, containing equal spacing for active tabs.
* **Rationale**: Hầu hết mọi người dùng di động đều cầm điện thoại bằng một tay và điều khiển bằng ngón cái; thanh điều hướng dưới đáy là khu vực dễ tiếp cận nhất.
* **Example**: `<nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around z-40 lg:hidden">`
* **Edge Cases**: Liveboard view is exempt from bottom navigation rendering.
* **Compliance Criteria**: Navigation switches to bottom shell seamlessly when window size is detected < 1024px.

### RULE-100: Scroll Containment on Mobile Shell
* **Purpose**: Ngăn chặn hiện tượng cuộn kép bực bội trên điện thoại di động.
* **Requirement**: The main body wrapper on mobile layouts MUST have a height locked at exactly `100vh` or `100dvh` combined with `overflow-hidden`. Only the designated inner content panels are permitted to scroll vertically.
* **Rationale**: Loại bỏ hiện tượng thanh địa chỉ trình duyệt tự động co giãn liên tục khi người dùng vuốt cuộn danh sách điểm, cải thiện sự tập trung tối đa.
* **Example**: `<main className="h-[calc(100dvh-64px)] overflow-y-auto">`
* **Edge Cases**: Pull-to-refresh mechanisms are allowed but MUST be carefully managed to avoid triggering browser reload loops.
* **Compliance Criteria**: Zero global window scroll events are registered; scrolling remains isolated within child viewport elements.

### RULE-101: Touch Target Sizing (Apple & Google Guidelines)
* **Purpose**: Ngăn chặn việc chạm bấm nhầm phím trên thiết bị di động.
* **Requirement**: Every interactive touch target, including buttons, list items, input boxes, and tabs MUST have a minimum clickable/tappable area of 44px x 44px (for compact layouts) and 48px x 48px (for standard controls).
* **Rationale**: Ngón tay người dùng có tiết diện tiếp xúc lớn hơn trỏ chuột máy tính rất nhiều, touch targets lớn đảm bảo trải nghiệm không gây ức chế.
* **Example**: `<button className="min-w-[48px] min-h-[48px] p-2 flex items-center justify-center">`
* **Edge Cases**: Small inline text links MUST be wrapped in container blocks that expand their touch-hit bounds invisibly.
* **Compliance Criteria**: Google Lighthouse accessibility audit reports 100% compliant touch target sizing score.

### RULE-102: Lock Device Orientation for Specific Views
* **Purpose**: Đảm bảo bảng nhập điểm hiển thị đúng định dạng và không bị cắt xén.
* **Requirement**: The Scoring Screen view MUST display a visual overlay prompt asking the user to rotate their phone to Landscape mode if they attempt to enter score values in Portrait mode on screens with width < 568px.
* **Rationale**: Bảng điểm của bệ bắn cung cần chiều ngang rộng để hiển thị danh sách các mũi bắn (Arrow tallies); xoay ngang màn hình mang lại không gian thao tác hoàn hảo nhất.
* **Example**: A full-screen overlay with rotate-device illustration that activates via `@media (max-width: 568px) and (orientation: portrait)`.
* **Edge Cases**: Tablets (width >= 768px) are exempt from this orientation block as they have sufficient width in portrait mode.
* **Compliance Criteria**: Portrait preview on mobile triggers rotation lock overlay instantly, disabling back-layer interactions.

### RULE-103: Dynamic Swipe Gesture Navigation
* **Purpose**: Tạo ra trải nghiệm điều hướng tự nhiên và hiện đại giống ứng dụng di động bản địa (Native App).
* **Requirement**: The application layout MUST support horizontal swipe gestures (Swipe Left to advance tab, Swipe Right to return) to cycle through the main leaderboard and round selector views on mobile devices.
* **Rationale**: Người dùng di động ngày nay rất quen thuộc với thao tác vuốt trượt; tích hợp cử chỉ vuốt giúp ứng dụng mượt mà và trực quan hơn.
* **Example**: Utilizing touch event listeners (`onTouchStart`, `onTouchMove`, `onTouchEnd`) to detect horizontal swipe direction.
* **Edge Cases**: Swipe gestures MUST NOT conflict with horizontal scroll containers inside dynamic table layouts.
* **Compliance Criteria**: Swipe detection code is debounced and only triggers navigation events on clear, high-intent gestures (deltaX > 150px).

### RULE-104: Optimize Image Loading and Compression on Mobile
* **Purpose**: Giảm thiểu tiêu thụ dữ liệu 3G/4G và tối ưu tốc độ phản hồi trên di động.
* **Requirement**: All athlete profile images and team logos rendered on mobile layouts MUST be limited to a maximum display width of 64px, utilize WebP format, and implement modern lazy loading attributes.
* **Rationale**: Tiết kiệm tài nguyên mạng cho các trọng tài làm việc bằng mạng di động ngoài sân vận động, tránh trễ tải dữ liệu.
* **Example**: `<img src={athlete.photoUrl} loading="lazy" className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />`
* **Edge Cases**: Fallback monograms MUST load instantly and display while the remote image is being fetched from the server.
* **Compliance Criteria**: Page load size audit shows mobile asset payload is under 1.5MB for the entire initial view.

### RULE-105: Lock Context Menus and Long Press Defaults
* **Purpose**: Tránh hiện tượng hiện menu hệ thống gây phiền toái khi trọng tài nhấn giữ phím nhập điểm.
* **Requirement**: Custom keypad buttons and high-frequency touch elements MUST disable the default browser context menu and text selection overlays using CSS and event preventions.
* **Rationale**: Trọng tài gõ nhanh hoặc giữ nút nhập điểm quá lâu có thể vô tình kích hoạt menu sao chép/dán mặc định của iOS/Android, làm tắc nghẽn thao tác.
* **Example**: Apply class `select-none` and style prefix properties like `-webkit-touch-callout: none;`.
* **Edge Cases**: Traditional text input fields (such as searching or configuration forms) MUST retain normal selection behavior.
* **Compliance Criteria**: Long-pressing keypads on real devices does not summon system copy magnifying glasses or contextual popups.

### RULE-106: Micro-Modal Sheet Layout for Bottom Options
* **Purpose**: Trình bày danh sách lựa chọn trực quan và dễ tiếp cận nhất trên di động.
* **Requirement**: Secondary option dialogs or quick action lists on mobile MUST be presented as a Bottom Sheet that slides up from the base of the screen, rather than a centered desktop-style popup box.
* **Rationale**: Khớp với thói quen sử dụng của các hệ điều hành di động hiện đại, giúp tay bấm dễ dàng hơn mà không cần với lên giữa màn hình.
* **Example**: A drawer component with a top drag handle line, sliding from `bottom-0` to mid-height.
* **Edge Cases**: If option list height exceeds 60% of viewport, the bottom sheet inner contents MUST auto-enable vertical scroll.
* **Compliance Criteria**: Bottom sheet slides smoothly using CSS translate animations and closes instantly on swiping downward.

### RULE-107: Automatic Keypad Sound Toggle
* **Purpose**: Cân bằng trải nghiệm âm thanh dựa trên thói quen của người dùng di động.
* **Requirement**: The scoring keyboard interface MUST provide a quick-access speaker toggle in the top right corner of the keyboard widget to allow users to quickly turn on/off the haptic vibration and sound feedback.
* **Rationale**: Cho phép trọng tài dễ dàng tắt âm thanh khi cần sự im lặng tuyệt đối trong loạt bắn cung cân não của VĐV để tránh làm họ xao nhãng.
* **Example**: A simple button toggling between Lucide `Volume2` and `VolumeX` icons.
* **Edge Cases**: The sound state setting MUST be saved locally so that the choice persists when the application is reloaded.
* **Compliance Criteria**: Audio context volume node is updated dynamically in real-time when the toggle is clicked.

---

## CHAPTER 10: ACCESSIBILITY RULES

### RULE-108: ARIA Landmark and Semantic Document Outline
* **Purpose**: Hỗ trợ tối đa cho người khiếm thị hoặc người dùng sử dụng trình đọc màn hình (Screen Reader).
* **Requirement**: The application HTML structure MUST utilize explicit semantic tags (`<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`) accompanied by valid ARIA landmark attributes (e.g. `role="navigation"`, `role="main"`).
* **Rationale**: Đảm bảo giải đấu tiếp cận được mọi đối tượng người xem, tuân thủ các quy định về khả năng truy cập phần mềm thể thao.
* **Example**: `<main id="main-content" role="main" className="...">`
* **Edge Cases**: Dynamic overlays or modals MUST set `aria-modal="true"` and define `role="dialog"`.
* **Compliance Criteria**: HTML document structure successfully validates with zero critical semantic warnings under screen reader simulation tests.

### RULE-109: Keyboard Navigation Focus Ring
* **Purpose**: Giúp người dùng điều hướng hệ thống mà không cần sử dụng chuột hay thiết bị cảm ứng.
* **Requirement**: All focusable interactive elements MUST display a high-contrast focus outline ring with at least 2px width and 2px separation offset from the component edge when focused using keyboard navigation (Tab key).
* **Rationale**: Trọng tài chính thao tác bằng bàn phím hoặc phím tắt cần có tín hiệu trực quan rõ ràng nhất để xác định tiêu điểm hiện tại.
* **Example**: `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`
* **Edge Cases**: Focus rings SHALL NOT show on pure click interactions if focus-visible styles are managed correctly via CSS.
* **Compliance Criteria**: Focused elements remain clearly visible and contrasting against their container background (ratio >= 4.5:1).

### RULE-110: Assistive Technology Labeling (Aria-Label)
* **Purpose**: Cung cấp ngữ nghĩa rõ ràng cho các nút chỉ chứa biểu tượng trực quan (icon buttons).
* **Requirement**: Every interactive element that does not feature visible text labels (such as close icons, settings gears, tab bars, search clear markers) MUST feature an explicit `aria-label` or `aria-labelledby` property.
* **Rationale**: Trình đọc màn hình không thể tự dịch được ý nghĩa của các file SVG hoặc icon, cần nhãn văn bản tường minh.
* **Example**: `<button aria-label="Đóng hộp thoại cài đặt" onClick={closeModal} className="...">`
* **Edge Cases**: Dynamic state buttons (e.g. Play/Pause) MUST update their `aria-label` attributes dynamically to match their current action.
* **Compliance Criteria**: Search of codebase confirms 100% of pure-icon buttons have valid `aria-label` declarations.

### RULE-111: Screen Reader Live Region Announcement (Aria-Live)
* **Purpose**: Tự động thông báo các cập nhật điểm số quan trọng trong thời gian thực cho người dùng sử dụng trình đọc màn hình.
* **Requirement**: Real-time score update banners, leaderboard rank movements, or emergency solo alerts MUST wrap their dynamic text layers inside an `aria-live="polite"` or `aria-live="assertive"` region.
* **Rationale**: Giúp người dùng khiếm thị nhận được thông báo âm thanh ngay lập tức khi bảng điểm có thay đổi quan trọng mà không cần phải tải lại trang hoặc di chuyển tiêu điểm.
* **Example**: `<div id="live-notification" aria-live="polite" className="sr-only">{lastUpdateMessage}</div>`
* **Edge Cases**: Only major, high-intent status updates should use `assertive` to avoid cluttering the screen reader's audio stream.
* **Compliance Criteria**: Dynamic score insertions trigger automatic announcements in standard screen reader software.

### RULE-112: Disable Interactivity for Off-Screen Elements
* **Purpose**: Ngăn chặn tình trạng người dùng vô tình bấm phím hoặc điều hướng nhầm vào các vùng nội dung ẩn.
* **Requirement**: Sidebars that are collapsed, overlay sheets that are hidden, or modals that are closed MUST set their CSS visibility to `hidden` or set the property `tabIndex={-1}` on all their interactive children.
* **Rationale**: Tránh hiện tượng bàn phím vẫn có thể tab và kích hoạt được các nút bấm nằm bên ngoài khung nhìn hiển thị hiện tại.
* **Example**: `className={isSidebarOpen ? "block" : "hidden"}` or using physical React unmounting conditional rules.
* **Edge Cases**: Elements that animate out MUST completely unmount or apply `hidden` classes the millisecond the slide-out animation terminates.
* **Compliance Criteria**: Tabbing through the page with closed modals does not shift focus or scroll viewports to hidden screen locations.

### RULE-113: Dynamic Font Size Scaling Support
* **Purpose**: Thích ứng hoàn hảo với các thiết lập thu phóng chữ của hệ thống điều hành.
* **Requirement**: The application typography MUST utilize relative units (`rem`, `em`) for sizing, line heights, and margins instead of hardcoded pixels (`px`), allowing browser and OS accessibility zoom levels to scale the text naturally.
* **Rationale**: Đảm bảo những người dùng lớn tuổi hoặc suy giảm thị lực có thể đọc được bảng điểm bình thường khi tăng kích cỡ chữ trong cài đặt hệ thống.
* **Example**: `<h2 className="text-lg mb-2">` translates to standard CSS REM units.
* **Edge Cases**: Extreme font scale-ups MUST NOT break layout column structures; they should wrap elegantly into multi-line flows.
* **Compliance Criteria**: Zooming the browser view to 200% displays all content clearly without layout overlapping or truncated elements.

---

## CHAPTER 11: PERFORMANCE RULES

### RULE-114: Lightweight Component Code Splitting
* **Purpose**: Tối thiểu hóa thời gian tải trang ban đầu và tiết kiệm băng thông mạng.
* **Requirement**: Non-critical large modules (such as complex score charts, admin settings sheets, and historical logs tables) MUST be code-split and loaded lazily using React `lazy` and `Suspense` helpers.
* **Rationale**: Giúp tải trang Leaderboard và trang nhập điểm tức thì trong vòng dưới 1 giây, trì hoãn tải các thư viện vẽ biểu đồ nặng cho tới khi người dùng thực sự click xem.
* **Example**: `const AthleteChart = React.lazy(() => import('./components/AthleteChart'));`
* **Edge Cases**: Lazy loaded components MUST showcase a beautiful, custom skeleton card while loading to avoid abrupt content jumps.
* **Compliance Criteria**: JS main bundle size remains strictly under 350KB under production compilation.

### RULE-115: Prevent Excessive Render Loops
* **Purpose**: Bảo đảm CPU/RAM thiết bị hoạt động mát mẻ và tiết kiệm pin tối đa.
* **Requirement**: Pure display child components (such as table row entries and card badges) MUST be memoized using `React.memo`, and dynamic callback functions MUST be stabilized using `useCallback` or `useMemo`.
* **Rationale**: Tránh việc cập nhật điểm số của một bệ bắn duy nhất làm kích hoạt kết xuất lại (re-render) toàn bộ hàng trăm bệ bắn khác không liên quan, gây đơ lag trình duyệt.
* **Example**: `export const AthleteRow = React.memo(({ athlete }) => { ... });`
* **Edge Cases**: Memoization arrays MUST NOT contain volatile references or complex object models without explicit custom equality checkers.
* **Compliance Criteria**: Profiler audit shows zero unnecessary re-render frames during high-frequency database updates.

### RULE-116: Debounced Input Handlers
* **Purpose**: Tiết kiệm tài nguyên máy tính và giảm thiểu số lượng truy vấn lọc dữ liệu thừa.
* **Requirement**: Text fields that trigger live filtering, searching, or computation loops MUST debounce their change handlers with an execution delay between 150ms and 300ms.
* **Rationale**: Người dùng gõ phím rất nhanh, việc thực hiện tính toán tìm kiếm trên mỗi ký tự nhập vào là hoàn toàn lãng phí và gây nghẽn luồng xử lý chính.
* **Example**: Debouncing raw search queries before updating the filtered results state array.
* **Edge Cases**: Clearing the input field MUST bypass the debounce timer and execute the reset operation instantly to restore full lists.
* **Compliance Criteria**: Input processing functions trigger exactly once per typing pause, verified via console performance logging.

### RULE-117: Efficient Local Array Transformations
* **Purpose**: Tối ưu hóa hiệu năng tính toán dữ liệu lớn trực tiếp trên trình duyệt.
* **Requirement**: Heavy data transformations, sorting arrays, and computing complex team aggregations MUST be wrapped inside `useMemo` hooks, keyed strictly to primitive dependencies.
* **Rationale**: Việc sắp xếp thứ hạng VĐV theo điểm số là phép toán tốn kém; chỉ tính lại khi dữ liệu điểm số thô thực sự thay đổi từ Firestore.
* **Example**: `const sortedAthletes = useMemo(() => computeRankings(athletes), [athletes]);`
* **Edge Cases**: Do not include functions, arrays, or deep objects directly in the dependency array unless they are guaranteed to be structurally immutable.
* **Compliance Criteria**: App maintains consistent 60FPS scrolling performance even during real-time sorting calculations of 500+ athlete nodes.

### RULE-118: Smart Image Optimization and Storage Caching
* **Purpose**: Đảm bảo tốc độ hiển thị hình ảnh tức thời và giảm thiểu tải máy chủ.
* **Requirement**: Profile and banner images uploaded to the platform MUST be auto-compressed, locked to standard web resolutions (max width 400px), and leverage browser cache-control headers.
* **Rationale**: Tránh hiện tượng trình duyệt bị chậm do tải các bức ảnh gốc độ phân giải cao (lên tới vài MB) trực tiếp từ điện thoại của người quản lý.
* **Example**: Serving avatar images with Cache-Control headers of 1 year.
* **Edge Cases**: Image updates MUST feature a unique query suffix string (cache-busting) to ensure changes are reflected instantly.
* **Compliance Criteria**: Google PageSpeed Insights report records optimal scores for image caching and content delivery size.

### RULE-119: Minimalist DOM Node Density
* **Purpose**: Giữ cho cây DOM của trình duyệt mỏng nhẹ và dễ xử lý nhất có thể.
* **Requirement**: UI components MUST avoid creating nested, redundant wrapper divisions (`div` inside `div`) and prefer flat layout hierarchies using semantic grid/flex alignments or React fragments (`<>`).
* **Rationale**: Cây DOM có kích thước quá lớn (độ sâu > 32 lớp, tổng số node > 1500) sẽ khiến trình duyệt tốn nhiều thời gian vẽ lại trang và giật lag khi cuộn.
* **Example**: Avoid wrapping simple icon-button structures in multiple unnecessary flex containers.
* **Edge Cases**: Outer absolute wrappers for popups are allowed but MUST be self-contained and unmounted completely when inactive.
* **Compliance Criteria**: Inspection tool verifies that total DOM node count on the master Leaderboard page is under 1200 nodes.

---

## CHAPTER 12: ANIMATION RULES

### RULE-120: Dynamic Hardware-Accelerated Animations
* **Purpose**: Bảo đảm các hiệu ứng chuyển động mượt mà và tiết kiệm pin tối đa.
* **Requirement**: All micro-animations, transitions, and hover scales MUST utilize GPU-accelerated CSS properties (`transform`, `opacity`) and employ the `motion` components from `motion/react`.
* **Rationale**: Sử dụng GPU giúp giải phóng CPU của thiết bị, giữ cho ứng dụng không bị nóng máy hay tụt pin nhanh khi hiển thị bảng điểm động.
* **Example**: `<motion.div layout animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>`
* **Edge Cases**: Performance-heavy animations (like scale or filter-blur transitions) MUST be avoided inside long list rows.
* **Compliance Criteria**: Performance timeline logs zero composite layer flashes and zero frames below 58 FPS during transition cycles.

### RULE-121: Layout-Preserving Tab Transitions
* **Purpose**: Tạo cảm giác điều hướng liền mạch, tự nhiên khi chuyển đổi giữa các màn hình.
* **Requirement**: Navigating between dashboard tabs or switching rounds on the Leaderboard MUST leverage clean, brief slide/fade animations (`motion` layout animations).
* **Rationale**: Tạo sự kết nối thị giác mượt mà giữa các lớp thông tin, nâng cao cảm giác cao cấp và chuyên nghiệp cho sản phẩm.
* **Example**: `<motion.div layoutId="activeTabUnderline" className="absolute bottom-0 h-0.5 bg-emerald-500" />`
* **Edge Cases**: Layout animations MUST use strict bounds to prevent dynamic components from warping unexpectedly during screen resizing.
* **Compliance Criteria**: Switching view categories presents a smooth crossfade effect without visual stuttering or layout snaps.

### RULE-122: Adaptive Reduced Motion Support
* **Purpose**: Tôn trọng cài đặt hệ thống và bảo vệ sức khỏe cho người dùng nhạy cảm với chuyển động.
* **Requirement**: The application MUST listen to the system's reduced motion media query preference and completely disable or simplify all sliding, scaling, and panning animations when detected active.
* **Rationale**: Giúp ngăn chặn các triệu chứng chóng mặt hoặc mỏi mắt cho những người dùng có hội chứng rối loạn tiền đình hoặc nhạy cảm với hiệu ứng động.
* **Example**: In Tailwind: `motion-reduce:transition-none` or checking `window.matchMedia('(prefers-reduced-motion: reduce)')`.
* **Edge Cases**: Critical status updates can still flash color signals but MUST NOT include movement transitions.
* **Compliance Criteria**: App transitions immediately drop layout slide actions when the client OS is set to "Reduce Motion".

### RULE-123: Micro-Interaction Scale Physics
* **Purpose**: Mang lại trải nghiệm phản hồi vật lý tự nhiên cho các thao tác chạm bấm nút.
* **Requirement**: Buttons and touchable options MUST implement a lightweight spring physics scale effect on active click/press states, scaling down to precisely `0.95` or `0.98` and bouncing back instantly.
* **Rationale**: Mô phỏng cảm giác bấm nút vật lý chân thực ngoài đời, tăng cường nhận thức hành động đã thành công.
* **Example**: `whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}`
* **Edge Cases**: Buttons with active loadings or progress states MUST freeze tap animations to prevent multi-triggering errors.
* **Compliance Criteria**: Micro-interaction bounce is completed in under 150ms with zero post-movement wobble.

---

## CHAPTER 13: NOTIFICATION RULES

### RULE-124: Toast Queue System with Non-Blocking Overlay
* **Purpose**: Hiển thị thông báo trạng thái mà không cản trở hoạt động nhập liệu của trọng tài.
* **Requirement**: System toasts (success, warning, error) MUST render inside an absolute floating corner container, stacking vertically with a maximum limit of 3 concurrent toasts. Older notifications MUST automatically pop out of the stack.
* **Rationale**: Giúp thông báo không bao giờ che kín màn hình chính, cho phép người điều hành tiếp tục làm việc bình thường.
* **Example**: A fixed top-right alert stack container: `<div className="fixed top-4 right-4 flex flex-col gap-2 z-50">`
* **Edge Cases**: Clicking on a toast MUST dismiss it instantly, and error toasts MUST persist until manually closed or after a 10-second timeout.
* **Compliance Criteria**: Real-time operations remain perfectly functional while active toast stacks are visible.

### RULE-125: Distinct Sound Alerts for High-Priority Notifications
* **Purpose**: Thu hút sự chú ý tức thì của người vận hành giải đấu qua âm thanh.
* **Requirement**: High-priority notifications (such as system error alerts or emergency tie-breaker events) MUST play a unique, short audio tone (chime sound effect) upon rendering, if approved by user configuration.
* **Rationale**: Đảm bảo ban tổ chức nghe thấy cảnh báo khẩn cấp ngay cả khi không đứng trực tiếp đối diện với máy tính điều khiển.
* **Example**: `const audio = new Audio('/assets/sounds/alert.mp3'); audio.play();`
* **Edge Cases**: Audio playback MUST degrade gracefully and silently if browser policies block auto-play actions.
* **Compliance Criteria**: Sound alerts execute reliably on certified operator browsers without throwing uncaught exceptions.

### RULE-126: Contextual Empty Notification Banners
* **Purpose**: Trình bày rõ ràng trạng thái sạch của trung tâm thông báo.
* **Requirement**: If the user opens the notification drawer/center and there are zero unread items, the container MUST display a beautiful, minimalist centered message stating "Bạn không có thông báo mới nào" accompanied by a dimmed checkmark icon.
* **Rationale**: Loại bỏ sự mơ hồ cho người sử dụng về việc danh sách đang tải hay thực sự không có thông báo.
* **Example**: Centered Lucide `BellOff` icon with muted gray typography.
* **Edge Cases**: If notifications are disabled globally, the empty state text MUST update to: "Thông báo hệ thống đã được tắt".
* **Compliance Criteria**: Standard layout components render reliably across all notification panel states.

---

## CHAPTER 14: OBS OVERLAY RULES

### RULE-127: Chroma-Key High-Contrast Color Optimization
* **Purpose**: Cho phép kỹ thuật viên dựng hình truyền hình trực tiếp bóc tách bảng điểm một cách hoàn hảo.
* **Requirement**: The OBS Overlay view MUST include a switch to set the background to a pure Chroma-Key Green (`#00FF00`) or pure Blue (`#0000FF`) to facilitate instant background removal inside streaming software (OBS Studio, vMix).
* **Rationale**: Bảo đảm chất lượng phát sóng chuyên nghiệp, sắc nét, không bị dính răng cưa hay lem nhem ở các cạnh văn bản điểm số.
* **Example**: `<div id="obs-canvas" className="bg-[#00ff00] min-h-screen text-white">`
* **Edge Cases**: When Chroma-Key green background is active, no green colors SHALL be used inside the scoreboard graphics to prevent accidental bóc tách.
* **Compliance Criteria**: Background keying tested successfully inside standard streaming softwares with clean edge extraction.

### RULE-128: Ultra-High-Contrast Visual Graphic Elements
* **Purpose**: Bảo đảm thông tin điểm số truyền hình rõ ràng nhất khi nén luồng phát sóng mạng xã hội.
* **Requirement**: Overlay score text and ranking numbers MUST feature a strong, dark drop-shadow outline (at least 2px width) or solid black background plates.
* **Rationale**: Luồng phát sóng trực tiếp (Livestream) lên Facebook/YouTube thường bị nén chất lượng (compression artifacts); chữ không có viền bóng sẽ bị nhòe và không thể đọc được.
* **Example**: `className="text-slate-100 font-bold [text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]"`
* **Edge Cases**: Fine or ultra-light font weights are STRIPCALLY FORBIDDEN in OBS templates.
* **Compliance Criteria**: Text layers remain highly legible even under heavily compressed 720p streams.

---

## CHAPTER 15: FUTURE-PROOF RULES

### RULE-129: Dynamic DistanceConfig and roundResults Coupling
* **Purpose**: Đảm bảo hệ thống giao diện không bao giờ bị lạc hậu khi quy mô giải đấu thay đổi.
* **Requirement**: The UI MUST NOT implement hardcoded assumptions about the number of rounds, multiplier factors, or team sizes. All rendering loops MUST calculate lengths dynamically from the active database parameters.
* **Rationale**: Cho phép Ban tổ chức tự do thay đổi cấu trúc giải đấu (ví dụ: chuyển từ 3 vòng lên 6 vòng, hoặc tăng số người trong đội) mà không cần lập trình viên phải sửa một dòng mã nguồn nào.
* **Example**: Mapping dynamic columns via `roundResults.map(round => <th key={round.id}>{round.name}</th>)`.
* **Edge Cases**: If configurations contain irregular structures (such as missing a round's name), the UI MUST fallback to "Vòng N" automatically.
* **Compliance Criteria**: Complete decoupling of visual templates from business logic lengths.

### RULE-130: Code Separation of View and Database Logic
* **Purpose**: Giữ gìn sự trong sạch, dễ bảo trì, và an toàn cho toàn bộ hệ thống phần mềm.
* **Requirement**: All React view files (`.tsx`) MUST NOT contain raw Firestore transaction strings, database mutators, or complex computation algorithms directly inside their render return trees. All storage queries, writes, and rank calculations MUST be strictly isolated inside dedicated service layers (e.g. `/src/services/firebase.ts`) and custom hooks.
* **Rationale**: Giúp mã nguồn có tính kế thừa cao, dễ dàng kiểm thử (unit testing) độc lập và loại bỏ nguy cơ vô tình làm hỏng cấu trúc dữ liệu trong các đợt cập nhật giao diện tương lai.
* **Example**: Accessing data via `const { athletes, loading } = useAthletes();` instead of embedding Firestore query loops in the table.
* **Edge Cases**: If database operations must be triggered from user action (like clicking save), they MUST call imported async functions rather than native Firestore SDK operations.
* **Compliance Criteria**: UI components only read from clean, typed state variables; direct Firestore import statements are forbidden inside components.

---

### PHẦN KẾT: TÍNH HIỆU LỰC VÀ GIÁM SÁT TUÂN THỦ
Hiến pháp Giao diện này có hiệu lực ngay lập tức kể từ thời điểm ban hành (Phiên bản 1.0). Mọi sửa đổi, bổ sung trong tương lai đều phải được thông qua bởi Trưởng bộ phận Kiến trúc Trải nghiệm (Principal UX Architect) và được cập nhật chính thức vào tài liệu này. 

Sự tuân thủ tuyệt đối các quy tắc trên là chìa khóa để kiến tạo nên một hệ thống **VSC Platform V3** chuyên nghiệp, tin cậy, trường tồn với thời gian và mang lại vinh quang cho các vận động viên!
