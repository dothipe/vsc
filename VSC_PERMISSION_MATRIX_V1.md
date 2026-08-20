# VSC PLATFORM V3 - PERMISSION MATRIX V1.0 (PM)
## MA TRẬN PHÂN QUYỀN HỆ THỐNG DUY NHẤT - VIETNAM SLINGSHOT CHAMPIONSHIP

---

### MỞ ĐẦU
Tài liệu **VSC Permission Matrix V1.0** là hiến pháp bảo mật tối cao của hệ thống **VSC Platform V3**. Tất cả cơ chế kiểm tra quyền truy cập (Access Control) ở cả Frontend (Router Guard, UI rendering) và Backend (Firestore Security Rules, API Middleware) **MUST** áp dụng đồng nhất theo ma trận này. 

Hệ thống vận hành theo nguyên tắc **Least Privilege (Quyền hạn tối thiểu)** và **Separation of Duties (Phân chia nghĩa vụ rõ ràng)** nhằm triệt tiêu tối đa rủi ro gian lận điểm số hoặc can thiệp dữ liệu trái phép tại các giải đấu.

---

## CHƯƠNG 1: ĐỊNH NGHĨA CÁC VAI TRÒ TRONG HỆ THỐNG (SYSTEM ROLES)

Hệ thống VSC Platform V3 phân rã thành 16 vai trò (Role) vật lý và logic:

1.  **System Owner**: Chủ sở hữu hệ thống. Có toàn quyền tối cao trên toàn hệ thống (Super Admin).
2.  **Tournament Director**: Trưởng Ban tổ chức giải. Chịu trách nhiệm tối cao về cấu hình, phân bổ và kết quả giải đấu.
3.  **Admin**: Quản trị viên hệ thống. Vận hành kỹ thuật, quản lý danh mục dữ liệu thô.
4.  **Head Referee**: Trọng tài trưởng. Tổ trưởng tổ trọng tài, có quyền phê duyệt sửa đổi điểm số và giải quyết tranh chấp.
5.  **Referee**: Trọng tài bệ bắn. Trực tiếp nhập điểm cho vận động viên tại bệ bắn được phân công.
6.  **Check-In Staff**: Nhân viên điểm danh. Thực hiện đón tiếp, đối chiếu hồ sơ và check-in cho VĐV trước giờ bắn.
7.  **Score Operator**: Nhân viên vận hành phòng máy. Hỗ trợ nhập liệu kết quả thi đấu thô từ phiếu điểm giấy dự phòng.
8.  **Media Operator**: Nhân viên truyền thông. Vận hành luồng livestream, hiển thị đồ họa truyền hình (OBS overlay).
9.  **Athlete**: Vận động viên. Đăng ký giải đấu, tự theo dõi hồ sơ cá nhân và lịch sử bắn của mình.
10. **Club Manager**: Chủ nhiệm Câu lạc bộ. Quản lý hồ sơ CLB, danh sách thành viên và đăng ký giải đấu theo nhóm đội.
11. **Guest**: Khách truy cập chưa đăng nhập. Xem thông tin công cộng, bảng xếp hạng trực tiếp.
12. **Viewer**: Người dùng đã đăng nhập hệ thống nhưng không có vai trò vận hành giải đấu.
13. **OBS**: Tài khoản dịch vụ (Service Account) của OBS. Chỉ đọc dữ liệu thời gian thực của lượt bắn phục vụ đồ họa.
14. **TV Display**: Tài khoản dịch vụ trình chiếu màn hình LED khán đài. Chỉ đọc dữ liệu bảng xếp hạng và bệ bắn trực tiếp.
15. **API**: Token kết nối bên thứ ba (như cơ quan báo chí, tổng cục TDTT). Chỉ đọc dữ liệu đã công bố thông qua REST API.
16. **System**: Luồng tiến trình tự động của nền tảng (cron-job, backup engine, ranking engine).

---

## CHƯƠNG 2: SƠ ĐỒ KẾ THỪA QUYỀN TRUY CẬP (ROLE INHERITANCE)

Sơ đồ phân cấp kế thừa quyền truy cập từ cao xuống thấp:

```
          [System Owner]
                │
         [Admin / Tournament Director]
                │
         [Head Referee]
         ┌──────┴──────┐
  [Referee]       [Score Operator]
     │                   │
     └─────────┬─────────┘
        [Check-In Staff]
               │
        [Club Manager]
               │
           [Athlete]
               │
           [Viewer]
               │
           [Guest]
```

*Nguyên tắc kế thừa*: Vai trò cấp trên tự động kế thừa tất cả các quyền ĐỌC (Read) của các vai trò cấp dưới, nhưng đối với các quyền GHI (Create/Update/Delete) và ĐIỀU KHIỂN (Approve/Override/Unlock), vai trò cấp trên **MUST** được khai báo rõ ràng trong ma trận và không tự động suy diễn nhằm tránh lỗ hổng bảo mật leo thang đặc quyền ngoài ý muốn.

---

## CHƯƠNG 3: MA TRẬN QUYỀN HẠN CHI TIẾT (PERMISSION MATRIX GRID)

