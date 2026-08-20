# VSC PLATFORM V3 - FUNCTIONAL SPECIFICATION V1.0 (FS)
## ĐẶC TẢ CHỨC NĂNG HỆ THỐNG TOÀN DIỆN - VIETNAM SLINGSHOT CHAMPIONSHIP

---

### MỞ ĐẦU
Tài liệu **VSC Functional Specification V1.0** định nghĩa chi tiết mọi hành vi nghiệp vụ và luồng xử lý chức năng của nền tảng **VSC Platform V3**. Mọi luồng hoạt động của hệ thống từ đăng ký, check-in, phân bệ, nhập điểm, tính điểm xếp hạng, đấu súng Solo phụ, cho tới hiển thị LED và OBS overlay phát sóng **MUST** tuân thủ chính xác đặc tả này. 

Tài liệu này không chứa mã nguồn hiển thị, không định nghĩa chi tiết giao diện (UI) hoặc sơ đồ thiết kế vật lý của cơ sở dữ liệu, mà tập trung 100% vào mô tả logic nghiệp vụ vận hành, tính toàn vẹn của dữ liệu và khả năng chịu lỗi thời gian thực.

---

## CHƯƠNG 1: QUẢN LÝ TIẾN TRÌNH & PHÂN HỆ CHỨC NĂNG CỐT LÕI

### 1. PHÂN HỆ: ĐĂNG NHẬP HỆ THỐNG (AUTHENTICATION)

#### 1.1. Chức năng: Đăng nhập tài khoản (Email/Password Login)
*   **Purpose**: Xác thực danh tính người dùng và cấp quyền truy cập hệ thống dựa trên vai trò (Role) tương ứng.
*   **Trigger**: Người dùng truy cập trang `/auth` và nhấn nút "Đăng nhập".
*   **Preconditions**: Tài khoản người dùng đã được quản trị viên (Admin) tạo sẵn trên hệ thống Firebase Auth.
*   **Actors**: System Owner, Admin, Head Referee, Referee, Club Manager, Athlete.
*   **Main Flow**:
    1. Người dùng nhập Email và Mật khẩu vào form.
    2. Nhấn nút "Đăng nhập".
    3. Hệ thống gửi thông tin xác thực đến Firebase Authentication.
    4. Firebase trả về Token xác thực hợp lệ kèm thông tin User UID.
    5. Hệ thống truy vấn thông tin vai trò người dùng trong collection `users` bằng User UID.
    6. Chuyển hướng người dùng về trang Dashboard tương ứng với vai trò của họ.
*   **Alternative Flow (Mất kết nối mạng)**: Xem phân hệ Offline Sync (Mục 19).
*   **Validation**:
    *   Email **MUST** đúng định dạng tiêu chuẩn (Regex).
    *   Mật khẩu **SHALL NOT** để trống và **MUST** có độ dài tối thiểu 6 ký tự.
*   **Business Rules Reference**: Quy tắc phân quyền vai trò người dùng (Chapter 2 - Permission Matrix).
*   **Repository Called**: `authRepository.ts`
*   **Firestore Collections Used**: `users`
*   **Audit Log Generated**: `USER_LOGIN_SUCCESS` hoặc `USER_LOGIN_FAILED`.
*   **Notification Generated**: Không.
*   **Realtime Update**: Không.
*   **Offline Behaviour**: **FORBIDDEN** cho phép đăng nhập mới khi không có mạng. Các phiên làm việc (Session) đã được lưu từ trước có thể tiếp tục hoạt động nếu Token chưa hết hạn.
*   **Error Handling**:
    *   Sai email/mật khẩu: Hiển thị lỗi "Tài khoản hoặc mật khẩu không chính xác".
    *   Tài khoản bị khóa: Hiển thị "Tài khoản này đã bị đình chỉ hoạt động".
*   **Edge Cases**: Người dùng đăng nhập đồng thời trên nhiều thiết bị. Hệ thống ghi nhận thiết bị mới nhất và không bắt buộc đăng xuất thiết bị cũ nhưng lưu vết IP của cả hai phiên.
*   **Success State**: Chuyển hướng về trang chủ thành công, lưu thông tin phiên đăng nhập cục bộ.
*   **Failure State**: Giữ nguyên trang đăng nhập, báo lỗi cụ thể cho người dùng, tăng bộ đếm số lần đăng nhập sai.
*   **Permission Required**: Public.
*   **Related Components**: `LoginForm`.
*   **Related Screens**: `/auth`.

---

### 2. PHÂN HỆ: QUẢN LÝ GIẢI ĐẤU (TOURNAMENT MANAGEMENT)

#### 2.1. Chức năng: Tạo giải đấu mới (Create Tournament)
*   **Purpose**: Khởi tạo giải đấu slingshot mới với các cấu hình về thể thức, cự ly và thông số thi đấu cơ bản.
*   **Trigger**: Admin nhấn nút "Tạo giải đấu" trong giao diện Quản trị.
*   **Preconditions**: Đang có một mùa giải hoạt động (Active Season).
*   **Actors**: System Owner, Tournament Director, Admin.
*   **Main Flow**:
    1. Admin chọn Mùa giải hoạt động và nhập các thông tin: Tên giải đấu, Địa điểm, Thời gian, Thể thức (individual/team/mixed), Loại bia bắn (paper_target/falling_target/spinning_target), Cự ly thi đấu.
    2. Nhấn nút "Lưu giải đấu".
    3. Hệ thống kiểm tra tính hợp lệ và ghi dữ liệu mới lên Firestore với trạng thái ban đầu là `draft`.
