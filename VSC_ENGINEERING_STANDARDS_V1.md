# HIẾN PHÁP LẬP TRÌNH & TIÊU CHUẨN KỸ THUẬT VSC V1.0
## VSC ENGINEERING STANDARDS & DEVELOPMENT CONSTITUTION
### HỆ THỐNG QUẢN TRỊ MÃ NGUỒN TỐI CAO - VSC PLATFORM V3

---

## MỞ ĐẦU
Tài liệu **VSC Engineering Standards & Development Constitution V1.0** thiết lập khung quy tắc, tiêu chuẩn kỹ thuật và quy trình kiểm soát mã nguồn tối cao đối với toàn bộ kỹ sư phát triển và tác nhân trí tuệ nhân tạo (AI Developer) tham gia xây dựng **VSC Platform V3 (Vietnam Slingshot Championship)**.

Mọi dòng code được đưa vào hệ thống **MUST** tuân thủ tuyệt đối các tiêu chuẩn trong tài liệu này. Không có bất kỳ ngoại lệ nào được chấp nhận. Các quy tắc này được thiết kế để duy trì tính nhất quán hoàn hảo, độ tin cậy tuyệt đối, khả năng vận hành thời gian thực 60 FPS, và khả năng mở rộng quy mô lớn (Enterprise-Ready) của hệ thống.

---

## CHAPTER 1: GENERAL CODING PRINCIPLES (NGUYÊN TẮC LẬP TRÌNH CHUNG)

Mọi tệp tin mã nguồn trong VSC Platform **MUST** được xây dựng trên nền tảng của các nguyên lý thiết kế phần mềm kinh điển:

1. **SOLID Principles**:
   * **Single Responsibility Principle (SRP)**: Mỗi class, function, module chỉ đảm nhận một trách nhiệm duy nhất. Một component không vừa render UI vừa tính toán điểm số.
   * **Open/Closed Principle (OCP)**: Mã nguồn dễ dàng mở rộng chức năng (ví dụ: thêm loại vòng đấu mới) nhưng không cần sửa đổi các core engine hiện tại.
   * **Liskov Substitution Principle (LSP)**: Các lớp con hoặc implementation của repository phải thay thế hoàn toàn cho lớp cha/interface mà không làm sập luồng nghiệp vụ.
   * **Interface Segregation Principle (ISP)**: Thiết kế interfaces nhỏ gọn, chuyên biệt. UI component chỉ nhận đúng phần giao diện props cần thiết thay vì nhận toàn bộ model thô.
   * **Dependency Inversion Principle (DIP)**: Tầng hiển thị phụ thuộc vào tầng trừu tượng (Interfaces/Abstract Classes), không phụ thuộc trực tiếp vào tầng hạ tầng (Firestore SDK).