| Quyền hạn | System Owner | Tournament Director | Admin | Head Referee | Referee | Check-In Staff | Score Operator | Media Operator | Athlete | Club Manager | Guest / Viewer | OBS / TV | API / System |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Read (Đọc)** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| **Create (Tạo mới)** | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ (System) |
| **Update (Sửa)** | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ (System) |
| **Delete (Xóa)** | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ (System) |
| **Export Data** | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ |
| **Import Data** | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **Approve Result** | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ (System) |
| **Unlock Scoring** | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **Lock Scoring** | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ (System) |
| **Override Rules** | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **Audit Access** | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **Offline Access** | ✔ | ✘ | ✘ | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **Emergency Access**| ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **System Level** | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ |
| **Tournament Level**| ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **Round Level** | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **Athlete Level** | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✔ | ✔ | ✘ | ✘ | ✘ |
| **Score Level** | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |

**Chú thích**:
*   `✔`: Quyền được phép (Allowed).
*   `✘`: Quyền bị nghiêm cấm tuyệt đối (Forbidden / Blocked).

---

## CHƯƠNG 4: CÁC NGUYÊN TẮC BẢO MẬT & VẬN HÀNH BẮT BUỘC

### 4.1. Nguyên tắc Quyền hạn Tối thiểu (Least Privilege)
*   **MỌI VAI TRÒ** trong hệ thống **SHALL NOT** có nhiều quyền truy cập hơn mức tối thiểu cần thiết để hoàn thành nhiệm vụ của họ.
*   **Referee (Trọng tài bệ)** chỉ được gán quyền nhập điểm cho bệ bắn mà họ được phân công tại vòng đấu đang hoạt động. Họ **SHALL NOT** xem hoặc sửa điểm của bệ bắn khác.
*   **Media Operator (Nhân viên truyền thông)** chỉ có quyền đọc dữ liệu thông qua listener thời gian thực. Họ **NÊN** bị chặn ghi dữ liệu lên bất kỳ collection nào ngoại trừ cấu hình hiển thị camera của OBS.

### 4.2. Phân chia nghĩa vụ (Separation of Duties - SoD)
*   Nhân viên nhập điểm (**Score Operator** hoặc **Referee**) **MUST NOT** là người phê duyệt kết quả chung cuộc của vòng đấu (**Approve Result**).
*   Người gán bệ bắn (**Check-In Staff**) **MUST NOT** là người nhập điểm trực tiếp tại bệ bắn đó (**Referee**) để triệt tiêu hiện tượng móc ngoặc gian lận bệ thi đấu.
*   Người sửa điểm thi đấu (**Head Referee** hoặc **Admin**) **MUST NOT** thực hiện sửa điểm mà không có sự chứng kiến và đồng thuận bằng văn bản/mã PIN xác nhận từ Trọng tài bệ.

### 4.3. Quy tắc Ghi đè Khẩn cấp (Emergency Override Rules)
*   Trong tình huống khẩn cấp (mất kết nối mạng kéo dài, thiết bị bệ bắn lỗi phần cứng hỏng màn hình), **Tournament Director** hoặc **Head Referee** được phép sử dụng **Emergency Access Key** (Mã khóa khẩn cấp) để ghi đè trạng thái của bệ bắn từ xa thông qua ứng dụng Admin chính.
*   Mọi tác vụ ghi đè khẩn cấp **MUST** tạo ra một bản ghi kiểm toán `EMERGENCY_OVERRIDE` lưu trữ bền vững tại `audit_logs` có kèm theo:
    1.  UID người thực hiện.
    2.  Mã bệ bắn bị can thiệp.
    3.  Lý do can thiệp bắt buộc phải nhập bằng văn bản tiếng Việt có dấu.
    4.  Mốc thời gian chính xác ở cấp độ mili-giây.

### 4.4. Quy tắc phụ thuộc quyền (Permission Dependency Rules)
*   Để thực hiện quyền **Submit Score (Nhập điểm)**, tài khoản **MUST** đồng thời có các quyền phụ thuộc sau: `Read Tournament Data`, `Active Session Token`, và `Assigned Lane ID`.
*   Để thực hiện quyền **Unlock Scoring (Mở khóa nhập điểm)**, tài khoản **MUST** sở hữu quyền `Head Referee Role` hoặc `System Owner Role` và có mã định danh thiết bị đã được định cấu hình từ trước trên hệ thống.

### 4.5. Ghi chú bảo mật hệ thống (Security Notes)
1.  **Chống rò rỉ API Key**: Không cấu hình các khóa bảo mật Firebase Service Account ở phía Client-side. Toàn bộ các tác vụ nâng cao hoặc kết xuất báo cáo quy mô lớn **MUST** được điều phối qua Backend API.
2.  **Khóa phiên hoạt động**: Phiên hoạt động (Session) của tài khoản Referee và Check-In Staff **MUST** tự động hết hạn và yêu cầu đăng nhập lại sau 4 tiếng liên tục để đảm bảo thiết bị di động bị bỏ quên không bị lợi dụng để sửa đổi điểm số.
3.  **Mã hóa kênh truyền**: 100% kết nối truyền nhận dữ liệu thời gian thực giữa thiết bị Trọng tài, Server Firestore và OBS Overlay **MUST** chạy trên giao thức an toàn SSL/TLS mã hóa HTTPS/WSS.