*   **Alternative Flow**: Không có.
*   **Validation**:
    *   Thời gian kết thúc giải đấu **MUST** lớn hơn hoặc bằng thời gian bắt đầu.
    *   Danh sách cự ly thi đấu **SHALL NOT** để trống và các cự ly phải là số dương lớn hơn 0.
*   **Business Rules Reference**: Luật giải đấu VSC (Vòng thi đấu, Thể thức).
*   **Repository Called**: `tournamentRepository.ts`
*   **Firestore Collections Used**: `tournaments`
*   **Audit Log Generated**: `TOURNAMENT_CREATE_SUCCESS`.
*   **Notification Generated**: Không.
*   **Realtime Update**: Bảng điều khiển quản lý cập nhật giải đấu mới trong vòng 100ms.
*   **Offline Behaviour**: Không cho phép tạo giải đấu khi ngoại tuyến.
*   **Error Handling**: Trả lỗi chi tiết nếu mất kết nối Firebase hoặc trùng mã giải đấu.
*   **Edge Cases**: Tạo giải đấu khi chưa cấu hình mùa giải. Hệ thống cảnh báo và hướng dẫn Admin sang phân hệ Season Management để tạo mùa giải trước.
*   **Success State**: Tạo bản ghi thành công, chuyển Admin về trang chi tiết giải đấu vừa tạo.
*   **Failure State**: Hiển thị popup lỗi, giữ nguyên dữ liệu đã nhập trên form để Admin chỉnh sửa lại.
*   **Permission Required**: Admin, Tournament Director.
*   **Related Components**: `TournamentForm`.
*   **Related Screens**: `/admin/tournaments/new`.

---

### 3. PHÂN HỆ: HỒ SƠ VẬN ĐỘNG VIÊN VÀ ĐĂNG KÝ (ATHLETE & REGISTRATION)

#### 3.1. Chức năng: Đăng ký tham gia giải đấu (Athlete Registration)
*   **Purpose**: Cho phép vận động viên đăng ký tham gia một giải đấu cụ thể và ghi nhận hồ sơ thi đấu thô.
*   **Trigger**: Athlete nhấn nút "Đăng ký tham gia" tại trang chi tiết giải đấu.
*   **Preconditions**: Giải đấu đang trong trạng thái mở đăng ký (`status: "upcoming"`, thời gian hiện tại nằm trong khoảng `registrationOpen` và `registrationClose`).
*   **Actors**: Athlete, Club Manager, Admin.
*   **Main Flow**:
    1. Người dùng chọn vận động viên cần đăng ký (chính mình hoặc thành viên CLB).
    2. Xác nhận thông tin hồ sơ cá nhân và đóng phí đăng ký (nếu có).
    3. Hệ thống tạo bản ghi mới trong collection `tournament_entries` với trạng thái ban đầu là `registered`.
*   **Alternative Flow**: Admin thực hiện đăng ký thủ công cho VĐV từ file danh sách import.
*   **Validation**:
    *   VĐV **SHALL NOT** đăng ký trùng lặp trong cùng một giải đấu.
    *   Số lượng đăng ký hiện hành **MUST NOT** vượt quá giới hạn tối đa của giải đấu (`maxAthletes`).
*   **Business Rules Reference**: Giới hạn số lượng đăng ký, lệ phí giải đấu.
*   **Repository Called**: `athleteRepository.ts`
*   **Firestore Collections Used**: `tournament_entries`, `athletes`
*   **Audit Log Generated**: `ATHLETE_REGISTRATION_SUCCESS`.
*   **Notification Generated**: Gửi thông báo xác nhận đăng ký thành công cho VĐV qua email/hệ thống nội bộ.
*   **Realtime Update**: Cập nhật chỉ số `currentAthletes` trong giải đấu tức thời.
*   **Offline Behaviour**: Không khả dụng khi ngoại tuyến.
*   **Error Handling**: Báo lỗi "Giải đấu đã hết suất đăng ký" nếu lượng đăng ký vượt quá `maxAthletes` tại thời điểm ghi nhận.
*   **Edge Cases**: Hai VĐV nhấn nút đăng ký cùng một suất cuối cùng tại cùng một mili-giây. Hệ thống sử dụng Firestore Transactions để đảm bảo chỉ người ghi nhận trước thành công, người sau nhận thông báo lỗi.
*   **Success State**: Tạo entry đăng ký, cập nhật số lượng VĐV tham gia.
*   **Failure State**: Hủy bỏ giao dịch, báo lỗi cụ thể cho VĐV.
*   **Permission Required**: Athlete, Club Manager, Admin.
*   **Related Components**: `RegistrationModal`.
*   **Related Screens**: `/tournaments/:id`.

---

### 4. PHÂN HỆ: ĐIỂM DANH VÀ PHÂN BỆ BẮN (CHECK-IN & LANE ASSIGNMENT)

