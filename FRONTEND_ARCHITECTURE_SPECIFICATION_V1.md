# FRONTEND ARCHITECTURE SPECIFICATION (FAS) V1.0
## KIẾN TRÚC FRONTEND TỐI CAO - VSC PLATFORM V3

---

### MỞ ĐẦU
Tài liệu Frontend Architecture Specification (FAS) này định nghĩa khung kiến trúc tiêu chuẩn, cấu trúc thư mục, luồng xử lý dữ liệu và các quy chuẩn lập trình tối cao cho toàn bộ hệ thống frontend của **VSC Platform V3 (Vietnam Slingshot Championship)**. 

Mọi lập trình viên và các tác nhân phát triển hệ thống **MUST** tuân thủ tuyệt đối cấu trúc và các quy định trong tài liệu này để đảm bảo tính nhất quán, khả năng bảo trì, hiệu năng vận hành thời gian thực và khả năng mở rộng hệ thống trong tối thiểu 5 năm tới mà không cần đại tu kiến trúc.

---

## SECTION 1: FOLDER STRUCTURE

Cấu trúc thư mục của VSC Platform được thiết kế dựa trên nguyên lý **Clean Architecture** kết hợp với **Domain-Driven Design (DDD)** nhẹ, đảm bảo sự phân tách rạch ròi giữa tầng hiển thị (Presentation Layer), tầng nghiệp vụ trung gian (Domain/Application Layer) và tầng giao tiếp dữ liệu (Infrastructure Layer).

```text
src/
├── app/                           # Tầng khởi chạy ứng dụng (App Bootstrapping)
│   ├── providers/                 # Các global React Providers (Auth, Theme, Query, Router)
│   ├── routes/                    # Cấu hình Routing (AppRouter, GuardedRoutes, RouteConfigs)
│   └── styles/                    # Global Stylesheets (index.css, tailwind base)
│
├── pages/                         # Tầng trang hiển thị (Page View Controllers)
│   ├── admin/                     # Quản lý giải đấu, cấu hình vòng đấu
│   ├── referee/                   # Màn hình trọng tài nhập điểm (Scoring Pads)
│   ├── athlete/                   # Hồ sơ, lịch sử thi đấu của VĐV
│   ├── audience/                  # Bảng xếp hạng, tương tác của khán giả
│   ├── tv/                        # Liveboard TV/LED Mode cho khán đài
│   ├── obs/                       # OBS Overlay Chroma-Key cho Livestream
│   ├── shared/                    # Các trang dùng chung (Dashboard, Auth, 404, Offline, Maintenance)
│   └── index.ts                   # Export tập trung các trang
│
├── layouts/                       # Các khung giao diện chuẩn (Master Layouts)
│   ├── DesktopLayout.tsx          # Bố cục cho máy tính (Sidebar-oriented)
│   ├── TabletLayout.tsx           # Bố cục cho máy tính bảng của trọng tài
│   ├── MobileLayout.tsx           # Bố cục tối ưu một tay cho di động (Bottom-nav)
│   ├── TVLayout.tsx               # Bố cục tràn màn hình cinematic cho TV
│   ├── OBSLayout.tsx              # Bố cục tối ưu Chroma-Key cho OBS
│   └── AuthLayout.tsx             # Bố cục tối giản cho đăng nhập
│
├── components/                    # Tầng UI Reusable Components (Atomic Design)
│   ├── ui/                        # Atoms: Nút, Thẻ, Huy hiệu, Skeleton cơ bản (Shadcn style)
│   ├── feedback/                  # Toasts, Modals, Banners, Skeletons nâng cao
│   ├── charts/                    # Biểu đồ phân tích (D3, Recharts wrappers)
│   └── features/                  # Molecules & Organisms gắn với Business Logic cụ thể
│       ├── leaderboard/           # Bảng điểm, ranh giới loại, cột vòng đấu
│       ├── scoring/               # Bàn phím nhập điểm, hàng nhập điểm động
│       ├── settings/              # Accordion vòng đấu, cấu hình hệ số nhân
│       └── athletes/              # Form đăng ký VĐV, danh sách hiển thị
│
├── hooks/                         # Tầng Custom Hooks tái sử dụng (Logic hiển thị & State)
│   ├── useAuth.ts                 # Trạng thái người dùng, phân quyền truy cập
│   ├── useLeaderboard.ts          # Tính toán thứ hạng, ranh giới loại động
│   ├── useScoring.ts              # Xử lý nhập liệu, bộ đếm mũi bắn
│   ├── useIntersection.ts         # Hook tối ưu cuộn vô tận / Lazy loading
│   └── useSystemStatus.ts         # Kiểm tra kết nối mạng và Firebase Online State
│
├── services/                      # Tầng giao tiếp Hạ tầng (Infrastructure Services)
│   ├── firebase/                  # Cấu hình & SDK Wrapper của Firebase
│   │   ├── config.ts              # Khởi tạo Firebase App, Auth, Firestore
│   │   ├── auth.ts                # Wrapper cho các tác vụ Authentication
│   │   └── firestore.ts           # Quản lý Listener Connection & Cache Settings
│   └── audio/                     # Quản lý hiệu ứng âm thanh và haptic
│
├── repositories/                  # Tầng truy cập dữ liệu trừu tượng (Data Access Layer)
│   ├── athleteRepository.ts       # CRUD, lọc và tìm kiếm VĐV từ Firestore
│   ├── tournamentRepository.ts    # Truy vấn cấu hình giải đấu và luật vòng đấu
│   └── scoreRepository.ts         # Nhập điểm, cập nhật luồng điểm số thời gian thực
│
├── contexts/                      # Tầng Context Providers cho State cục bộ lớn
│   ├── TournamentContext.tsx      # Chia sẻ dữ liệu giải đấu hiện hành
│   └── ScoringContext.tsx         # Lưu trữ tạm trạng thái phiên nhập điểm của bệ bắn
│
├── utils/                         # Thư viện hàm tiện ích (Pure Functions)
│   ├── formatters.ts              # Định dạng chuỗi, số điểm, thời gian tương đối
│   ├── calculators.ts             # Các hàm tính toán số học phụ trợ (không chứa logic giải đấu)
│   └── validators.ts              # Kiểm tra tính hợp lệ của dữ liệu nhập vào
│
├── constants/                     # Các hằng số bất biến của toàn hệ thống
│   ├── rules.ts                   # Giới hạn hệ số nhân, khoảng điểm hợp lệ
│   ├── themes.ts                  # Danh mục mã màu, kích thước phông chữ
│   └── routes.ts                  # Danh mục định tuyến hệ thống
│
├── types/                         # Định nghĩa TypeScript Types & Interfaces (Strictly Typed)
│   ├── index.ts                   # Export tất cả các types
│   ├── models.ts                  # Khớp 1:1 với Firestore Blueprint (Athlete, Tournament...)
│   └── ui.ts                      # Types phục vụ riêng cho hoạt động hiển thị (Tabs, Layouts...)
│
├── config/                        # Cấu hình môi trường và hệ thống bổ trợ
│   └── env.ts                     # Kiểm định nghiêm ngặt biến môi trường (.env.example)
│
└── animations/                    # Định nghĩa các cấu hình chuyển động chuẩn
    └── variants.ts                # Motion animation presets (Framer Motion / Motion)
```

