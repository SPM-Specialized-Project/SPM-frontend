# Quan sát frontend với Datadog, Sentry và Grafana

Frontend có thể gửi lỗi và dữ liệu trải nghiệm trình duyệt tới từng nhà cung cấp riêng. Code dùng Datadog RUM, Sentry React SDK và Grafana Faro. SDK chỉ khởi tạo khi có đủ biến cấu hình; thiếu cấu hình thì app vẫn chạy như bình thường.

## Chạy Grafana và Loki local

Từ thư mục gốc repository, chạy PowerShell:

```powershell
.\deploy\observability\start-local.ps1
```

Mở Grafana qua Nginx tại `http://localhost:8081/observation/grafana/`. Tài khoản là `admin`; mật khẩu được tạo ngẫu nhiên và lưu trong `%LOCALAPPDATA%\SPM-Observability\grafana.env`. Local chỉ mở gateway Nginx ở cổng `8081`; cổng Grafana `3000` nằm trong Docker network và không publish ra host. Dừng dịch vụ bằng `.\deploy\observability\stop-local.ps1`; dữ liệu vẫn được giữ trong Docker volumes.

Grafana đã được provision datasource Loki (`http://loki:3100`) và Loki không mở cổng ra máy chủ. Khi triển khai trên WSL, Alloy đọc journal của `spm-backend.service` và `spm-staging-backend.service`, rồi gửi log vào Loki. Trong Grafana chọn **Explore → Loki** và chạy `{job="spm-backend"}` hoặc `{job="spm-staging-backend"}`. Bản local trên Windows chỉ khởi động Grafana và Loki; log sẽ trống cho tới khi có nguồn gửi log.

Trên WSL deploy host, mật khẩu admin được lưu riêng ở `/etc/spm-observability/grafana.env`; chủ máy có thể đọc bằng `sudo cat /etc/spm-observability/grafana.env`. Không chạy lệnh đó trong GitHub Actions vì nó sẽ in credential vào log.

## Cấu hình local