#### 4.1. Chức năng: Điểm danh vận động viên (Athlete Check-In)
*   **Purpose**: Xác nhận sự hiện diện vật lý của vận động viên tại địa điểm thi đấu và gán mã số bệ bắn (Lane Number).
*   **Trigger**: Check-In Staff quét mã QR hoặc tìm kiếm thủ công tên VĐV và nhấn nút "Điểm danh".
*   **Preconditions**: VĐV đã đăng ký giải đấu từ trước (`status: "registered"`), giải đấu đã chuyển sang trạng thái hoạt động (`active`).
*   **Actors**: Check-In Staff, Admin.
*   **Main Flow**:
    1. Check-In Staff tìm kiếm hồ sơ đăng ký của VĐV.
    2. Nhấn nút "Check-In".
    3. Hệ thống cập nhật trạng thái entry trong `tournament_entries` sang `checked_in` kèm theo mốc thời gian thực hiện.
*   **Alternative Flow**: Hủy check-in nếu VĐV vi phạm quy chế hoặc bỏ thi.
*   **Validation**:
    *   Hồ sơ VĐV **MUST** ở trạng thái hợp lệ (không bị đình chỉ hoặc cấm thi đấu).
*   **Business Rules Reference**: Quy trình Check-in bắt buộc trước giờ thi đấu.
*   **Repository Called**: `athleteRepository.ts`
*   **Firestore Collections Used**: `tournament_entries`
*   **Audit Log Generated**: `ATHLETE_CHECKIN_SUCCESS`.
*   **Notification Generated**: Thông báo đẩy lên màn hình điều phối bệ bắn của trọng tài.
*   **Realtime Update**: Cập nhật trạng thái check-in trên danh sách Admin.
*   **Offline Behaviour**: Ghi nhận check-in vào Offline Cache, tự động đồng bộ khi có kết nối mạng.
*   **Error Handling**: Cảnh báo nếu VĐV đã được điểm danh trước đó bởi nhân viên khác.
*   **Edge Cases**: VĐV chưa đăng ký giải đấu đòi check-in trực tiếp. Hệ thống yêu cầu Admin thực hiện đăng ký khẩn cấp trước khi cho phép check-in.
*   **Success State**: Cập nhật trạng thái check-in thành công.
*   **Failure State**: Giữ nguyên trạng thái cũ, hiển thị cảnh báo lỗi.
*   **Permission Required**: Check-In Staff, Admin.
*   **Related Components**: `CheckInCard`.
*   **Related Screens**: `/admin/checkin`.

#### 4.2. Chức năng: Phân bệ bắn thi đấu (Lane Assignment)
*   **Purpose**: Gán bệ bắn thi đấu vật lý cho vận động viên đã check-in.
*   **Trigger**: Nhân viên điều phối kéo thả tên VĐV vào sơ đồ bệ bắn hoặc nhấn nút "Tự động phân bệ".
*   **Preconditions**: VĐV đã check-in thành công (`status: "checked_in"`).
*   **Actors**: Head Referee, Referee, Admin.
*   **Main Flow**:
    1. Trọng tài chọn danh sách VĐV đã check-in chưa có bệ bắn.
    2. Chọn bệ bắn trống (Lane) trên sơ đồ.
    3. Nhấn "Gán bệ".
    4. Hệ thống cập nhật `laneNumber` trong `tournament_entries` và tạo bản ghi trạng thái bệ bắn trong `lanes`.
*   **Alternative Flow (Tự động phân bệ)**: Hệ thống tự động chia ngẫu nhiên các VĐV vào các bệ bắn trống dựa trên thứ tự đăng ký.
*   **Validation**:
    *   Mỗi bệ bắn **MUST NOT** chứa nhiều hơn một VĐV đang thi đấu tại một thời điểm.
    *   Số bệ bắn **MUST** nằm trong giới hạn cấu hình của giải đấu.
*   **Business Rules Reference**: Phân chia bệ bắn công bằng, không trùng lặp.
*   **Repository Called**: `scoreRepository.ts`
*   **Firestore Collections Used**: `tournament_entries`, `lanes`
*   **Audit Log Generated**: `LANE_ASSIGNMENT_SUCCESS`.
*   **Notification Generated**: Gửi thông báo đến máy tính bảng của Trọng tài bệ bắn tương ứng.
*   **Realtime Update**: Cập nhật sơ đồ bệ bắn trực quan trên màn hình Referee Dashboard.
*   **Offline Behaviour**: Ghi nhận phân bệ vào bộ nhớ đệm Offline.
*   **Error Handling**: Cảnh báo và chặn thao tác nếu gán VĐV vào bệ đang có người hoạt động.
*   **Edge Cases**: VĐV đổi bệ bắn đột xuất do sự cố kỹ thuật bệ. Trọng tài tiến hành đổi bệ khẩn cấp, hệ thống tự động cập nhật nhật ký audit log ghi rõ lý do.
*   **Success State**: VĐV được gán bệ bắn thi đấu chính thức.
*   **Failure State**: Giữ nguyên trạng thái cũ, hủy phân bệ.
*   **Permission Required**: Head Referee, Admin.
*   **Related Components**: `LaneSelectorGrid`.
*   **Related Screens**: `/referee/layout`.

---

### 5. PHÂN HỆ: NHẬP ĐIỂM THỜI GIAN THỰC (SCORING SYSTEM)