---

## SECTION 2: COMPONENT ARCHITECTURE

Áp dụng phương pháp **Atomic Design** được tinh chỉnh để phù hợp với hệ sinh thái React, đảm bảo phân chia trách nhiệm rõ ràng cho từng lớp linh kiện UI.

```text
+-------------------------------------------------------------------------+
|                                 PAGES                                   |
|  (e.g., RefereeScoringPage, LeaderboardPage)                            |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                               TEMPLATES                                 |
|  (e.g., LiveboardTemplate, DoubleColumnDashboard)                      |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                               ORGANISMS                                 |
|  (e.g., LeaderboardTable, RoundSettingsAccordion, ScoreKeyboardSheet)    |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                               MOLECULES                                 |
|  (e.g., AthleteRow, ScoreInputBox, RuleSummaryChip, NavButton)         |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                                 ATOMS                                   |
|  (e.g., CustomButton, InputField, StatusBadge, TypographySpan)         |
+-------------------------------------------------------------------------+
```

### 2.1. Phân loại cấu trúc linh kiện (Component Classification)

1. **Atoms (Linh kiện nguyên tử - UI Components)**:
   * **Định nghĩa**: Các thành phần giao diện nhỏ nhất, không thể phân chia thêm, không chứa bất kỳ logic nghiệp vụ giải đấu nào (e.g., `Button`, `Input`, `Badge`, `Skeleton`).
   * **Vị trí**: `src/components/ui/`
   * **Quy tắc**: **MUST** là pure components, hoàn toàn phụ thuộc vào `props` nhận vào. **MUST NOT** import bất kỳ hook nghiệp vụ, context, hay dịch vụ lưu trữ nào.

2. **Molecules (Linh kiện phân tử)**:
   * **Định nghĩa**: Sự kết hợp của hai hoặc nhiều Atoms để tạo ra một chức năng hiển thị đơn giản (e.g., `AthleteRow`, `ScoreInputBox`, `RuleSummaryChip`).
   * **Vị trí**: `src/components/features/[feature_name]/`
   * **Quy tắc**: Có thể chứa logic tương tác cục bộ đơn giản, nhưng không được gọi trực tiếp kho dữ liệu (Repository). Dữ liệu và hàm kích hoạt hành động **MUST** được truyền xuống từ cấp cha qua `props`.

3. **Organisms (Linh kiện cơ thể)**:
   * **Định nghĩa**: Các khối giao diện hoàn chỉnh, phức tạp, đảm nhiệm một nghiệp vụ trọn vẹn (e.g., `LeaderboardTable`, `RoundSettingsAccordion`, `ScoreKeyboardSheet`).
   * **Vị trí**: `src/components/features/[feature_name]/`
   * **Quy tắc**: Được phép kết nối với React Context, gọi các Custom Hooks nghiệp vụ, và chứa các tối ưu hóa hiệu năng như ảo hóa danh sách (Virtualized lists).

4. **Templates (Bố cục mẫu)**:
   * **Định nghĩa**: Khung định dạng vị trí, kết cấu không gian cho các Organisms mà không quan tâm đến dữ liệu thực tế (e.g., `LiveboardTemplate`, `TwoColumnDashboardTemplate`).
   * **Vị trí**: `src/layouts/`

5. **Pages (Trang nghiệp vụ)**:
   * **Định nghĩa**: Thực thể chịu trách nhiệm kết nối toàn bộ luồng dữ liệu. Pages nhận tham số từ Router, khởi chạy các Realtime Listeners, truyền dữ liệu xuống các Organisms và xử lý các trạng thái tải (`loading`), lỗi (`error`), và rỗng (`empty`).
   * **Vị trí**: `src/pages/`

6. **Shared vs Feature Components**:
   * **Shared Components** (`src/components/ui/` hoặc `src/components/feedback/`): Các thành phần dùng chung cho toàn bộ dự án, mang tính chất hạ tầng hiển thị.
   * **Feature Components** (`src/components/features/`): Các thành phần chỉ phục vụ cho một phạm vi nghiệp vụ nhất định (Leaderboard, Scoring, Settings).

