# SCRUM-82 — Semester Data Retention, Disaster Recovery Drill & Session Reports: Hướng dẫn kỹ thuật và kiểm thử

Branch: `Feat/Scrum-82`

Tài liệu kỹ thuật và hướng dẫn vận hành cho User Story **`[SCRUM-82]` (US-012.3 / US-014.1)**:
- Semester Data Retention (4 months data preservation across bi-weekly lab sessions).
- Backup generation with SHA-256 integrity hash verification.
- Disaster Recovery Simulation Drill (`POST /api/admin/backups/:id/verify`).
- Session Report & Metrics calculation (participation, problem completion rates, 4 score distribution buckets).
- Safe handling of empty sessions ($N=0$) returning `N/A` without Divide-by-Zero or 500 errors (AC-14e / AC-238).

---

## 1. Kiến trúc và luồng nghiệp vụ đã triển khai

### 1.1. Lưu trữ học kỳ & Diễn tập phục hồi thảm họa (US-012.3)
- **Lưu trữ xuyên suốt học kỳ**: Dữ liệu ca thực hành được bảo toàn trong 4 tháng; các đợt lab định kỳ 2 tuần/lần không xóa dữ liệu lịch sử.
- **Mã băm toàn vẹn SHA-256**: Mỗi bản sao lưu học kỳ được tính toán mã băm SHA-256 đối chiếu toàn vẹn tệp nén JSON.
- **Diễn tập phục hồi thảm họa (Disaster Recovery Drill)**: Cung cấp API mô phỏng kiểm thử khôi phục khẩn cấp (`POST /api/admin/backups/:id/verify`), tự động tính lại mã băm kiểm tra sai lệch và xác minh tính toàn vẹn ràng buộc khóa ngoại (Foreign Key) giữa Classrooms, Assignments và Workspaces.

### 1.2. Báo cáo buổi thực hành & Xử lý mẫu số rỗng (US-014.1)
- **Chỉ số tham gia**: Tính toán tỷ lệ tham gia trong giờ lab (*In-Lab*) và ngoài giờ (*Outside-Lab*) dựa trên số sinh viên đăng ký $N$.
- **Chỉ số hoàn thành**: Thống kê số lượt nộp, số bài đạt (*Passed*), tỷ lệ hoàn thành theo từng bài tập thực hành.
- **Phân bổ phổ điểm (Score Buckets)**: Nhóm 4 khoảng điểm chuẩn: `[0 - 5.0)`, `[5.0 - 7.0)`, `[7.0 - 8.5)`, `[8.5 - 10.0]`.
- **Kiểm soát an toàn mẫu số rỗng (AC-14e / AC-238)**: Khi buổi học không có sinh viên đăng ký ($N=0$), hệ thống trả về giá trị `null` và hiển thị nhãn `N/A`, tuyệt đối không sinh lỗi chia cho 0, không trả về `NaN` và không gây lỗi HTTP 500.

---

## 2. Danh mục API

| Nhóm | Giao thức & Endpoint | Quyền truy cập | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| **Sao lưu** | `GET /api/admin/backups` | Admin / Coordinator | Danh sách các bản sao lưu học kỳ |
| **Sao lưu** | `POST /api/admin/backups` | Admin / Coordinator | Tạo bản sao lưu học kỳ kèm mã băm SHA-256 |
| **Diễn tập** | `POST /api/admin/backups/:id/verify` | Admin / Coordinator | Chạy diễn tập phục hồi thảm họa và đối soát tính toàn vẹn |
| **Báo cáo** | `GET /api/codepulse/sessions/:id/report` | All authenticated | Báo cáo tỷ lệ tham gia, bài tập và phổ điểm buổi lab |

---

## 3. Kiểm thử tự động

Từ thư mục gốc `SPM-frontend`:

```powershell
# Chạy bộ unit test chuyên biệt cho SCRUM-82
node --test backend/test/session-reports.test.mjs backend/test/admin-operations.test.mjs

# Kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript của Frontend
npm --prefix frontend run check-types

# Biên dịch gói sản phẩm Frontend
npm --prefix frontend run build
```