#### 5.1. Chức năng: Ghi nhận điểm số phát bắn (Submit Shot Score)
*   **Purpose**: Ghi nhận kết quả điểm số từng phát bắn đơn lẻ của vận động viên thi đấu tại bệ bắn.
*   **Trigger**: Trọng tài bệ bắn nhấn phím điểm trên bàn phím ảo xúc giác `ScoreKeyboard`.
*   **Preconditions**: VĐV đang ở trạng thái thi đấu tích cực tại bệ bắn được chỉ định. Vòng đấu hiện tại đang mở.
*   **Actors**: Referee, Head Referee, Admin.
*   **Main Flow**:
    1. Trọng tài xác định đúng bệ bắn và lượt bắn hiện tại của VĐV.
    2. Trọng tài nhấn nút điểm số (0 - 10, X, Solo, Del, Enter).
    3. Nhấn "Enter" để xác nhận lưu phát bắn.
    4. Hệ thống lưu phát bắn vào `shot_logs` và cập nhật thông số thực thời trong `tournament_entries.realtimeStats` (tổng điểm, độ chính xác, chuỗi trúng liên tiếp).
*   **Alternative Flow (Mất mạng tạm thời)**: Lưu dữ liệu phát bắn vào Offline Queue (local storage), hệ thống hiển thị dải mây xám báo hiệu chưa đồng bộ lên Cloud.
*   **Validation**:
    *   Điểm số **MUST** nằm trong giới hạn hợp lệ của cự ly và vòng đấu hiện hành.
    *   Tổng số phát bắn ghi nhận **MUST NOT** vượt quá giới hạn tối đa của lượt đấu (`shotsCount`).
*   **Business Rules Reference**: Giới hạn điểm số phát bắn, luật tính điểm cộng dồn/riêng biệt.
*   **Repository Called**: `scoreRepository.ts`
*   **Firestore Collections Used**: `shot_logs`, `tournament_entries`, `lanes`
*   **Audit Log Generated**: `SHOT_SCORE_SUBMIT`.
*   **Notification Generated**: Cập nhật chỉ số điểm số lên Liveboard và OBS overlay tức thời.
*   **Realtime Update**: Điểm số nhảy tức thời trên mọi màn hình bảng LED trình chiếu (< 100ms).
*   **Offline Behaviour**: Ghi nhận an toàn vào local Offline Queue. Tự động đồng bộ lên Firestore ngay khi phát hiện tín hiệu mạng khôi phục qua `useSystemStatus` (tuân thủ nguyên tắc FIFO).
*   **Error Handling**: Nếu trọng tài nhập điểm quá giới hạn phát bắn cho phép, hệ thống rung cảnh báo đỏ rực và chặn thao tác nhập phím điểm.
*   **Edge Cases**: Trọng tài bấm nhầm điểm cho VĐV ở bệ bắn bên cạnh. Trọng tài sử dụng chức năng "Hoàn tác (Undo)" hoặc yêu cầu Tổ trưởng trọng tài (Head Referee) sửa điểm kèm lý do.
*   **Success State**: Điểm phát bắn được ghi nhận chính xác, đồng bộ thời gian thực.
*   **Failure State**: Rung cảnh báo, hiển thị thông báo lỗi, giữ nguyên điểm số cũ.
*   **Permission Required**: Referee, Head Referee, Admin.
*   **Related Components**: `ScoreKeyboard`, `LaneScoringRow`.
*   **Related Screens**: `/referee/scoring`.

#### 5.2. Chức năng: Hoàn tác phát bắn (Undo Score Shot)
*   **Purpose**: Cho phép trọng tài bệ bắn xóa nhanh phát bắn vừa nhập nhầm trước khi lượt bắn được khóa chính thức.
*   **Trigger**: Trọng tài nhấn nút "Del" hoặc "Undo" trên bàn phím nhập điểm.
*   **Preconditions**: Lượt bắn hiện tại chưa bị khóa (`isLocked: false`). Phát bắn cần undo là phát bắn cuối cùng được ghi nhận trong phiên hiện hành.
*   **Actors**: Referee, Admin.
*   **Main Flow**:
    1. Trọng tài nhấn "Del/Undo".
    2. Hệ thống định vị phát bắn cuối cùng trong collection `shot_logs` của VĐV tại cự ly hiện hành.
    3. Thực hiện xóa bản ghi phát bắn đó khỏi Firestore.
    4. Cập nhật lùi chỉ số `currentShotIndex` và tính toán lại các chỉ số thống kê thời gian thực `realtimeStats`.
*   **Alternative Flow**: Không khả dụng khi lượt đấu đã chuyển trạng thái khóa.
*   **Validation**:
    *   Chỉ được phép hoàn tác phát bắn trong lượt đấu tích cực đang diễn ra.
*   **Business Rules Reference**: Luật hoàn tác điểm nhanh tại bệ bắn.
*   **Repository Called**: `scoreRepository.ts`
*   **Firestore Collections Used**: `shot_logs`, `tournament_entries`
*   **Audit Log Generated**: `SHOT_SCORE_UNDO`.
*   **Notification Generated**: Cập nhật điểm số giảm lùi trên các bảng LED trình chiếu.
*   **Realtime Update**: Điểm số trên màn hình Liveboard lùi lại tức khắc.
*   **Offline Behaviour**: Xóa phát bắn khỏi hàng đợi offline cục bộ trước khi hàng đợi được đẩy lên máy chủ.
*   **Error Handling**: Trả thông báo lỗi "Không có phát bắn nào để hoàn tác" nếu VĐV chưa bắn phát nào trong lượt.
*   **Edge Cases**: Loạt bắn đã kết thúc và bệ bắn tự động khóa. Trọng tài không thể tự Undo, phải báo cáo lên Head Referee để mở khóa bệ (Unlock).
*   **Success State**: Xóa điểm phát bắn nhầm thành công, tính toán lại xếp hạng tức thời.
*   **Failure State**: Báo lỗi chi tiết, giữ nguyên điểm số.
*   **Permission Required**: Referee, Admin.
*   **Related Components**: `ScoreKeyboard`.
*   **Related Screens**: `/referee/scoring`.