### 2.2. Chống phụ thuộc vòng tròn (Anti-Circular Dependency Code Pact)
* **FORBIDDEN**: Hai linh kiện ở cùng cấp hoặc khác cấp import lẫn nhau trực tiếp.
* **Biện pháp**: 
  1. Sử dụng kỹ thuật **Children Composition** (`props.children`) để truyền linh kiện con vào linh kiện cha mà không cần khai báo import trực tiếp ở cha.
  2. Gom các giao tiếp logic chung lên một tầng trung gian thông qua **React Context** hoặc **Custom Hooks**.
  3. Sử dụng tệp tin mục lục `index.ts` tại mỗi thư mục gốc để chuẩn hóa đầu ra (barrel exports) và tuyệt đối không import xuyên biên giới nội bộ một cách tự do.

---

## SECTION 3: STATE MANAGEMENT ARCHITECTURE

VSC Platform vận hành dựa trên cơ chế phản hồi thời gian thực cực kỳ nhạy bén. Kiến trúc quản lý trạng thái được thiết kế phân tầng từ dữ liệu bền vững đám mây tới trạng thái tạm thời của phần cứng.

```text
+-------------------------------------------------------------------------------+
|                       FIRESTORE CLOUD PERSISTENCE                             |
|  (Single Source of Truth - Realtime Snapshot Streams)                         |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|                        REALTIME LISTENER STATE (Caches)                       |
|  (Managed via Repository & Custon React Hooks: useAthletes, useTournament)    |
+-------------------------------------------------------------------------------+
                                      │
                ┌─────────────────────┴─────────────────────┐
                ▼                                           ▼
+-------------------------------+           +-------------------------------+
|         GLOBAL STATE          |           |    OFFLINE QUEUE STATE        |
|  (Auth Session, Current Dist) |           |  (Unsubmitted scoring inputs) |
+-------------------------------+           +-------------------------------+
                │                                           │
                ▼                                           ▼
+-------------------------------+           +-------------------------------+
|     DERIVED / MEMOIZED STATE   |           |     LOCAL / TEMPORARY STATE   |
|  (Calculated ranks, cutoffs)  |           |  (Active keypad press, inputs)|
+-------------------------------+           +-------------------------------+
```

### 3.1. Phân loại các lớp trạng thái (State Classifications)

1. **Firestore State (Dữ liệu đám mây thời gian thực)**:
   * **Bản chất**: Dữ liệu tối cao, đồng bộ hóa tự động qua Firestore snapshots (`onSnapshot`).
   * **Quản lý**: Được đóng gói bên trong các Custom Hooks ở tầng Repository. Trạng thái này là bất biến (immutable) ở phía client; mọi hoạt động thay đổi dữ liệu **MUST** đi qua các hàm ghi (write operations) của Repository lên Firestore, không được tự ý ghi đè trực tiếp lên bộ nhớ RAM của client.

2. **Realtime Listener State (Trạng thái luồng nghe)**:
   * **Bản chất**: Quản lý việc kết nối, ngắt kết nối và giữ liên lạc với các Firestore collections.
   * **Tối ưu**: Khi component unmount, bộ lắng nghe (listener) **MUST** được hủy (`unsubscribe()`) để tránh rò rỉ bộ nhớ (memory leaks).

3. **Global State (Trạng thái toàn cục)**:
   * **Bản chất**: Các thông tin ảnh hưởng đến toàn bộ trải nghiệm người dùng hiện tại (e.g., phiên đăng nhập của Trọng tài, cự ly thi đấu đang chọn, trạng thái kết nối Internet toàn hệ thống).
   * **Quản lý**: Sử dụng các React Context tối giản, tách biệt theo trách nhiệm (`AuthContext`, `TournamentContext`).

4. **Offline Queue State (Hàng đợi ngoại tuyến)**:
   * **Bản chất**: Lưu trữ các điểm số trọng tài đã nhập trong thời gian mất mạng tạm thời.
   * **Quản lý**: Lưu trữ an toàn trong `localStorage` hoặc `IndexedDB`. Khi phát hiện tín hiệu mạng khôi phục (qua `useSystemStatus`), luồng đồng bộ sẽ tự động đẩy dữ liệu từ hàng đợi lên Firestore theo đúng thứ tự thời gian.

5. **Derived State (Trạng thái phái sinh)**:
   * **Bản chất**: Dữ liệu được tính toán trực tiếp từ dữ liệu thô (e.g., danh sách VĐV đã được sắp xếp thứ hạng, vị trí ranh giới loại, danh sách VĐV đồng điểm chờ Solo).
   * **Quy tắc**: **NEVER** lưu trữ Derived State vào React `state` độc lập vì sẽ dễ dẫn đến bất đồng bộ dữ liệu. **ALWAYS** tính toán trực tiếp trong quá trình render và bọc trong hook `useMemo` để tối ưu hóa hiệu năng tính toán lại.

6. **Memoized State (Bộ nhớ đệm tính toán)**:
   * **Bản chất**: Lưu trữ kết quả của các phép toán nặng để tránh tính toán lại vô ích trên mỗi chu kỳ render (e.g., gom nhóm điểm đồng đội, tổng hợp hiệu suất mũi bắn).
   * **Quy tắc**: Sử dụng `useMemo` với khóa phụ thuộc (dependency keys) là các giá trị nguyên thủy (primitives).

7. **Local State (Trạng thái cục bộ)**:
   * **Bản chất**: Các tương tác giao diện cực kỳ ngắn hạn và giới hạn trong một linh kiện (e.g., nội dung ô tìm kiếm hiện tại, trạng thái đóng/mở của một thẻ accordion cài đặt, phím vừa nhấn trên bàn phím nhập điểm).
   * **Quản lý**: Sử dụng React `useState` tiêu chuẩn.

8. **Temporary State (Trạng thái biểu mẫu/nhập liệu)**:
   * **Bản chất**: Dữ liệu đang trong quá trình chỉnh sửa chưa được lưu (e.g., cấu hình vòng đấu đang thay đổi trên form Settings nhưng chưa nhấn nút "Lưu").
   * **Quy tắc**: Lưu trữ tạm trong component state. Khi bấm "Hủy", trạng thái này được xóa bỏ và khôi phục về trạng thái Firestore thô ban đầu.