2. **DRY (Don't Repeat Yourself)**:
   * Tuyệt đối không sao chép (copy-paste) mã nguồn. Logic tính điểm, định dạng chuỗi, hay cấu hình phong cách **MUST** được gom thành các helper thuần túy (pure helpers) hoặc custom hooks dùng chung.

3. **KISS (Keep It Simple, Stupid)**:
   * Viết code tường minh, dễ hiểu, tránh các giải thuật lồng ghép phức tạp không cần thiết (over-engineering). Ưu tiên các giải pháp đơn giản, tối ưu hóa khả năng đọc hiểu của lập trình viên tiếp theo.

4. **YAGNI (You Aren't Gonna Need It)**:
   * Chỉ viết code phục vụ cho các yêu cầu nghiệp vụ thực tế đã được định nghĩa trong Business Rules. Không tự biên soạn các tính năng dự phòng, các tham số cấu hình tương lai khi chưa có yêu cầu cụ thể.

5. **Clean Code & Clean Architecture**:
   * Mã nguồn tự thân phải đóng vai trò là tài liệu hướng dẫn (self-documenting code). Đặt tên biến, hàm rõ ràng và giữ độ dài mỗi file không quá 300 dòng bằng cách chia nhỏ module (Modularity).
   * Phân tách rạch ròi các tầng: UI (Presentation) ➜ Hooks (Application) ➜ Repositories (Domain/Data Access) ➜ Firebase/Services (Infrastructure).

6. **Composition over Inheritance**:
   * Ưu tiên lắp ghép hành vi và giao diện thông qua React composition (ví dụ: `props.children` hoặc kết hợp hooks) thay vì xây dựng các cây thừa kế sâu (inheritance hierarchies).

7. **Dependency Injection (DI)**:
   * Truyền các dependencies (services, config, repositories) vào thông qua parameters hoặc React Context thay vì khởi tạo cứng (new/import trực tiếp) bên trong các components.

---

## CHAPTER 2: REACT STANDARDS (TIÊU CHUẨN PHÁT TRIỂN REACT)

Kiến trúc UI được xây dựng trên nền tảng React (Vite) **MUST** tuân thủ các quy tắc tổ chức sau:

1. **Component Structure**:
   * Tất cả components **MUST** là Functional Components sử dụng Hooks. Tuyệt đối không viết Class Components.
   * Định cấu trúc một component file theo trật tự:
     1. Import statements (tuân thủ Chapter 7).
     2. TypeScript Types/Interfaces cục bộ phục vụ riêng cho component.
     3. Khai báo Component chính (`export const MyComponent = React.memo(...)`).
     4. Khai báo các sub-components tĩnh hoặc helpers nội bộ của file ở đáy trang.

2. **Folder Structure**:
   * Tuân thủ chính xác cấu trúc thư mục quy định tại **FAS V1.0**. Mọi component UI dùng chung đặt tại `src/components/ui/`, component nghiệp vụ đặt tại `src/components/features/[feature_name]/`.

3. **Hooks & Custom Hooks**:
   * Tuân thủ nghiêm ngặt **Rules of Hooks**: Chỉ gọi hooks ở cấp cao nhất của component, không gọi trong vòng lặp, câu điều kiện hoặc các hàm lồng nhau.
   * Toàn bộ logic giao tiếp dữ liệu, quản lý trạng thái luồng nghe, hoặc tính toán nghiệp vụ màn hình **MUST** được đóng gói bên trong Custom Hooks (e.g., `useLeaderboard`, `useScoring`) đặt tại `src/hooks/`.

4. **Memoization Policy (React.memo, useMemo, useCallback)**:
   * **React.memo**: Bắt buộc sử dụng cho các component nằm trong vòng lặp lặp lại nhiều lần (e.g., hàng bảng điểm `AthleteRow`, ô nhập bệ bắn).
   * **useMemo**: Áp dụng cho mọi phép biến đổi, lọc, tính điểm phái sinh (Derived State) từ dữ liệu thô. Khóa phụ thuộc (dependencies) **MUST** là các giá trị nguyên thủy (primitives).
   * **useCallback**: Bọc mọi callback function được truyền xuống các component con đã bọc `React.memo` để tránh rác tham chiếu địa chỉ vùng nhớ gây re-render vô ích.

5. **React Context**:
   * Chỉ sử dụng Context cho các module trạng thái lớn (e.g., Phiên làm việc của Trọng tài tại bệ bắn, Trạng thái giải đấu hiện hành). Tách biệt các Context theo đúng phạm vi trách nhiệm, tránh tạo ra một "Global State" khổng lồ chứa mọi thứ.

6. **Suspense & Lazy Loading**:
   * Áp dụng Code Splitting thông qua `React.lazy()` và `<Suspense>` cho các phân hệ admin cấu hình nặng, biểu đồ phân tích thống kê để giảm kích thước bundle tải ban đầu giúp trang tải tức thì.

7. **Error Boundaries**:
   * Bọc toàn bộ các module UI độc lập (e.g., `LeaderboardPanel`, `ScoringPad`) trong các Error Boundary cục bộ để cô lập lỗi hiển thị, ngăn chặn lỗi render của một thành phần kéo sập toàn bộ giao diện đang chạy.

---

## CHAPTER 3: TYPESCRIPT STANDARDS (TIÊU CHUẨN TYPESCRIPT)

Dự án vận hành hoàn toàn trong chế độ định kiểu nghiêm ngặt (Strictly Typed):

1. **Strict Mode**:
   * Thuộc tính `"strict": true` trong `tsconfig.json` **MUST** được kích hoạt. Không được sử dụng các cờ bypass kiểm tra kiểu hoặc tắt cảnh báo của trình biên dịch.

2. **Interface vs Type**:
   * **Interface**: Sử dụng để định nghĩa cấu trúc dữ liệu mô hình (Models), định nghĩa các API hợp đồng của Repositories (e.g., `IAthleteRepository`). Cho phép mở rộng thông qua kế thừa (`extends`).
   * **Type**: Sử dụng cho các cấu hình giao diện UI, định nghĩa unions (`'admin' | 'referee'`), intersection types, hoặc định nghĩa các kiểu hàm (Callback signatures).

3. **Readonly & Immutability**:
   * Đánh dấu `readonly` cho các thuộc tính của mảng hoặc đối tượng cấu hình hệ thống để tránh các hành vi đột biến dữ liệu vô tình (accidental mutations).

4. **Generic Types**:
   * Sử dụng Generics cho các thành phần dùng chung có tính linh hoạt cao (e.g., `ApiResponse<T>`, `DropdownProps<T>`) để đảm bảo bảo toàn định kiểu từ nguồn cấp tới điểm nhận.

5. **Enum Policy**:
   * **MUST** sử dụng cấu trúc `enum` chuẩn (Standard Enum) cho các tập hợp trạng thái có giới hạn (e.g., `RoundStatusEnum`, `AthleteStatusEnum`).
   * **MUST NOT** sử dụng `const enum` để đảm bảo tính tương thích khi biên dịch và bảo toàn metadata lúc thực thi.

6. **The Absolute Ban of "any"**:
   * Nghiêm cấm sử dụng từ khóa `any` dưới mọi hình thức. Mọi biến, tham số, dữ liệu trả về **MUST** có kiểu rõ ràng. Nếu dữ liệu chưa xác định, bắt buộc sử dụng `unknown` kèm theo các hàm Type Guard để ép kiểu an toàn.

7. **Exhaustive Switch Checks**:
   * Khi thực hiện switch-case qua các giá trị Enum hoặc Union, **MUST** sử dụng kiểm tra đầy đủ (Exhaustive Check) bằng cách map case `default` sang kiểu `never`. Điều này giúp phát hiện lỗi biên dịch ngay lập tức nếu sau này thêm giá trị mới vào Enum.

8. **Utility Types**:
   * Sử dụng thành thạo các Built-in Utility Types của TypeScript như `Pick`, `Omit`, `Partial`, `Record`, `Required` để biến đổi các interface mô hình gốc thành cấu trúc props phù hợp cho UI mà không cần khai báo trùng lặp mã.

---

## CHAPTER 4: FIRESTORE STANDARDS (TIÊU CHUẨN GIAO TIẾP FIRESTORE)

Firestore là Single Source of Truth của hệ thống. Tầng giao diện (UI Layer) chịu một rào cản kiến trúc tuyệt đối đối với cơ sở dữ liệu:

1. **UI MUST NEVER CALL FIRESTORE SDK DIRECTLY**:
   * Nghiêm cấm tầng hiển thị (Components, Pages, Layouts) import hoặc gọi trực tiếp các hàm SDK của Firebase/Firestore như:
     * `collection()`, `doc()`, `query()`, `where()`, `orderBy()`
     * `getDoc()`, `getDocs()`, `onSnapshot()`
     * `addDoc()`, `setDoc()`, `updateDoc()`, `deleteDoc()`, `runTransaction()`
   * Tất cả các tương tác đọc/ghi cơ sở dữ liệu **MUST** được đóng gói 100% bên trong lớp **Repository Layer** và cung cấp ra ngoài cho UI thông qua **Custom Hooks**.

---

## CHAPTER 5: REPOSITORY STANDARDS (TIÊU CHUẨN TẦNG TRUY CẬP DỮ LIỆU)

Để đảm bảo tính độc lập và khả năng bảo trì cao, cấu trúc lớp Data Access Layer (DAL) phải phân tách rõ ràng các vai trò:

```text
+-------------------------------------------------------------------------+
|                              REPOSITORY                                 |
|  (Đóng gói logic truy vấn Firestore, trả về chuẩn Interfaces, Mapper)   |
+-------------------------------------------------------------------------+
       │                      │                      │
       ▼                      ▼                      ▼
+--------------+       +--------------+       +--------------+
|   SERVICE    |       |  VALIDATOR   |       |    MAPPER    |
| (Integration)|       | (Data Check) |       | (Data Adapt) |
+--------------+       +--------------+       +--------------+
       │                      │                      │
       ▼                      ▼                      ▼
+--------------+       +--------------+       +--------------+
|    FACTORY   |       |  SERIALIZER  |       |    PARSER    |
| (Instantiate)|       | (Data Pack)  |       | (Data Unpack)|
+--------------+       +--------------+       +--------------+
```

1. **Repository**:
   * Thực thể duy nhất tiếp xúc với Firestore SDK. Nhận tham số thô, thực hiện truy vấn và trả về dữ liệu chuẩn TypeScript Interfaces. Chứa các phương thức lắng nghe thời gian thực (`listenToAthletes`).

2. **Hook**:
   * Cầu nối giữa UI và Repository. Quản lý vòng đời lắng nghe dữ liệu, cập nhật state của React và dọn dẹp bộ lắng nghe khi component unmount.

3. **Service**:
   * Đóng gói tương tác với các hệ thống bên thứ ba hoặc hạ tầng phần cứng ngoài Firestore (e.g., Audio/Haptic engines, Auth service).

4. **Utility**:
   * Hàm thuần túy (pure functions) thực hiện các tác vụ tính toán toán học hoặc định dạng chung, không lưu trạng thái (e.g., `formatTimestamp`).

5. **Validator**:
   * Chịu trách nhiệm kiểm tra tính hợp lệ của dữ liệu đầu vào trước khi thực hiện ghi dữ liệu lên Firestore (e.g., kiểm tra điểm số nhập vào có nằm trong khoảng cho phép [0-10]).

6. **Mapper**:
   * Chuyển đổi dữ liệu thô nhận được từ Firestore thành cấu hình Model phù hợp cho giao diện người dùng hiển thị nếu cấu trúc lưu trữ và cấu trúc hiển thị khác biệt nhau.

7. **Factory**:
   * Chịu trách nhiệm khởi tạo các thực thể dữ liệu mới với các giá trị mặc định chuẩn xác (e.g., tạo cấu trúc bản ghi VĐV đăng ký mới).

8. **Serializer & Parser**:
   * **Serializer**: Đóng gói đối tượng phức tạp thành chuỗi ký tự hoặc cấu trúc dẹt (flat object) an toàn để ghi lên Firestore hoặc lưu vào `localStorage`.
   * **Parser**: Giải mã chuỗi ký tự hoặc dữ liệu lưu trữ thô ngược lại thành thực thể dữ liệu có đầy đủ kiểu định dạng trong bộ nhớ RAM của ứng dụng.

---

## CHAPTER 6: NAMING CONVENTION (QUY CHUẨN ĐẶT TÊN)

Sự nhất quán tuyệt đối về tên gọi là bắt buộc đối với toàn bộ hệ thống file và biến số:

* **File**:
  * Component file: **PascalCase** (e.g., `LeaderboardTable.tsx`).
  * Hooks, Repositories, Utils, Services: **camelCase** (e.g., `useLeaderboard.ts`, `athleteRepository.ts`).
* **Folder**: **camelCase** toàn bộ (e.g., `components`, `features`, `referee`).
* **Variable**: **camelCase** mô tả rõ nghĩa (e.g., `activeAthleteId`). Tuyệt đối không đặt tên biến viết tắt vô nghĩa như `a`, `b`, `temp`.
* **Function**: **camelCase** dạng động từ đứng đầu hành động (e.g., `calculateScoreTotal`, `formatScoreDisplay`).
* **Component**: **PascalCase** danh từ (e.g., `ScoreKeyboard`).
* **Hook**: **camelCase** bắt đầu bằng tiền tố `use` (e.g., `useAuth`).
* **Interface**: **PascalCase** bắt đầu bằng chữ `I` (e.g., `IAthleteRepository`).
* **Type**: **PascalCase** hậu tố mô tả mục đích (e.g., `UserRoleType`, `ScoringState`).
* **Enum**: **PascalCase** danh từ (e.g., `RoundStatusEnum`). Các trường giá trị bên trong ghi HOA toàn bộ và cách nhau bằng gạch dưới (e.g., `ACTIVE`, `FINISHED`).
* **Constant**: **UPPER_SNAKE_CASE** (e.g., `MAX_ROUND_MULTIPLIER`).
* **Event & Callback**:
  * Event: Danh từ chỉ hành động (e.g., `scoreClick`).
  * Callback Props: Tiền tố `on` đi trước động từ (e.g., `onScoreChange`, `onConfirmCancel`).
* **Context & Provider**:
  * Context: **PascalCase** kết thúc bằng `Context` (e.g., `ScoringContext`).
  * Provider: **PascalCase** kết thúc bằng `Provider` (e.g., `ScoringProvider`) và nằm chung trong cùng tệp với Context tương ứng.
* **Repository & Service**:
  * Repository: **camelCase** kết thúc bằng `Repository` (e.g., `scoreRepository.ts`).
  * Service: **camelCase** kết thúc bằng `Service` (e.g., `audioService.ts`).

---

## CHAPTER 7: IMPORT ORDER (TRẬT TỰ NHẬP KHẨU BẮT BUỘC)

Mọi tệp tin mã nguồn **MUST** sắp xếp các import statement gọn gàng ở đầu trang theo trình tự phân nhóm từ ngoài vào trong:

```typescript
// 1. Third Party Libraries (Thư viện bên thứ ba)
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';

// 2. Shared/Infrastructure Services (Hạ tầng, Config hệ thống)
import { db } from '@/services/firebase/config';
import { audioService } from '@/services/audio/audioService';

// 3. Components (Atoms, Organisms, Layouts)
import { CustomButton } from '@/components/ui/CustomButton';
import { ScoreKeyboard } from '@/components/features/scoring/ScoreKeyboard';

// 4. Custom Hooks (Logic và State)
import { useAuth } from '@/hooks/useAuth';
import { useScoring } from '@/hooks/useScoring';

// 5. Types & Interfaces
import { AthleteModel, ScoreData } from '@/types';

// 6. Utils & Constants & Styles
import { formatScoreNumber } from '@/utils/formatters';
import { MAX_ROUND_MULTIPLIER } from '@/constants/rules';
import './styles.css';
```

---

## CHAPTER 8: ERROR HANDLING (CHIẾN LƯỢC QUẢN LÝ LỖI)

VSC Platform áp dụng triết lý "Graceful Degradation" (Suy thoái duyên dáng) thông qua hệ thống phòng vệ lỗi đa tầng:

```text
+-------------------------------------------------------------------------+
|                        GLOBAL ERROR BOUNDARY                            |
|  (Renders full-screen recovery screen on catastrophic rendering errors) |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                     MODULE / PANEL ERROR BOUNDARY                       |
|  (Isolates crash in specific UI blocks; keeps other panels active)      |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                  REPOSITORY LAYER (Try-Catch & Offline Safe)            |
|  (Catches network/permission errors, falls back to offline local queue)|
+-------------------------------------------------------------------------+
```

1. **Global Error Boundary**:
   * Đặt ở gốc ứng dụng. Khi có lỗi render thảm họa không thể khôi phục, hiển thị màn hình thông báo thân thiện với người dùng, tự động lưu vết lỗi vào Firestore Audit Logs, cung cấp nút "Tải lại ứng dụng".

2. **Repository Layer Error Handling**:
   * Tất cả các hàm ghi của Repository **MUST** được bọc trong các khối `try-catch` chặt chẽ.
   * Khi phát hiện lỗi mất kết nối mạng (`FirebaseError: Key connection failed`), không ném lỗi ra làm sập UI mà **MUST** chuyển trạng thái sang lưu trữ tạm tại hàng đợi ngoại tuyến (Offline Queue) của `localStorage`.

3. **Hook Layer Coordination**:
   * Custom Hooks khi gọi Repository ghi dữ liệu **MUST** cập nhật trạng thái `error` cục bộ và kích hoạt thông báo nổi (Toast Notification) để người dùng nắm được trạng thái.

4. **Component Presentation (Graceful Skeletons)**:
   * Khi component gặp lỗi nạp dữ liệu, hiển thị giao diện báo lỗi tinh tế (Warning Icon kèm text mô tả ngắn) thay vì bỏ trống màn hình hoặc hiện màn hình trắng xóa.

5. **Retry Mechanism**:
   * Đối với các tác vụ đọc dữ liệu cấu hình giải đấu quan trọng thất bại, triển khai cơ chế tự động thử lại (Retry) tối đa 3 lần với khoảng cách thời gian trễ tăng dần (Exponential Backoff: 1s, 2s, 4s) trước khi báo lỗi chính thức lên UI.

---

## CHAPTER 9: PERFORMANCE BENCHMARKS (HIỆU NĂNG TỐI THƯỢNG)

Hệ thống giao diện và bảng xếp hạng thời gian thực của VSC Platform phải đảm bảo các chỉ số hiệu năng khắt khe:

1. **Memoization First**:
   * Mọi mảng danh sách vận động viên, danh sách bệ bắn **MUST** sử dụng `React.memo` cho các phần tử dòng để tránh hiện tượng re-render toàn bộ bảng khi chỉ có một bệ bắn thay đổi điểm số.

2. **List Virtualization**:
   * Bảng xếp hạng Leaderboard khi hiển thị số lượng vận động viên vượt quá **100 bản ghi** **MUST** kích hoạt cơ chế ảo hóa dòng (Virtualization) để chỉ vẽ các thẻ DOM đang hiển thị trong viewport, giải phóng dung lượng RAM của thiết bị di động.

3. **Debounce & Throttle**:
   * **Debounce (300ms)**: Áp dụng bắt buộc cho ô nhập liệu tìm kiếm tên, mã số VĐV để tránh kích hoạt tính toán mảng mệt mỏi trên mỗi phím gõ.
   * **Throttle (150ms)**: Áp dụng cho các sự kiện cuộn màn hình hoặc đổi kích thước cửa sổ trên TV Liveboard.

4. **Offline Caching**:
   * Firestore SDK **MUST** được cấu hình chế độ lưu trữ cache đệm ngoại tuyến (`enableIndexedDbPersistence`) tại file dịch vụ khởi tạo để tăng tốc độ tải trang từ lần thứ hai trở đi xuống dưới 50ms.

5. **Image Optimization**:
   * Toàn bộ ảnh đại diện VĐV, ảnh nhà tài trợ **MUST** áp dụng kỹ thuật Lazy Loading (`loading="lazy"`), giới hạn kích thước tối đa qua CDN, và khai báo thuộc tính `referrerPolicy="no-referrer"` trên React thẻ `<img>`.

6. **Batch Firestore Writes**:
   * Khi thực hiện cập nhật điểm số đồng loạt (e.g., kết thúc vòng đấu, reset bảng điểm bệ bắn), **MUST** sử dụng cơ chế ghi theo lô `writeBatch()` của Firestore để gộp các yêu cầu thành một giao dịch mạng duy nhất, tối ưu hóa băng thông mạng và hạn chế vượt ngưỡng quota ghi của database.

---

## CHAPTER 10: SECURITY CONSTITUTION (HIẾN PHÁP BẢO MẬT)

Bảo vệ tính chính trực của điểm số và dữ liệu giải đấu là nhiệm vụ sống còn:

1. **Strict Firestore Rules**:
   * Toàn bộ các bộ sưu tập dữ liệu (Collections) **MUST** được bảo vệ bằng quy tắc bảo mật `firestore.rules` chặt chẽ ở server:
     * Dữ liệu cấu hình giải đấu (`tournaments`, `rounds`): Chỉ tài khoản có vai trò `Admin` mới có quyền Ghi (`write`). Công chúng chỉ được phép Đọc (`read`).
     * Dữ liệu điểm số (`scores`): Chỉ tài khoản có vai trò `Referee` hoặc `Admin` mới được phép Ghi.
   * Tuyệt đối không để xảy ra kịch bản mở quyền ghi tự do cho mọi người dùng (`allow write: if true`).

2. **Input Validation**:
   * Mọi dữ liệu nhập vào từ bàn phím gõ điểm của trọng tài **MUST** đi qua lớp kiểm định Validator để đảm bảo:
     * Giá trị điểm nằm đúng khoảng hợp lệ (e.g., 0 - 10, X).
     * Điểm số không vượt quá giới hạn tối đa cấu hình của vòng đấu hiện hành.

3. **Sanitization & Escaping**:
   * Ô nhập tìm kiếm tên hoặc form đăng ký thông tin VĐV **MUST** thực hiện bóc tách, khử độc các ký tự HTML nguy hiểm để chống lỗi chèn mã độc (XSS Attacks) trước khi đẩy lên Firestore hoặc lưu xuống local cache.

4. **Role Guards (Phân quyền định tuyến)**:
   * Trình bảo vệ tuyến đường (Route Guards) **MUST** liên tục kiểm tra vai trò người dùng lưu trong Auth Session:
     * Ngăn chặn tuyệt đối người dùng phổ thông truy cập trang cấu hình `/admin`.
     * Ngăn chặn truy cập bệ nhập điểm `/referee/scoring` nếu chưa xác thực tài khoản Trọng tài hợp lệ.

5. **Audit Logs (Lưu vết chỉnh sửa)**:
   * Mọi hành động nhạy cảm (thay đổi cấu hình luật, sửa điểm VĐV sau khi đã xác nhận, xóa bệ bắn) **MUST** tạo ra một bản ghi nhật ký kiểm toán (Audit Log) lưu trữ trên Firestore bao gồm: ID người thực hiện, thời gian chi tiết, giá trị cũ, giá trị mới, và lý do chỉnh sửa.

---

## CHAPTER 11: TESTING ARCHITECTURE (KIẾN TRÚC KIỂM THỬ)

Kiểm thử là chốt chặn phòng ngự cuối cùng chống lỗi phần mềm trong môi trường thực tế:

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
|                  INTEGRATION TESTS (Playwright / Cypress)                 |
|  (End-to-End simulation of user journeys: Scoring to Leaderboard Sync)  |
+-------------------------------------------------------------------------+
```

1. **Unit Tests (Vitest)**:
   * Áp dụng bắt buộc cho các hàm tiện ích tính toán toán học (`src/utils/calculators.ts`), các định dạng hiển thị (`src/utils/formatters.ts`), và các hàm kiểm tra dữ liệu đầu vào (`src/utils/validators.ts`).
   * Yêu cầu độ bao phủ mã nguồn (Code Coverage) tối thiểu đạt **90%** cho khu vực utils này.

2. **Component Tests (React Testing Library)**:
   * Kiểm thử hành vi render, phản hồi sự kiện của các Molecules và Organisms quan trọng (e.g., bàn phím gõ điểm `ScoreKeyboard` có nhận đúng phím bấm, nút khóa vòng đấu có hiển thị đúng cảnh báo kép).

3. **Integration & E2E Tests (Playwright / Cypress)**:
   * Giả lập toàn bộ chu trình vận hành nghiệp vụ cốt lõi: Trọng tài nhập điểm ở bệ bắn ➜ Điểm đồng bộ thời gian thực lên Firestore ➜ Leaderboard tự động xếp hạng lại VĐV ➜ Ranh giới loại dịch chuyển chính xác ➜ OBS overlay tự động cập nhật dải điểm đáy màn hình.

4. **Firestore Local Emulator Suite**:
   * Kiểm thử các tương tác đọc ghi cơ sở dữ liệu và xác minh quy tắc bảo mật `firestore.rules` thông qua công cụ giả lập cục bộ trước khi đẩy cấu hình lên môi trường cloud chính thức.

---

## CHAPTER 12: GIT & WORKFLOW STANDARDS (QUY TRÌNH QUẢN LÝ MÃ NGUỒN)

Đảm bảo lịch sử git sạch đẹp và an toàn tuyệt đối:

1. **Commit Message Convention (Conventional Commits)**:
   * Tiêu đề commit **MUST** bắt đầu bằng các tiền tố chuẩn hóa để mô tả rõ mục đích thay đổi:
     * `feat`: Thêm một tính năng mới (e.g., `feat: tích hợp màn hình đấu phụ solo`).
     * `fix`: Sửa một lỗi kỹ thuật (e.g., `fix: khắc phục lỗi rò rỉ bộ lắng nghe bệ bắn`).
     * `refactor`: Tái cấu trúc mã nguồn không thay đổi hành vi (e.g., `refactor: chia nhỏ component bảng xếp hạng`).
     * `style`: Thay đổi định dạng giao diện, spacing, CSS (e.g., `style: cập nhật design tokens cho TV Mode`).
     * `docs`: Cập nhật tài liệu, hướng dẫn sử dụng (e.g., `docs: bổ sung hiến pháp lập trình V1.0`).
     * `perf`: Tối ưu hóa hiệu năng thực thi (e.g., `perf: áp dụng ảo hóa dòng cho Leaderboard`).

2. **Branching Strategy**:
   * `main`: Nhánh chạy môi trường Production chính thức.
   * `develop`: Nhánh tích hợp các tính năng mới của đội ngũ phát triển.
   * `feature/[feature-name]`: Nhánh phát triển tính năng độc lập (e.g., `feature/referee-scoring-pad`).

3. **Code Review Checklist**:
   * Trước khi merge Pull Request vào nhánh `develop`, người duyệt (Reviewer) **MUST** xác nhận:
     * [ ] Mã nguồn biên dịch thành công hoàn toàn không có lỗi TypeScript hay ESLint.
     * [ ] Đã dọn dẹp triệt để các hàm `onSnapshot` lắng nghe thời gian thực khi component unmount.
     * [ ] Không chứa bất kỳ API key, thông tin nhạy cảm nào trong file code.
     * [ ] Đã có Unit Tests bao phủ đầy đủ các hàm logic mới viết.

4. **Semantic Versioning (SemVer)**:
   * Phiên bản phát hành **MUST** tuân thủ cấu trúc định dạng `MAJOR.MINOR.PATCH` (e.g., `3.0.0`):
     * `MAJOR`: Thay đổi lớn phá vỡ tính tương thích ngược của hệ thống.
     * `MINOR`: Bổ sung tính năng mới an toàn, giữ nguyên tính tương thích ngược.
     * `PATCH`: Sửa các lỗi nhỏ, cải tiến hiệu năng.

---

## CHAPTER 13: THE FORBIDDEN RULES (DANH SÁCH NHỮNG ĐIỀU CẤM KỴ)

Mọi kỹ sư và tác nhân AI **MUST NOT** thực hiện bất kỳ hành vi nào trong danh mục cấm kỵ dưới đây:

1. **NO DUPLICATE CODE**: Nghiêm cấm sao chép nguyên khối logic hoặc phong cách thiết kế UI.
2. **NO HARDCODED STRINGS**: Không viết cứng các nhãn văn bản tiếng Việt/Anh trực tiếp trên component JSX. Toàn bộ chuỗi chữ **MUST** đi qua dải hằng số hoặc hệ thống dịch ngôn ngữ (Translation system).
3. **NO HARDCODED COLORS**: Tuyệt đối không dùng mã màu Hex viết trực tiếp (e.g., `className="bg-[#0b0f19]"`). Toàn bộ màu sắc **MUST** được gọi thông qua các Design Tokens định nghĩa trong CSS Theme (`bg-canvas-dark`, `text-accent-gold`).
4. **NO HARDCODED IDS OR ROUTES**: Không viết cứng các ID bệ bắn, ID vòng đấu mẫu hoặc các đường link chuyển hướng cứng trong mã nguồn. Mọi định tuyến phải gọi qua hằng số định tuyến hệ thống (`ROUTES.ADMIN_SETTINGS`).
5. **NO REPOSITORY BYPASS**: Nghiêm cấm UI component tự ý bỏ qua lớp Repository để liên lạc với Firebase/Firestore SDK.
6. **NO BUSINESS/RANKING BYPASS**: Nghiêm cấm UI tự viết logic xếp hạng, tự tính điểm tổng hay tự quyết định vận động viên bị loại. Toàn bộ logic giải đấu **MUST** được ủy thác hoàn toàn cho Tournament Rules Engine và Ranking Engine.
7. **NO MUTATION OF STATE**: Tuyệt đối không thay đổi trực tiếp giá trị của React State hoặc dữ liệu Firestore trong bộ nhớ RAM mà không thông qua các hàm cập nhật trạng thái có cấu trúc (`setState` hoặc `repository.write`).
8. **NO IGNORED CLEANUPS**: Nghiêm cấm bỏ qua khối dọn dẹp (cleanup function) của `useEffect` khi thiết lập các bộ lắng nghe sự kiện (`addEventListener`) hoặc luồng nghe Snapshots (`onSnapshot`).

---

## CHAPTER 14: DEFINITION OF DONE (TIÊU CHUẨN HOÀN THÀNH TÍNH NĂNG)

Một tính năng, màn hình hiển thị hoặc module nghiệp vụ mới phát triển chỉ được xem là hoàn thành chính thức (Done) và sẵn sàng tích hợp khi và chỉ khi vượt qua toàn bộ danh mục kiểm tra dưới đây:

* [ ] **Compile thành công**: Ứng dụng build thành công hoàn toàn thông qua công cụ kiểm thử biên dịch (`npm run build`).
* [ ] **Không ESLint Error**: Vượt qua hoàn toàn bộ quy tắc linter của dự án (`npm run lint`), không có cảnh báo nghiêm trọng.
* [ ] **Không Type Error**: Không còn bất kỳ cảnh báo kiểu dữ liệu nào của TypeScript.
* [ ] **Không Memory Leak**: Đã khai báo hàm hủy kết nối cho toàn bộ các listeners thời gian thực.
* [ ] **Responsive**: Giao diện hiển thị hoàn hảo, không tràn viền, không loãng bố cục trên cả 5 môi trường hiển thị mục tiêu: Desktop, Tablet, Mobile, TV LED, OBS Overlay.
* [ ] **Accessible**: Đạt điểm tiếp cận tối thiểu 90% trên Lighthouse, đầy đủ nhãn ARIA và hỗ trợ điều khiển tuần tự bằng phím Tab.
* [ ] **Offline Safe**: Hoạt động mượt mà ngay cả khi ngắt kết nối mạng tạm thời, tự nạp dữ liệu từ cache và lưu điểm số vào hàng đợi cục bộ an toàn.
* [ ] **Realtime Safe**: Điểm số và thứ hạng phản hồi cập nhật tức thì dưới 100ms khi có thay đổi dữ liệu từ thiết bị bệ bắn lân cận.
* [ ] **UI Constitution Compliant**: Thiết kế, spacing, typography tuân thủ tuyệt đối quy định của Bản hiến pháp giao diện.
* [ ] **Component Bible Compliant**: Kết cấu, Props, State và các vòng đời của component khớp 100% với Đặc tả thiết kế linh kiện.
* [ ] **Frontend Architecture Compliant**: Cấu trúc tệp tin nằm đúng vị trí thư mục, tuân thủ hàng rào import một chiều quy định trong FAS.
* [ ] **Business Rule Compliant**: Cách thức hiển thị, luật loại bỏ, hệ số nhân tính điểm chính xác tuyệt đối theo tài liệu nghiệp vụ giải đấu.

---

## CHAPTER 15: AI DEVELOPMENT WORKFLOW (QUY TRÌNH PHÁT TRIỂN DÀNH CHO AI)

Mỗi lần tác nhân trí tuệ nhân tạo (AI Developer) thực hiện yêu cầu thay đổi, tạo file mới, sửa lỗi hoặc nâng cấp hệ thống, tác nhân **MUST** thực hiện tuần tự và nghiêm ngặt quy trình làm việc dưới đây để bảo toàn tính toàn vẹn của mã nguồn:

```text
+-------------------------------------------------------------------------+
|                  [BƯỚC 1: ĐỌC VÀ HIỂU SINGLE SOURCE OF TRUTH]           |
|  * Đọc kỹ Business Rules, Firestore Schema, Tournament & Ranking Engine |
|  * Đọc kỹ UI Constitution, FAS, Component Bible, Design Tokens          |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                [BƯỚC 2: KHẢO SÁT HẠ TẦNG HIỆN HÀNH (REPOSITORIES)]       |
|  * Kiểm tra các repository sẵn có, tránh viết trùng lặp hàm truy vấn    |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                   [BƯỚC 3: THỰC THI VIẾT CODE SẠCH]                     |
|  * Đặt tên theo đúng Chapter 6, Sắp xếp import theo đúng Chapter 7      |
|  * Không vi phạm Chapter 13 (Forbidden Rules)                           |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                    [BƯỚC 4: KIỂM TRA CHẤT LƯỢNG (COMPILE)]              |
|  * Thực thi biên dịch kiểm thử toàn bộ ứng dụng                         |
|  * Khắc phục triệt để mọi lỗi cú pháp, kiểu dữ liệu, hoặc ESLint        |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                      [BƯỚC 5: XÁC MINH TUÂN THỦ]                        |
|  * Đối chiếu kỹ lưỡng sản phẩm với dải kiểm tra Definition of Done      |
|  * Hoàn tất lượt Turn và báo cáo kết quả ngắn gọn cho kỹ sư chính       |
+-------------------------------------------------------------------------+
```

---

### PHẦN KẾT: TÍNH THI THI HÀNH CỦA HIẾN PHÁP KỸ THUẬT
Tài liệu **VSC Engineering Standards & Development Constitution V1.0** này có hiệu lực tối cao, bao trùm toàn bộ hoạt động phát triển công nghệ của hệ thống **VSC Platform V3**. Bất kỳ dòng code nào không đạt chuẩn quy định trong tài liệu này đều bị coi là **lỗi kỹ thuật nghiêm trọng** và sẽ không được phép tích hợp vào hệ thống máy chủ vận hành chính thức.

Hãy cùng nhau giữ gìn sự trong sáng, sạch đẹp và mạnh mẽ tối thượng của mã nguồn hệ thống VSC!