#### 5.3. Chức năng: Khóa và mở khóa bệ nhập điểm (Lock & Unlock Lane Scoring)
*   **Purpose**: Đóng băng dữ liệu nhập điểm của một bệ bắn sau khi hoàn tất lượt bắn để chống can thiệp trái phép, hoặc mở khóa khẩn cấp khi cần sửa đổi điểm số.
*   **Trigger**: Trọng tài nhấn nút "Xác nhận & Khóa" hoặc Head Referee nhấn "Mở khóa bệ".
*   **Preconditions**: Bệ bắn đang hoạt động tích cực đối với chức năng khóa, hoặc bệ bắn đang ở trạng thái khóa đối với chức năng mở khóa.
*   **Actors**: Head Referee, Admin (mở khóa); Referee, Head Referee, Admin (khóa).
*   **Main Flow (Khóa điểm)**:
    1. Trọng tài nhấn "Xác nhận & Khóa lượt".
    2. Hệ thống kiểm tra số lượng phát bắn đã đủ.
    3. Cập nhật thuộc tính `status` của bệ bắn trong `lanes` sang `completed`.
    4. Trọng tài tại bệ bắn đó không thể nhập hay hoàn tác điểm được nữa.
*   **Main Flow (Mở khóa điểm)**:
    1. Tổ trưởng trọng tài (Head Referee) quét vân tay, nhập mã PIN hoặc phê duyệt yêu cầu mở khóa trên bảng điều khiển.
    2. Hệ thống cập nhật thuộc tính bệ bắn về trạng thái `active`.
    3. Cho phép trọng tài bệ tiếp tục thao tác điều chỉnh điểm số.
*   **Alternative Flow**: Tự động khóa bệ bắn sau 5 phút không có phát bắn mới phát sinh khi đã đủ số lượng phát bắn tối đa.
*   **Validation**:
    *   Chỉ Head Referee hoặc Admin mới có quyền thực thi tác vụ **Mở khóa bệ bắn (Unlock)**.
*   **Business Rules Reference**: Quy trình bảo mật điểm số, chống gian lận giải đấu.
*   **Repository Called**: `scoreRepository.ts`
*   **Firestore Collections Used**: `lanes`, `tournament_entries`
*   **Audit Log Generated**: `LANE_LOCK_SUCCESS` hoặc `LANE_UNLOCK_SUCCESS`.
*   **Notification Generated**: Gửi thông báo đến máy tính bảng trọng tài bệ bắn.
*   **Realtime Update**: Biểu tượng ổ khóa xuất hiện/biến mất bên cạnh tên VĐV trên màn hình giám sát.
*   **Offline Behaviour**: Tác vụ mở khóa khẩn cấp **SHALL NOT** thực hiện ngoại tuyến để tránh xung đột dữ liệu bảo mật.
*   **Error Handling**: Trả lỗi "Bạn không có quyền mở khóa bệ bắn này" nếu Referee thường cố tình thao tác.
*   **Edge Cases**: Head Referee mất kết nối mạng. Phải sử dụng mã PIN khẩn cấp offline được cấp trước giải đấu để nhập trực tiếp trên máy tính bảng của Referee.
*   **Success State**: Trạng thái bệ bắn được cập nhật chính xác, giao diện nhập điểm phản hồi tương ứng.
*   **Failure State**: Giữ nguyên trạng thái khóa/mở cũ, báo lỗi bảo mật.
*   **Permission Required**: Head Referee, Admin (để mở khóa); Referee, Head Referee, Admin (để khóa).
*   **Related Components**: `DoubleConfirmationDialog`.
*   **Related Screens**: `/referee/scoring`, `/admin/dashboard`.

---

### 6. PHÂN HỆ: BẢNG XẾP HẠNG VÀ TÌNH TRẠNG SINH TỬ (LEADERBOARD & ELIMINATION)

#### 6.1. Chức năng: Tính toán bảng xếp hạng cá nhân thời gian thực (Individual Leaderboard Calculations)
*   **Purpose**: Tự động cập nhật thứ hạng của tất cả các vận động viên ngay khi có biến động điểm số tại bất kỳ bệ bắn nào.
*   **Trigger**: Có phát bắn mới ghi nhận thành công trong `shot_logs` hoặc có sự thay đổi điểm số từ Admin.
*   **Preconditions**: Giải đấu đang hoạt động hoặc kết thúc.
*   **Actors**: System (chạy tự động), Guest, Viewer (đọc dữ liệu).
*   **Main Flow**:
    1. Khi Firestore nhận được tài liệu phát bắn mới, Listener thời gian thực `useLeaderboard` kích hoạt.
    2. Hệ thống lấy danh sách điểm số thô của tất cả các VĐV tham gia giải đấu.
    3. Tiến hành sắp xếp mảng VĐV dựa trên các tiêu chí ưu tiên:
        *   Tiêu chí 1: Tổng điểm số (Score) từ cao xuống thấp.
        *   Tiêu chí 2: Độ chính xác (Accuracy %) - tỷ lệ số phát bắn trúng.
        *   Tiêu chí 3: Điểm số mũi Solo Tie-breaker phụ (nếu có hiện tượng đồng điểm ở ranh giới loại).
    4. Trả về mảng VĐV kèm theo chỉ số thứ hạng (`rank`) đã được tính toán lại.