---

## SECTION 4: FIRESTORE ACCESS LAYER (DAL)

Hệ thống thiết lập một rào cản kiến trúc tuyệt đối để bảo vệ tầng cơ sở dữ liệu. **UI tuyệt đối không được phép gọi trực tiếp các hàm SDK của Firebase** như `doc()`, `collection()`, `updateDoc()`, hoặc `getDocs()`.

### 4.1. Quy trình luồng dữ liệu (Data Flow Architecture)

```text
[ Presentation Layer (UI) ]
         │
         ▼ (Chỉ đọc state hoặc kích hoạt hành động thông qua Custom Hooks)
[ Custom Hooks Layer (useAthletes, useScoring) ]
         │
         ▼ (Sử dụng hàm trừu tượng hóa truy cập dữ liệu)
[ Repository Layer (athleteRepository, scoreRepository) ]
         │
         ▼ (Khởi chạy cấu hình kết nối, thiết lập bảo mật và xử lý ghi)
[ Firebase Service Layer (firestore.ts, auth.ts) ]
         │
         ▼ (Thực thi truy vấn)
[ Google Firestore Cloud ]
```

### 4.2. Trách nhiệm của từng lớp (Layer Responsibilities)

1. **UI Layer**:
   * Chỉ hiển thị dữ liệu và nhận các sự kiện từ người dùng.
   * Giao tiếp duy nhất với **Custom Hooks** để lấy dữ liệu hoặc gửi lệnh thực thi.
   * Ví dụ: Không biết Firestore là gì, chỉ biết gọi `submitScore(athleteId, score)` từ hook `useScoring`.

2. **Custom Hooks Layer**:
   * Quản lý vòng đời hiển thị, chuyển đổi dữ liệu thô sang dữ liệu phù hợp với UI.
   * Đảm bảo kích hoạt loading states, error boundaries và dọn dẹp bộ lắng nghe thời gian thực khi kết thúc.

3. **Repository Layer (DAL)**:
   * Đóng gói toàn bộ logic truy vấn dữ liệu. Trả về các dữ liệu đã được định dạng chuẩn theo TypeScript Interfaces.
   * Thực hiện chuyển hóa dữ liệu (Data Mapper) nếu cấu trúc lưu trữ của Firestore khác với cấu trúc hiển thị của Frontend.

4. **Firebase Service Layer**:
   * Nơi duy nhất chứa thông tin cấu hình SDK Firebase.
   * Thiết lập cấu hình lưu trữ đệm ngoại tuyến (Offline Persistence), quản lý kết nối mạng của Firestore SDK.

---

## SECTION 5: ROUTING ARCHITECTURE

Kiến trúc định tuyến của VSC Platform sử dụng **React Router v6** kết hợp với cơ chế bảo vệ tuyến đường phân cấp (Declarative Route Guards), đảm bảo đúng người, đúng thiết bị truy cập đúng tài nguyên.

### 5.1. Sơ đồ cây định tuyến (Route Tree Mapping)

```text
/ (Root - Auto redirect based on device/role)
├── /auth (Đăng nhập hệ thống)
│
├── /dashboard (Trang tổng quan bento grid - Public/Shared)
│
├── /admin (Khu vực quản trị giải đấu - Protected: Admin Role)
│   ├── /settings (Cấu hình vòng đấu, hệ số nhân, cơ chế loại)
│   └── /athletes (Quản lý hồ sơ, đăng ký VĐV)
│
├── /referee (Khu vực trọng tài - Protected: Referee Role/Tablet Layout)
│   └── /scoring (Nhập điểm bệ bắn trực tiếp)
│
├── /athlete (Khu vực VĐV - Public/Authenticated)
│   └── /profile/:id (Tra cứu thành tích cá nhân, lịch sử mũi bắn)
│
├── /leaderboard (Bảng xếp hạng thời gian thực - Public)
│
├── /tv (Liveboard TV/LED Mode tràn màn hình - Public/Specialized)
│
├── /obs (OBS Overlay Chroma-Key phục vụ Livestream - Specialized)
│
└── /fallback
    ├── /404 (Không tìm thấy trang)
    ├── /unauthorized (Không có quyền truy cập)
    ├── /maintenance (Hệ thống bảo trì)
    └── /offline (Mất kết nối hoàn toàn)
```

### 5.2. Công cụ bảo vệ định tuyến (Route Guards Implementation)

* **RequireAuth Guard**: Kiểm tra trạng thái đăng nhập từ `useAuth`. Nếu chưa đăng nhập, chuyển hướng ngay về `/auth` kèm theo ghi nhớ URL nguồn (`from`).
* **RequireRole Guard**: Kiểm tra phân quyền (`Admin`, `Referee`). Nếu không đủ thẩm quyền, chuyển hướng lập tức sang `/fallback/unauthorized`.
* **Platform/Device Guard**: Tự động phát hiện loại thiết bị. Nếu máy tính bảng hoặc di động truy cập trang `/tv` (vốn đòi hỏi màn hình siêu rộng), hệ thống sẽ hiển thị gợi ý chuyển sang `/leaderboard` để có trải nghiệm hiển thị phù hợp hơn.

---

## SECTION 6: LAYOUT ARCHITECTURE

Hệ thống định nghĩa một tập hợp các layouts chuyên biệt để tối ưu hóa không gian hiển thị của từng kịch bản sử dụng thực tế.

### 6.1. Chi tiết các bố cục chuẩn (Layout Matrix)

