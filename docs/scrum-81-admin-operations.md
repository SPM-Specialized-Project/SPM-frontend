# SCRUM-81 — Admin Operations & Smart Alerts: Hướng dẫn kỹ thuật và kiểm thử

Branch: `Feat/Scrum-81`

Tài liệu kỹ thuật và hướng dẫn vận hành cho User Story **`[SCRUM-81]` (US-012.2 / US-013.1)**:
- Admin Operations & System Health Dashboard (Queue & Worker Node Pool).
- Smart Alert rule evaluation (lỗi liên tiếp, lặp vô tận/timeout), deduplication, lifecycle transitions & auto-resolve.
- Request Lifecycle Tracing (UI-09) kèm che giấu dữ liệu nhạy cảm ([REDACTED]).
- Nhật ký kiểm toán bất biến (Immutable Audit Logs).

---

## 1. Kiến trúc và luồng nghiệp vụ đã triển khai

### 1.1. Hạ tầng vận hành & Cảnh báo thông minh (US-013.1)
- **Hàng đợi & Worker Pool**: Đo lường thời gian thực độ dài hàng đợi thực thi (`queueLength`), số container worker đang chạy, độ trễ trung vị $p50 / p95$ (ms) và tỷ lệ lỗi (*Error Rate %*) trên 50 lần thực thi gần nhất.
- **Quy tắc phát hiện lỗi (Rule Evaluation)**:
  - `CONSECUTIVE_FAILURES`: Tự động kích hoạt khi sinh viên chạy thử thất bại từ 3 lần liên tiếp (`WARNING`), nâng cấp lên `CRITICAL` khi đạt từ 5 lần liên tiếp.
  - `TIMEOUT_LOOP`: Kích hoạt mức `CRITICAL` khi phát hiện sinh viên gặp lỗi lặp vô tận / timeout từ 2 lần liên tiếp.
- **Khử trùng lặp (Deduplication)**: Cùng một workspace và cùng loại quy tắc vi phạm sẽ không sinh thêm bản ghi rác mà chỉ tăng `occurrenceCount` và cập nhật `lastOccurredAt`, bảo đảm không gây tràn bảng cảnh báo của giảng viên.
- **Vòng đời cảnh báo (Lifecycle State Machine)**:
  - `ACTIVE` (Chưa tiếp nhận) $\rightarrow$ `ACKNOWLEDGED` (Đang hỗ trợ) $\rightarrow$ `RESOLVED` (Đã khắc phục) hoặc `DISMISSED` (Bỏ qua).
  - **Tự động giải quyết (Auto-Resolve)**: Khi sinh viên nộp code đạt chuẩn và vượt qua test case, hệ thống tự động chuyển trạng thái toàn bộ cảnh báo liên quan sang `RESOLVED`.

### 1.2. Truy vết yêu cầu & Nhật ký kiểm toán (UI-09)
- **Truy vết 4 giai đoạn vòng đời (Request Lifecycle Tracing)**:
  1. `RECEIVED`: Gateway tiếp nhận yêu cầu và thẩm định token.
  2. `DISPATCHED`: Ghi nhận hàng đợi và điều phối tới Worker Pool Node.
  3. `EXECUTED`: Thực thi biên dịch và chạy test bên trong Docker sandbox.
  4. `RECORDED`: Ghi nhận kết quả vào durable ledger và đánh giá luật cảnh báo.
- **Che giấu dữ liệu nhạy cảm (Data Redaction)**:
  - Toàn bộ mã nguồn sinh viên được thay thế bằng chuỗi `[REDACTED_STUDENT_CODE]`.
  - Toàn bộ test case ẩn được che giấu input/output thành `[REDACTED_INPUT]` / `[REDACTED_OUTPUT]`.
  - Mật khẩu và token ủy quyền được che giấu thành `[REDACTED]`.
- **Nhật ký bất biến (Immutable Audit Logs)**: Ghi nhận tất cả các thao tác nhạy cảm gồm `actor`, `action`, `target`, `timestamp`, `requestId`, `result` và `details`.

---

## 2. Danh mục API

| Nhóm | Giao thức & Endpoint | Quyền truy cập | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| **Vận hành** | `GET /api/admin/operations/health` | Admin / Coordinator | Lấy thông số hàng đợi, worker nodes, độ trễ và tỷ lệ lỗi |
| **Truy vết** | `GET /api/admin/operations/traces/:requestId` | Admin / Coordinator | Tra cứu vết yêu cầu với dữ liệu mã nguồn đã che giấu |
| **Kiểm toán** | `GET /api/admin/operations/audit-logs` | Admin / Coordinator | Danh sách nhật ký kiểm toán bất biến |
| **Cảnh báo** | `GET /api/admin/alerts` | Admin / Lecturer | Lấy danh sách cảnh báo, hỗ trợ lọc theo trạng thái |
| **Cảnh báo** | `GET /api/admin/alerts/stats` | Admin / Lecturer | Thống kê số lượng cảnh báo theo mức độ |
| **Cảnh báo** | `PATCH /api/admin/alerts/:id/status` | Admin / Lecturer | Chuyển trạng thái cảnh báo (`ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`) |

> **Bảo mật truy cập (Access Control)**: Sinh viên hoặc người dùng chưa cấp quyền khi gọi tới các endpoint `/api/admin/*` sẽ bị từ chối với mã lỗi HTTP `403 FORBIDDEN`.

---

## 3. Kiểm thử tự động

Từ thư mục gốc `SPM-frontend`:

```powershell
# Chạy bộ unit test chuyên biệt cho SCRUM-81
node --test backend/test/smart-alerts.test.mjs backend/test/admin-operations.test.mjs

# Kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript của Frontend
npm --prefix frontend run check-types

# Biên dịch gói sản phẩm Frontend
npm --prefix frontend run build
```

## 4. Kiểm thử giao diện thủ công

Xem [preconditions và checklist manual test SCRUM-81](./scrum-81-admin-operations-manual-test.md). Chỉ chạy trên thư mục dữ liệu local dùng riêng cho kiểm thử.
