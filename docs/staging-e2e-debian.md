# Cross-repository staging E2E

Mô hình đúng của project là:

```text
SPM-frontend/staging
        |
        | repository_dispatch
        v
test-E2E workflow
        |
        +-- chạy trên self-hosted runner của test-E2E
        +-- checkout đúng commit của SPM-frontend
        +-- build và start SPM backend/frontend
        +-- chạy Playwright
        |
        v
SPM-frontend poll kết quả remote
        |
        v
status check E2E trên PR staging -> main
```

`SPM-frontend` không chạy browser test trên runner của chính nó. Runner có label `test-e2e-local` thuộc repository `SPM-Specialized-Project/test-E2E`.

## 1. Push workflow của repository test-E2E trước

Các file test đã có sẵn trong clone local:

- `.github/workflows/run-from-spm.yml`
- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `tests/`

Push chúng lên branch mặc định của `test-E2E`:

```bash
cd /path/to/test-E2E
git add .
git commit -m "ci: run SPM E2E on repository runner"
git push -u origin main
```

## 2. Cấu hình runner trong repository test-E2E

Mở:

`test-E2E → Settings → Actions → Runners → New self-hosted runner`

Chọn Linux/x64 và thêm label:

```text
test-e2e-local
```

Trên Debian 13 cài một lần:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential
node --version
npm --version
```

Node.js nên là version 22. Sau khi runner đã đăng ký, cài dependency Chromium bằng đúng user chạy runner:

```bash
npx playwright install-deps chromium
```

Runner chỉ cần kết nối outbound tới GitHub; không cần mở inbound port cho Actions.

## 3. Token dispatch trong SPM-frontend

Tạo fine-grained PAT cho `SPM-frontend` và cấp riêng quyền trên repository `SPM-Specialized-Project/test-E2E`:

- `Contents: Read and write`: gửi `repository_dispatch`.
- `Actions: Read`: đọc trạng thái workflow remote.

Lưu token tại:

`SPM-frontend → Settings → Secrets and variables → Actions → New repository secret`

```text
Name: E2E_DISPATCH_TOKEN
```

Nếu `SPM-frontend` là private, tạo thêm token có `Contents: Read` trên `SPM-frontend`, rồi lưu trong repository `test-E2E`:

```text
Name: SPM_CHECKOUT_TOKEN
```

Nếu `SPM-frontend` public thì `SPM_CHECKOUT_TOKEN` có thể không cần; workflow dùng `github.token` để checkout commit public.

## 4. Cách workflow hoạt động

`.github/workflows/staging-e2e.yml` trong `SPM-frontend` chạy khi:

- Có push vào `staging`.
- Có PR `staging -> main`.
- Chạy thủ công bằng `workflow_dispatch`.

Workflow gửi payload chứa:

- repository SPM cần test;
- `app_sha` của commit staging hoặc merge commit của PR;
- mã correlation để tìm đúng workflow run ở `test-E2E`.

Sau đó workflow ở `SPM-frontend` poll trạng thái workflow `Run SPM E2E`. Vì vậy kết quả chạy trên runner của `test-E2E` vẫn trở thành status check `E2E (test-E2E runner)` của PR gốc.

## 5. Required checks trên main

Trong branch protection/ruleset của `main`, bắt buộc:

```text
Frontend Quality
Backend Quality
Promotion source (staging only)
E2E (test-E2E runner)
```

Không cho phép push trực tiếp vào `main`. `Promotion source (staging only)` chặn PR từ feature branch hoặc fork đi thẳng vào `main`.

Self-hosted runner không nên nhận PR không tin cậy. Workflow hiện chỉ dispatch E2E cho branch `staging` của chính repository, không dispatch cho fork.

## 6. Port và dữ liệu

Trên runner `test-E2E`, app SPM tạm thời chạy ở:

```text
Frontend: 3010
Backend:  4010
```

Backend dùng thư mục dữ liệu tạm của từng workflow run. Nó không ghi vào `backend/data` của repository và không dùng dữ liệu production.