| Tên Layout | Thiết bị Mục tiêu | Đặc thù Thiết kế | Quy tắc Nổi bật |
| :--- | :--- | :--- | :--- |
| **Desktop Layout** | Laptops, PCs (>= 1024px) | Thanh điều hướng biên trái cố định, thanh trạng thái trên cùng, bento grid trung tâm. | Giới hạn chiều rộng tối đa `max-w-7xl` để chống loãng thông tin. |
| **Tablet Layout** | iPads, Android Tablets (>= 768px) | Thanh điều hướng bên hông thu gọn (rail), lưới biểu mẫu nhập điểm lớn, các touch targets >= 48px. | Khóa xoay màn hình ngang (Landscape) nếu độ phân giải dọc quá hẹp. |
| **Mobile Layout** | Smartphones (< 768px) | Thanh điều hướng chuyển hoàn toàn xuống đáy màn hình (Bottom Nav, cao 64px), bố cục một hàng duy nhất. | Áp dụng tuyệt đối Safe Area Insets (`pb-[safe-area-inset-bottom]`) để tránh cằm thiết bị che nút bấm. |
| **TV Layout** | LED Walls, Màn trình chiếu LED | Chế độ cinematic không viền, không thanh cuộn, gam màu siêu tương phản (WCAG AAA), carousel tự động chuyển trang mượt mà. | Khóa cuộn màn hình tuyệt đối (`overflow-hidden`). |
| **OBS Layout** | Máy phát sóng (Streaming PC) | Nền xanh lá Chroma-Key (`#00FF00`), đồ họa điểm số có bóng đổ đậm hoặc plate nền đen đặc. | Loại bỏ toàn bộ thành phần tương tác bằng chuột/bàn phím. |
| **Fullscreen Layout**| Thiết bị nhập điểm tập trung | Ẩn hoàn toàn thanh điều hướng hệ thống để trọng tài tập trung tuyệt đối vào việc gõ điểm. | Sử dụng các custom dialogs thay thế cho native browser dialogs. |

---

## SECTION 7: COMPONENT COMMUNICATION

Nhằm duy trì tính dễ hiểu của mã nguồn và ngăn chặn "mỳ ống hóa" (spaghettification) dòng dữ liệu, truyền thông giữa các linh kiện tuân thủ các kênh truyền thông nghiêm ngặt.

```text
                    [ PARENT COMPONENT / PAGE ]
                                │
          ┌─────────────────────┴─────────────────────┐
          │ (Props - Direct down, max 3 levels)        │ (Context - Global/Module state)
          ▼                                           ▼
[ CHILD COMPONENT ]                           [ DEEP DESCENDANT ]
          │                                           │
          └─────────────────────┬─────────────────────┘
                                │ (Callbacks / Custom Events - Direct up)
                                ▼
                    [ PARENT COMPONENT / PAGE ]
```

### 7.1. Các kênh giao tiếp được chấp thuận (Approved Communication Channels)

1. **Props (Truyền trực tiếp từ trên xuống)**:
   * Áp dụng cho mối quan hệ Cha - Con trực tiếp.
   * **STRICT BOUNDARY**: Tuyệt đối không truyền props vượt quá **3 cấp liên tục** (No Prop Drilling). Nếu dữ liệu cần truyền xuống cấp thứ 4, bắt buộc phải sử dụng **React Context** hoặc đóng gói thành một **Custom Hook** chuyên biệt.

2. **Callbacks (Truyền sự kiện từ dưới lên)**:
   * Áp dụng để thông báo cho cha về thay đổi từ con (e.g., `onScoreChange(newScore)`).
   * Đặt tên callback theo tiền tố `on` (e.g., `onSelect`, `onSubmit`).

3. **React Context (Chia sẻ trạng thái phạm vi rộng)**:
   * Sử dụng để chia sẻ dữ liệu trong một Module lớn (e.g., toàn bộ bàn phím nhập liệu cần biết bệ bắn hiện tại, lượt bắn hiện tại qua `ScoringContext`).

4. **Custom Hooks (Đóng gói và chia sẻ Logic)**:
   * Gom các logic đọc ghi dữ liệu từ cơ sở dữ liệu và chia sẻ trạng thái dùng chung cho các components đăng ký sử dụng.

5. **Custom Events / Pub-Sub**:
   * Chỉ sử dụng cho các trường hợp đặc biệt không thể kết nối bằng React (e.g., tín hiệu từ một thư viện vẽ canvas D3 ngoài React thông báo cho React hiển thị hộp thoại). Sử dụng cơ chế `CustomEvent` tiêu chuẩn của trình duyệt và **MUST** dọn dẹp bộ lắng nghe (`removeEventListener`) khi component unmount.

---

## SECTION 8: PERFORMANCE ARCHITECTURE

Hiệu năng là yếu tố sống còn khi giải đấu Slingshot đang diễn ra. Giao diện bảng điểm Liveboard phải duy trì 60 FPS, bảng nhập điểm của trọng tài phải phản hồi tức thì dưới 16ms.

### 8.1. Các kỹ thuật tối ưu hóa cốt lõi (Performance Optimization Matrix)

* **React.memo**:
  * **Chỉ định**: Áp dụng bắt buộc cho các hàng danh sách lặp lại nhiều lần (e.g., `AthleteRow` trong LeaderboardTable).
  * **Quy tắc**: Chỉ dùng khi thành phần hiển thị nhận `props` nguyên thủy hoặc các đối tượng được đảm bảo không đổi địa chỉ vùng nhớ trong bộ nhớ.

* **useMemo và useCallback**:
  * **useMemo**: Bắt buộc sử dụng cho các hàm sắp xếp thứ hạng, tính điểm đồng đội, lọc tìm kiếm VĐV.
  * **useCallback**: Áp dụng cho mọi callback function được truyền xuống các con đã được bọc `React.memo` để tránh làm vô hiệu hóa bộ nhớ đệm của con do đổi địa chỉ hàm.