*   **Alternative Flow**: Sắp xếp bảng xếp hạng theo cự ly riêng lẻ phục vụ trao giải thưởng phụ.
*   **Validation**:
    *   Hệ thống **SHALL NOT** hiển thị thứ hạng trùng lặp không có căn cứ (nếu đồng điểm tuyệt đối ở ranh giới loại, phải đánh dấu trạng thái chờ Solo `isPendingSolo: true`).
*   **Business Rules Reference**: Thuật toán xếp hạng VSC, Luật giải quyết đồng điểm.
*   **Repository Called**: `athleteRepository.ts`
*   **Firestore Collections Used**: `tournament_entries`, `shot_logs`
*   **Audit Log Generated**: Không.
*   **Notification Generated**: Thông báo đẩy nếu có sự thay đổi vị trí ngôi đầu bảng xếp hạng (Top 1).
*   **Realtime Update**: Toàn bộ bảng xếp hạng trên màn hình LED trình chiếu dịch chuyển dòng mượt mà trong vòng < 100ms.
*   **Offline Behaviour**: Sắp xếp cục bộ dựa trên dữ liệu hiện có trong bộ nhớ đệm cache.
*   **Error Handling**: Nếu dữ liệu điểm thô của một VĐV bị lỗi cấu trúc, hệ thống bỏ qua bản ghi lỗi và tiếp tục xếp hạng các VĐV còn lại để đảm bảo bảng điểm không bị sập.
*   **Edge Cases**: Đồng điểm tuyệt đối tại ranh giới loại (Cutoff Line) khiến không thể phân định ai đi tiếp. Hệ thống tự động kích hoạt trạng thái "Chờ đấu Solo phụ" và khóa bảng xếp hạng tạm thời tại khu vực ranh giới đó.
*   **Success State**: Bảng xếp hạng cập nhật trơn tru, hiển thị chính xác vị trí của từng VĐV.
*   **Failure State**: Giữ nguyên thứ hạng ở chu kỳ cập nhật trước đó, báo lỗi tính toán lên hệ thống log giám sát.
*   **Permission Required**: Public.
*   **Related Components**: `LeaderboardTable`.
*   **Related Screens**: `/leaderboard`, `/tv`.

---

### 7. PHÂN HỆ: ĐẤU SÚNG PHỤ TIE-BREAKER (SOLO SHOOTOFF)

#### 7.1. Chức năng: Khởi chạy loạt bắn phụ Solo (Initiate Solo ShootOff)
*   **Purpose**: Kích hoạt lượt thi đấu phụ trực tiếp cho các vận động viên đồng điểm tại vị trí ranh giới loại để tìm ra người đi tiếp.
*   **Trigger**: Admin nhấn nút "Kích hoạt lượt Solo" trên bảng điều khiển giải đấu khi phát hiện đồng điểm.
*   **Preconditions**: Có tối thiểu hai VĐV đồng điểm tuyệt đối tại vị trí Cutoff. Vòng đấu chính thức đã khép lại.
*   **Actors**: Head Referee, Admin.
*   **Main Flow**:
    1. Trọng tài xác định danh sách VĐV đồng điểm tham gia Solo.
    2. Hệ thống tạo bản ghi mới trong `solo_battles` với trạng thái `active`.
    3. Gán bệ bắn thi đấu Solo chuyên dụng cho các đối thủ.
    4. Trọng tài bệ bắn Solo chuyển giao diện máy tính bảng sang bệ nhập điểm Solo.
*   **Alternative Flow**: Tự động kích hoạt loạt Solo dựa trên phân tích dữ liệu của Ranking Engine khi kết thúc loạt bắn chính.
*   **Validation**:
    *   Các VĐV tham gia Solo **MUST** thuộc danh sách đồng điểm thực tế của giải đấu.
*   **Business Rules Reference**: Thể thức đấu phụ Solo Tie-breaker, luật tính điểm Solo.
*   **Repository Called**: `scoreRepository.ts`
*   **Firestore Collections Used**: `solo_battles`, `tournament_entries`
*   **Audit Log Generated**: `SOLO_BATTLE_INITIATE`.
*   **Notification Generated**: Cảnh báo khẩn cấp dải băng đỏ rực "ĐANG DIỄN RA LOẠT ĐẤU SOLO QUYẾT ĐỊNH" trên toàn bộ màn hình trình chiếu TV và OBS overlay.
*   **Realtime Update**: Trận đấu Solo hiển thị side-by-side trên màn hình LED khán đài thời gian thực.
*   **Offline Behaviour**: Không cho phép khởi chạy loạt bắn Solo khi ngoại tuyến để tránh tranh chấp kết quả.
*   **Error Handling**: Trả lỗi nếu cố tình khởi chạy loạt bắn Solo cho các VĐV không đồng điểm hoặc không nằm trong vùng ranh giới loại.
*   **Edge Cases**: Loạt Solo thứ nhất tiếp tục kết thúc với tỷ số đồng điểm tuyệt đối. Hệ thống cho phép kích hoạt loạt Solo thứ hai (Resolo) ngay lập tức theo đúng luật thi đấu.
*   **Success State**: Tạo phòng Solo thành công, sẵn sàng nhập điểm loạt phụ.
*   **Failure State**: Hủy bỏ, thông báo lý do lỗi cấu hình giải đấu.
*   **Permission Required**: Head Referee, Admin.
*   **Related Components**: `SoloBattleCard`, `DoubleConfirmationDialog`.
*   **Related Screens**: `/admin/dashboard`, `/leaderboard`.