1. Tạo ứng dụng trình duyệt trong các dịch vụ bạn định dùng:
   - [Datadog Browser RUM](https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/setup/client/) — lấy Application ID, Client Token và site, ví dụ `datadoghq.com` hoặc `us5.datadoghq.com`.
   - [Sentry JavaScript](https://docs.sentry.io/platforms/javascript/guides/react/) — lấy DSN của dự án browser.
   - [Grafana Cloud Frontend Observability](https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-applications/frontend-observability/get-started/instrument-react/) — tạo Frontend App, cho phép origin local như `localhost`, rồi lấy Faro collector URL.
2. Trong thư mục `frontend`, sao chép `.env.example` thành `.env.local` và điền thông tin tương ứng. Để chỉ bật một dịch vụ, chỉ cần điền biến của dịch vụ đó.
3. Chạy `npm run dev`. Các biến Vite được đóng vào bundle lúc chạy lệnh build.

Datadog cần cả `VITE_DATADOG_APPLICATION_ID` và `VITE_DATADOG_CLIENT_TOKEN`. Sentry cần `VITE_SENTRY_DSN`. Grafana cần `VITE_GRAFANA_FARO_URL`.

## Cấu hình staging và production

Tạo các **Actions variables** trong GitHub repository, tại **Settings → Secrets and variables → Actions → Variables**:

| GitHub variable | Giá trị |
| --- | --- |
| `DATADOG_APPLICATION_ID` | Datadog Browser RUM Application ID |
| `DATADOG_CLIENT_TOKEN` | Datadog Browser Client Token |
| `DATADOG_SITE` | Site của tổ chức, ví dụ `datadoghq.com` |
| `DATADOG_SESSION_SAMPLE_RATE` | Tỷ lệ phiên Datadog từ `0` đến `100`, mặc định `100` |
| `DATADOG_DASHBOARD_URL` | URL RUM Explorer hoặc dashboard Datadog của bạn |
| `SENTRY_DSN` | DSN của dự án browser |
| `SENTRY_DASHBOARD_URL` | URL project Issues của Sentry |
| `GRAFANA_FARO_URL` | URL collector trong Web SDK Configuration của Grafana |
| `GRAFANA_APP_NAME` | Tên frontend trong Grafana, mặc định `code-pulse-frontend` |
| `GRAFANA_SESSION_SAMPLING_RATE` | Tỷ lệ phiên Grafana từ `0` đến `1`, mặc định `1` |

Các workflow build chuyển biến telemetry vào frontend và sinh map Nginx cho URL Datadog/Sentry đã cấu hình. Grafana UI chạy riêng cùng Loki. Chỉ dùng khóa public dành cho browser. `VITE_*` không phải nơi lưu secret; không đưa Sentry auth token, Datadog API key hay Grafana API key vào đó.

## Mở giao diện qua Nginx

Grafana được host tại đây, không chuyển hướng ra `grafana.com`:

- Local: `http://localhost:8081/observation/grafana/`
- Deploy GitHub Actions: `<Quick Tunnel URL>/observation/grafana/`
- Local: Nginx gateway port `8081` → Grafana container port `3000` trong Docker network.
- Deploy host: Grafana container port `3000` → loopback `127.0.0.1:3101` → host Nginx path `/observation/grafana/`. Cổng `3101` không mở công khai.

`/observation/datadog` và `/observation/sentry` dùng URL tenant/project riêng trong `DATADOG_DASHBOARD_URL` và `SENTRY_DASHBOARD_URL`. Nginx redirect thẳng tới đúng URL đã cấu hình. Khi chưa có URL, Nginx trả HTTP 503 kèm hướng dẫn cấu hình; không tự chuyển tới trang chung `datadog.com`, `grafana.com` hay `sentry.io`. Datadog/Sentry không được chạy trong Compose này. Các path gõ nhầm cũ `/obsesrvation/...` vẫn được hỗ trợ.

Quick Tunnel có hostname ngẫu nhiên sau mỗi lần khởi động; dùng URL mới trong Actions summary. Nginx nhận hostname hiện tại và tiếp tục proxy Grafana ở cùng path.

## Dùng trong code

`ObservabilityErrorBoundary` bao quanh app và gửi lỗi React được bắt tới mọi SDK đang bật. Lỗi JavaScript không được xử lý cũng được các SDK tự thu nhận. Với lỗi đã xử lý trong `catch`, gọi helper chung:

```ts
import { captureException } from '@/services/observability';

try {
  await saveSubmission();
} catch (error) {
  captureException(error, { feature: 'submission' });
}
```

Các trường `feature` và context tự thêm chỉ nên chứa nhãn kỹ thuật tổng quát, không có tên, email, nội dung bài làm hoặc token của người dùng.

## Tìm dữ liệu

- **Datadog:** mở **Digital Experience → RUM Explorer**, lọc `service:code-pulse-frontend`, `env:staging` hoặc `env:production`; xem views, tài nguyên mạng, Web Vitals và lỗi.
- **Sentry:** mở dự án browser rồi xem **Issues**; lọc theo môi trường và release để so sánh lỗi giữa các lần deploy.
- **Grafana/Loki:** mở **Explore → Loki**, rồi lọc `job="spm-backend"` hoặc `job="spm-staging-backend"` để xem log backend theo môi trường. Frontend Faro là luồng telemetry riêng và cần `GRAFANA_FARO_URL`.

## Mặc định thu thập và riêng tư

- Datadog lấy 100% phiên RUM mặc định; chỉnh `VITE_DATADOG_SESSION_SAMPLE_RATE` (0–100) để giảm tỷ lệ. Session Replay, click tracking và anonymous user tracking tắt.
- Grafana lấy 100% phiên mặc định; chỉnh `VITE_GRAFANA_SESSION_SAMPLING_RATE` (0–1) để lấy mẫu.
- Faro không thu console logs; Sentry tắt thu thập cookies, HTTP headers/bodies, query parameters, thông tin người dùng và dữ liệu nhạy cảm liên quan.
- Query string và fragment được bỏ khỏi URL telemetry. Không đặt thông tin nhận dạng cá nhân trong path URL hoặc nội dung exception.
- Ba dịch vụ nhận bản sao sự kiện nếu cùng được cấu hình; bật riêng từng dịch vụ nếu chỉ cần một nơi.

Kiểm tra quy định đồng ý thu thập dữ liệu và chính sách riêng tư của sản phẩm trước khi bật telemetry cho người dùng thật. Các khóa browser nói trên được đóng vào JS bundle và sẽ hiển thị cho người dùng trình duyệt.

Sentry nhận lỗi ngay sau khi cấu hình DSN, nhưng workflow hiện chưa upload source maps. Nếu cần stack trace gắn với TypeScript thay vì bundle đã minify, hãy cấu hình Sentry Vite plugin riêng với `SENTRY_AUTH_TOKEN` lưu trong GitHub Secrets.