* **lazy() và Suspense (Code Splitting)**:
  * **Chỉ định**: Áp dụng phân mảnh mã nguồn cho các phân hệ lớn, không xuất hiện ở trang chủ ban đầu (e.g., Trang cấu hình giải đấu `AdminPage`, Phân tích biểu đồ `StatisticsPage`).
  * **Hiệu quả**: Giảm kích thước gói tải ban đầu (initial bundle size) giúp trang tải tức thì.

* **List Virtualization (Ảo hóa danh sách)**:
  * **Chỉ định**: Áp dụng bắt buộc khi Leaderboard hiển thị danh sách lớn hơn **100 dòng**.
  * **Thực thi**: Chỉ render các node DOM hiển thị trong khung nhìn (viewport) cộng thêm một vùng đệm nhỏ (buffer rows), giải phóng tài nguyên RAM của thiết bị di động rẻ tiền.

* **Realtime Listener Cleanup (Dọn dẹp luồng nghe)**:
  * **STRICT RULE**: Mọi hàm `useEffect` thiết lập `onSnapshot` **MUST** hoàn trả hàm hủy kết nối ở khối dọn dẹp (cleanup function).
  * **Example**:
    ```typescript
    useEffect(() => {
      const unsubscribe = athleteRepository.listenToAthletes(data => {
        setAthletes(data);
      });
      return () => unsubscribe(); // Tránh rò rỉ rác bộ nhớ nghe ngầm
    }, []);
    ```

* **Debouncing & Throttling**:
  * **Debounce (200ms - 300ms)**: Áp dụng cho ô nhập liệu tìm kiếm tên VĐV để tránh tính toán lọc mảng liên tục trên từng phím gõ.
  * **Throttle (100ms - 150ms)**: Áp dụng cho các sự kiện cuộn màn hình hoặc resize cửa sổ trên Liveboard.

---

## SECTION 9: ERROR BOUNDARY ARCHITECTURE

Hệ thống frontend của VSC Platform áp dụng triết lý **"Graceful Degradation" (Suy thoái duyên dáng)**: Một thành phần nhỏ bị lỗi không được phép kéo sập toàn bộ ứng dụng đang chạy.

```text
+-------------------------------------------------------------------------+
|                       GLOBAL ERROR BOUNDARY                             |
|  (Renders full screen fallback if app completely fails to boot)         |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                       MODULE ERROR BOUNDARY                             |
|  (Isolates failure inside specific panels e.g., Leaderboard or Settings)|
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                        ROW ERROR BOUNDARY                               |
|  (Graceful placeholder UI for single row failures, no layout shifts)    |
+-------------------------------------------------------------------------+
```

### 9.1. Các phân vùng xử lý lỗi (Error Segregations)

1. **Global Error Boundary**:
   * Bọc toàn bộ ứng dụng ở cấp cao nhất.
   * Khi xảy ra lỗi thảm họa (Crash mã nguồn hệ thống), hiển thị màn hình thông báo thân thiện với người dùng, tự động lưu vết lỗi vào Firestore Audit Logs, cung cấp nút "Tải lại ứng dụng".

2. **Module Error Boundary**:
   * Bọc quanh các phân hệ độc lập (e.g., `LeaderboardPanel`, `ScoringPanel`).
   * Nếu bảng điểm bị lỗi render do dữ liệu đầu vào không hợp lệ, phân hệ cài đặt bên cạnh vẫn hoạt động bình thường để trọng tài điều chỉnh lại thông số.

3. **Phân loại lỗi và kịch bản ứng phó (Error Handling Matrix)**:
   * **Firestore Connection Error**: Hiển thị đám mây xám gạch chéo nhấp nháy báo mất kết nối đám mây, tự động chuyển sang chế độ lưu trữ Local Offline Queue.
   * **Authentication Error**: Xóa sạch token lỗi thời trong bộ nhớ và chuyển hướng người dùng an toàn về `/auth` kèm giải thích lý do rõ ràng.
   * **Permission Error**: Hiển thị thông báo "Không có quyền truy cập" bằng thẻ đỏ cảnh báo, chặn các hành động bấm phím trái phép.

---

## SECTION 10: THEME ARCHITECTURE

Hệ thống giao diện của VSC Platform không bao giờ hardcode mã màu trực tiếp vào components. Toàn bộ thiết kế phải vận hành thông qua hệ thống **Design Tokens** được định nghĩa tập trung.

### 10.1. Hệ thống Tokens chủ đề (Theme Token System)

```css
/* src/app/styles/index.css */
@import "tailwindcss";

@theme {
  /* Brand Palettes */
  --color-canvas-light: #F9FAFB;
  --color-canvas-dark: #0B0F19;
  
  --color-surface-light: #FFFFFF;
  --color-surface-dark: #1E293B;
  
  --color-accent-emerald: #10B981;
  --color-accent-gold: #F59E0B;
  --color-accent-crimson: #EF4444;
  --color-accent-violet: #8B5CF6;
  
  /* Typography Scale */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}
```

### 10.2. Các chế độ hiển thị chuyên biệt (Theme Modes Matrix)

1. **Light Theme (Chủ đề sáng)**:
   * Phù hợp cho trọng tài và ban tổ chức làm việc ban ngày hoặc ngoài trời nắng có bóng râm nhẹ.
   * Tương phản cao: Chữ đen sẫm `#0F172A` trên nền trắng tinh `#FFFFFF`.

2. **Dark Theme (Chủ đề tối)**:
   * Chủ đề mặc định của hệ thống. Tạo cảm giác hiện đại, thể thao điện tử chuyên nghiệp.
   * An toàn cho mắt: Canvas tối `#0B0F19`, hộp thẻ `#1E293B`, viền phân tách `#334155`.

3. **TV/LED Theme (Chủ đề LED trình chiếu)**:
   * Thiết kế cực cực tương phản (WCAG AAA). Nền đen sâu `#020617` để triệt tiêu ánh sáng thừa của màn hình LED, chữ vàng rực hoặc xanh ngọc bọc viền sắc nét.