---

### 8. PHÂN HỆ: ĐỒ HỌA TRÌNH CHIẾU VÀ PHÁT SÓNG (TV & OBS OVERLAYS)

#### 8.1. Chức năng: Đồng bộ hóa dải đồ họa đáy màn hình OBS (OBS Lower Third Sync)
*   **Purpose**: Tự động hiển thị và đồng bộ điểm số của vận động viên đang thực hiện lượt bắn lên dải đồ họa tách nền phục vụ livestream truyền hình.
*   **Trigger**: Có phát bắn mới được ghi nhận từ Trọng tài bệ bắn hoặc có sự thay đổi tiêu điểm máy quay (active camera focus).
*   **Preconditions**: OBS Overlay Page đang mở trên máy tính phát sóng của ban kỹ thuật.
*   **Actors**: Media Operator, System (tự động).
*   **Main Flow**:
    1. Trọng tài bệ bắn nhập điểm cho VĐV.
    2. Listener thời gian thực trên OBS Overlay nhận tín hiệu thay đổi dữ liệu phát bắn.
    3. Đồ họa dải băng đáy màn hình (Lower Third) tự động kích hoạt hiệu ứng slide-in rực rỡ, hiển thị thông tin: Họ tên VĐV, Câu lạc bộ, Cự ly đang bắn, Điểm số phát bắn vừa thực hiện và vị trí thứ hạng hiện hành trên bảng tổng sắp.
    4. Tự động ẩn đi sau 5 giây hiển thị nếu không có phát bắn mới phát sinh.
*   **Alternative Flow**: Media Operator điều khiển hiển thị đồ họa VĐV thủ công bằng bàn phím điều hướng chuyên dụng.
*   **Validation**:
    *   Đồ họa **SHALL NOT** bị giật, lag hoặc hiển thị sai lệch điểm số so với bảng điểm của trọng tài.
*   **Business Rules Reference**: Tiêu chuẩn đồ họa OBS overlay, luật hiển thị thông tin VĐV.
*   **Repository Called**: `scoreRepository.ts`
*   **Firestore Collections Used**: `shot_logs`, `tournament_entries`
*   **Audit Log Generated**: Không.
*   **Notification Generated**: Không.
*   **Realtime Update**: Cập nhật đồ họa mượt mà trong vòng < 50ms trên nền xanh Chroma-Key.
*   **Offline Behaviour**: Hiển thị dải băng cảnh báo lỗi kết nối mạng màu xám mờ ở góc đồ họa, tiếp tục sử dụng bộ nhớ cache để hiển thị thông tin cũ.
*   **Error Handling**: Nếu mất luồng dữ liệu thời gian thực, đồ họa tự động chuyển sang trạng thái ẩn (hidden) thay vì hiển thị các ô lỗi trống trải hoặc text lỗi `undefined`.
*   **Edge Cases**: Có nhiều phát bắn đồng thời ở nhiều bệ bắn khác nhau. Hệ thống OBS tự động xếp hàng đợi (Queue) hiển thị tuần tự từng phát bắn nổi bật của các VĐV dẫn đầu hoặc cho phép Media Operator thiết lập bộ lọc chỉ hiển thị bệ bắn tâm điểm (Focus Lane).
*   **Success State**: Đồ họa đồng bộ chính xác, hoạt động 60 FPS mượt mà.
*   **Failure State**: Ẩn đồ họa an toàn để bảo vệ tính thẩm mỹ của luồng phát sóng.
*   **Permission Required**: Public / Media Operator.
*   **Related Components**: `OBSChromaKeyCanvas`.
*   **Related Screens**: `/obs`.

---

### 9. PHÂN HỆ: QUẢN LÝ NGOẠI TUYẾN VÀ ĐỒNG BỘ (OFFLINE SYNC & RECOVERY)

#### 9.1. Chức năng: Đẩy hàng đợi điểm số ngoại tuyến lên Cloud (Offline Queue Flush)
*   **Purpose**: Tự động đẩy toàn bộ điểm số phát bắn đã nhập khi mất mạng tạm thời lên Firestore theo đúng trình tự thời gian ngay khi khôi phục kết nối.
*   **Trigger**: Hook `useSystemStatus` phát hiện trạng thái mạng chuyển từ ngoại tuyến sang trực tuyến (`isOnline: true`).
*   **Preconditions**: Có dữ liệu tích lũy trong Offline Queue lưu trữ tại `localStorage`.
*   **Actors**: System (tự động).
*   **Main Flow**:
    1. Hệ thống phát hiện kết nối Internet hoạt động trở lại.
    2. Kích hoạt luồng đồng bộ khẩn cấp. Khóa tạm thời bàn phím nhập điểm của Trọng tài bệ để tránh xung đột ghi dữ liệu mới.
    3. Đọc dữ liệu từ hàng đợi Offline theo cơ chế First-In, First-Out (FIFO).
    4. Với mỗi phát bắn ngoại tuyến, thực hiện giao dịch ghi lên Firestore thông qua `scoreRepository.ts`.
    5. Nhận phản hồi ghi thành công từ Firebase.
    6. Xóa phát bắn tương ứng khỏi hàng đợi cục bộ.
    7. Tiếp tục cho đến khi hàng đợi rỗng hoàn toàn.
    8. Mở khóa bàn phím nhập điểm, hiển thị thông báo "Đã đồng bộ thành công X phát bắn ngoại tuyến!".