4. **OBS Overlay (Chủ đề OBS)**:
   * Nền xanh lá chuẩn Chroma-key `#00FF00` hoặc xanh dương `#0000FF` để bóc tách luồng phát sóng.

---

## SECTION 11: ANIMATION ARCHITECTURE

Sử dụng thư viện chuyển động phần cứng **Framer Motion / Motion** (`motion/react`) để thiết kế các hiệu ứng mượt mà nhưng tiết kiệm pin tối đa.

### 11.1. Các quy tắc chuyển động bắt buộc (Animation Rules)

1. **Layout Transitions (Chuyển đổi giao diện)**:
   * Khi chuyển tab hoặc đổi vòng đấu, **MUST** sử dụng hiệu ứng chuyển dịch mềm (soft crossfade) thay vì giật lác đột ngột.
   * Sử dụng thuộc tính `layoutId` của Framer Motion để tạo hiệu ứng thanh gạch chân chạy mượt mà dưới tab được chọn.

2. **Ranking Animation (Xếp hạng sống động)**:
   * Khi điểm số thay đổi kéo theo sự biến động thứ hạng trên Liveboard, các hàng VĐV **MUST** trượt đổi vị trí cho nhau một cách mượt mà nhờ cơ chế Layout Animation của thư viện Motion.
   * Hàng của VĐV vừa tăng điểm **MUST** nhấp nháy phát sáng nhẹ sắc vàng trong **1.5 giây** để thu hút sự chú ý.

3. **Reduced Motion Support**:
   * Hệ thống **MUST** liên tục kiểm tra cấu hình hệ điều hành của thiết bị người dùng. Nếu phát hiện chế độ "Giảm chuyển động" (`prefers-reduced-motion: reduce`), toàn bộ các hiệu ứng trượt, phóng to thu nhỏ, hoặc bay lượn **MUST** được tự động tắt bỏ hoàn toàn, chỉ giữ lại các hiệu ứng ẩn hiện mờ (fade) đơn giản nhất.

---

## SECTION 12: TESTING ARCHITECTURE

Kiến trúc kiểm thử của VSC Platform được chia thành 4 lớp phòng thủ nghiêm ngặt để đảm bảo sự ổn định tuyệt đối của hệ thống trước khi triển khai thực tế.

```text
+-------------------------------------------------------------------------+
|                         UNIT TESTS (Vitest)                             |
|  (Tests pure utility calculators, validators, and formatters)          |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                  COMPONENT TESTS (Testing Library)                      |
|  (Tests Atoms, Molecules, and Organisms behaviors under mock props)     |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                INTEGRATION TESTS (Playwright / Cypress)                 |
|  (End-to-End simulation of user journeys: Scoring to Leaderboard Sync)  |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                REGRESSION & ACCESSIBILITY AUDITS                        |
|  (Lighthouse, WCAG validation, and Firestore security rule dry-runs)    |
+-------------------------------------------------------------------------+
```

### 12.1. Ma trận kiểm thử (Testing Strategy Matrix)

1. **Unit Test (Kiểm thử đơn vị)**:
   * Mục tiêu: Các hàm trong `src/utils/` (định dạng, tính điểm phụ trợ) và các logic của Repository độc lập.
   * Công cụ: **Vitest**.
   * Yêu cầu: Đạt độ phủ mã nguồn (coverage) tối thiểu 90% cho phần utils.

2. **Component Test (Kiểm thử linh kiện hiển thị)**:
   * Mục tiêu: Kiểm tra hành vi render của các Molecules và Organisms quan trọng (e.g., bàn phím gõ điểm có nhận đúng phím bấm, nút khóa vòng có hiển thị đúng cảnh báo kép).
   * Công cụ: **React Testing Library**.

3. **Integration Test (Kiểm thử tích hợp đầu cuối)**:
   * Mục tiêu: Giả lập toàn bộ hành trình nghiệp vụ: Trọng tài nhập điểm ở trang Scoring -> Điểm ghi nhận -> Leaderboard tự động xếp hạng lại -> Ranh giới loại dịch chuyển vị trí -> OBS cập nhật điểm.
   * Công cụ: **Playwright** hoặc **Cypress**.

4. **Firestore Mock Testing**:
   * Áp dụng **Firebase Local Emulator Suite** để giả lập các tương tác đọc ghi cơ sở dữ liệu và kiểm thử các quy tắc bảo mật (`firestore.rules`) mà không làm ảnh hưởng đến dữ liệu cloud thực tế.

---

## SECTION 13: NAMING CONVENTIONS

Sự nhất quán trong việc đặt tên giúp bất kỳ nhà phát triển mới nào cũng có thể hiểu ngay vai trò của một file hoặc biến số chỉ trong 1 giây.

### 13.1. Bảng quy chuẩn đặt tên (Naming Standard Reference)

| Loại Thực thể | Phong cách Đặt tên | Ví dụ Cụ thể | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Component** | **PascalCase** | `LeaderboardTable.tsx` | Tên file trùng khít với tên Component bên trong. |
| **Custom Hook** | **camelCase** (bắt đầu bằng `use`) | `useLeaderboard.ts` | Chỉ đặt trong thư mục `src/hooks/`. |
| **TypeScript Type** | **PascalCase** | `AthleteModel`, `ScoreData` | Đặt tên rõ ràng, tránh đặt tên chung chung như `Data`. |
| **TypeScript Interface** | **PascalCase** (bắt đầu bằng `I`) | `IAthleteRepository` | Chỉ sử dụng cho các khai báo trừu tượng. |
| **Enum** | **PascalCase** | `RoundStatusEnum` | Các giá trị bên trong ghi HOA toàn bộ (e.g., `ACTIVE`, `FINISHED`). |
| **Constant** | **UPPER_SNAKE_CASE** | `MAX_ROUND_MULTIPLIER` | Toàn bộ chữ in hoa, phân tách bằng dấu gạch dưới. |
| **Utility Function** | **camelCase** | `formatScoreNumber()` | Tên hàm mang tính hành động (động từ đi trước). |
| **Repository File** | **camelCase** (đuôi `Repository`) | `athleteRepository.ts` | Đóng gói chức năng truy vấn dữ liệu. |
| **Context File** | **PascalCase** (đuôi `Context`) | `ScoringContext.tsx` | Bao gồm cả Provider trong cùng tệp. |