*   **Alternative Flow**: Đồng bộ thủ công khi Trọng tài nhấn nút "Đồng bộ ngay" tại bảng điều khiển sự cố ngoại tuyến.
*   **Validation**:
    *   Hàng đợi **MUST** giữ nguyên trật tự thời gian bắn thực tế của VĐV.
    *   Các phát bắn trùng lặp ID **SHALL NOT** được phép ghi đè lên dữ liệu Firestore đã tồn tại.
*   **Business Rules Reference**: Quy trình xử lý ngoại tuyến an toàn, bảo vệ toàn vẹn điểm số.
*   **Repository Called**: `scoreRepository.ts`
*   **Firestore Collections Used**: `shot_logs`, `tournament_entries`, `audit_logs`
*   **Audit Log Generated**: `OFFLINE_SYNC_COMPLETED`.
*   **Notification Generated**: Thông báo nổi dải xanh lục "ĐỒNG BỘ THÀNH CÔNG" xuất hiện trên màn hình trọng tài bệ bắn.
*   **Realtime Update**: Các chỉ số điểm số và thứ hạng trên Leaderboard lập tức nhảy vọt để bù đắp lượng điểm số thiếu hụt trong thời gian mất kết nối.
*   **Offline Behaviour**: Duy trì trạng thái tích lũy an toàn trong bộ nhớ thiết bị, không xóa cache khi chưa nhận được phản hồi thành công từ Firestore Cloud.
*   **Error Handling**: Nếu một phát bắn trong hàng đợi bị lỗi ghi do vi phạm quy tắc bảo mật (ví dụ: bệ bắn đã bị Admin khóa chính thức trên cloud), hệ thống cô lập phát bắn lỗi đó vào bảng "Sự cố đồng bộ" để Admin xử lý thủ công, tiếp tục đồng bộ các phát bắn hợp lệ khác trong hàng đợi.
*   **Edge Cases**: Thiết bị trọng tài bị sập nguồn đột ngột khi đang tích lũy 50 phát bắn ngoại tuyến. Điểm số không bị mất vì đã được lưu bền vững vào `localStorage`, khi bật nguồn trở lại và có mạng, hệ thống tự động trigger luồng đồng bộ ngay lập tức.
*   **Success State**: Hàng đợi rỗng, toàn bộ điểm số ngoại tuyến đồng bộ chính xác lên Cloud, khôi phục trạng thái hoạt động bình thường của bệ bắn.
*   **Failure State**: Giữ nguyên dữ liệu trong local storage, hiển thị cảnh báo đỏ "Đồng bộ thất bại, vui lòng thử lại!", giữ kết nối an toàn để tránh mất dữ liệu.
*   **Permission Required**: System, Referee, Admin.
*   **Related Components**: `GlobalToastNotification`, `SystemStatusBadge`.
*   **Related Screens**: Toàn bộ hệ thống màn hình.

---

## CHƯƠNG 2: DANH MỤC THAM CHIẾU CHI TIẾT CÁC PHÂN HỆ PHỤ TRỢ

Để đảm bảo tính bao phủ 100% không để lại khoảng trống nghiệp vụ, dưới đây là bảng tham chiếu nhanh cấu hình hành vi của các phân hệ chức năng phụ trợ thuộc VSC Platform V3:

| Tên Chức năng | Trigger Sự kiện | Actors chính | Firestore Collections | Audit Log Generated | Đặc thù Offline |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Season Management** | Admin lưu cấu hình Mùa giải | Admin, System Owner | `seasons` | `SEASON_CREATE` | Chặn tạo offline |
| **Club Management** | Quản lý CLB cập nhật logo, banner | Club Manager, Admin | `clubs` | `CLUB_PROFILE_UPDATE`| Cho phép lưu nháp offline |
| **User & Role Management** | Admin thay đổi quyền của người dùng | Admin, System Owner | `users` | `USER_ROLE_CHANGE` | Chặn thay đổi offline |
| **Sponsor Management** | Admin nạp banner tài trợ trình chiếu | Admin, Media Operator | `sponsors` | `SPONSOR_BANNER_LOAD` | Chạy offline từ cache ảnh |
| **Export Reports & Data** | Người dùng nhấn "Xuất file Excel/PDF"| Admin, Referee, Viewer| `tournament_entries` | `REPORT_EXPORT` | Chặn xuất file nếu không có mạng |
| **Cơ sở dữ liệu Backup** | Lịch tự động hệ thống kích hoạt | System, System Owner | Toàn bộ database | `DB_BACKUP_COMPLETED` | Vận hành tại Server Cloud |

---

### PHẦN KẾT: QUY CHUẨN XÁC THỰC HOÀN THÀNH CHỨC NĂNG
Mọi phân hệ chức năng khi được triển khai lập trình **MUST** bám sát từng bước trong Main Flow và đáp ứng đầy đủ các tiêu chuẩn bảo mật, ràng buộc ngoại tuyến được quy định trong tài liệu Đặc tả chức năng này để đảm bảo giải đấu vận hành không xảy ra sự cố kỹ thuật.