---

## SECTION 14: IMPORT RULES

Hệ thống thiết lập hàng rào ranh giới nhập khẩu (Import Boundaries) để ngăn chặn mã nguồn bị đan xen chéo, gây lỗi phân rã liên kết và khó khăn khi thực hiện đóng gói ứng dụng.

### 14.1. Quy tắc hàng rào Nhập khẩu (Import Boundary Matrix)

```text
+-----------------------+      Có thể import      +-----------------------+
|  Presentation Layer   | ──────────────────────> |      Hooks Layer      |
|    (Pages, Views)     |                         |  (useLeaderboard,...) |
+-----------------------+                         +-----------------------+
            │                                                 │
            │ Có thể import                                   │ Có thể import
            ▼                                                 ▼
+-----------------------+                         +-----------------------+
|   Components Layer    |                         |   Repository Layer    |
|   (Atoms, Organisms)  |                         | (athleteRepository,..)|
+-----------------------+                         +-----------------------+
            │                                                 │
            │ Có thể import                                   │ Có thể import
            ▼                                                 ▼
+-------------------------------------------------------------------------+
|                  Infrastructure Layer / Common Helpers                  |
|          (Firebase Service, Types, Utils, Constants, Styles)            |
+-------------------------------------------------------------------------+
```

1. **Quy tắc Tuyến tính một chiều (One-Way Directional Flow)**:
   * Các linh kiện giao diện ở lớp sâu hơn **NEVER** được phép import ngược các thành phần ở lớp nông hơn (e.g., Một linh kiện UI Atom `Button` tuyệt đối không được import một Molecule `AthleteRow` hay một Page `/referee/scoring`).
   * Tầng Repository **NEVER** được chứa bất kỳ mã nguồn nào liên quan đến React Components hay React state. Nó hoàn toàn là JavaScript/TypeScript thuần túy.

2. **Circular Dependency Ban**:
   * Tuyệt đối không để xảy ra vòng lặp import (A import B, B lại import A). Mọi lỗi phát hiện bởi linter liên quan đến Circular Dependency **MUST** được xử lý ngay lập tức bằng cách di chuyển phần logic chung lên một tệp tin cấu hình trung gian độc lập.

---

## SECTION 15: CODING CONVENTIONS

Mã nguồn của VSC Platform là tác phẩm nghệ thuật kỹ thuật số có độ trau chuốt cực cao.

### 15.1. Quy chuẩn Lập trình chi tiết (Detailed Coding Standards)

1. **TypeScript Strict Mode**:
   * Khóa cấu hình `"strict": true` trong `tsconfig.json` là bắt buộc.
   * **FORBIDDEN**: Không sử dụng kiểu dữ liệu ẩn danh `any`. Mọi thực thể dữ liệu truyền qua biên hàm **MUST** có định nghĩa kiểu rõ ràng. Nếu bất khả kháng, sử dụng `unknown` kèm theo cơ chế Type Guard để ép kiểu an toàn.

2. **ESLint & Prettier Alignment**:
   * Hệ thống tự động kiểm tra định dạng dòng cốt mã trước khi cho phép đóng dấu commit.
   * Sử dụng dấu nháy kép cho thuộc tính JSX (`className="text-white"`), dấu nháy đơn cho mã nguồn TypeScript (`import x from 'y'`). Không sử dụng dấu chấm phẩy thừa nếu cấu hình dự án quy định bỏ.

3. **React Best Practices**:
   * Sử dụng Functional Components hoàn toàn kết hợp với React Hooks. Không sử dụng Class Components cổ điển.
   * Hàm `useEffect` **MUST NOT** chứa danh sách phụ thuộc mập mờ (no empty object/array dependencies unless heavily memoized).

4. **Tailwind Class Order**:
   * Sắp xếp các lớp Tailwind CSS theo trình tự tiêu chuẩn:
     1. Layout/Display (e.g., `flex`, `grid`, `absolute`)
     2. Box Model/Sizing (e.g., `w-full`, `max-w-md`, `p-4`)
     3. Typography (e.g., `text-lg`, `font-bold`)
     4. Visuals/Colors (e.g., `bg-slate-900`, `text-white`, `border`)
     5. Interactivity/Transitions (e.g., `hover:scale-105`, `transition`)

5. **Comment Convention (Quy tắc Chú thích)**:
   * Viết chú thích mã nguồn bằng tiếng Việt chuẩn, rõ ràng, tập trung vào giải thích **TẠI SAO** làm thế chứ không giải thích mã nguồn làm thế nào (vì mã nguồn tự thân đã phải đủ sạch để người đọc tự hiểu).

---

### PHẦN KẾT: TÍNH THI THI HÀNH CỦA HIẾN PHÁP KIẾN TRÚC
Tài liệu Frontend Architecture Specification (FAS) V1.0 này có hiệu lực tối cao đối với toàn bộ hoạt động xây dựng, cải tiến và nâng cấp giao diện của **VSC Platform V3**. Mọi thay đổi không tuân thủ cấu trúc thư mục, mô hình luồng dữ liệu, hay các quy tắc bảo mật truy cập dữ liệu trong tài liệu này đều bị coi là **lỗi nghiêm trọng** và sẽ bị hệ thống kiểm soát chất lượng tự động ngăn chặn triển khai.

Hãy cùng nhau kiến tạo một nền tảng công nghệ Slingshot bền vững, tinh tế và dẫn đầu xu thế!
