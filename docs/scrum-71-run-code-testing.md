# SCRUM-71 — Run Code in Sandbox: triển khai và tự kiểm thử

Branch: `SCRUM-71-US-007.1-Run-Code-in-Sandbox`.

## 1. Luồng đã triển khai

`Run → kiểm tra owner/membership/practice window → snapshot code + version + public tests + limits + image ID → Execution QUEUED → RUNNING → Docker worker → FINISHED → UI poll kết quả`.

- Có hai mode: `STDIN` và `PUBLIC_TESTS`. Không nhận runtime, memory hoặc CPU do sinh viên tự chọn; backend lấy chúng từ version đã ghim.
- Snapshot chứa nguyên source code, SHA-256 source, assignmentVersionId, CPU/memory/wall limits, comparator, bộ public tests được chọn và Docker image ID bất biến. Worker dùng chính snapshot này.
- Run không tạo Submission, không tính điểm và không đánh dấu Completed. `passedCount` chỉ là đối chiếu public tests. Chế độ stdin luôn có `totalCount = passedCount = 0`.
- Trạng thái chạy thành công là `SUCCESS`, kể cả output không khớp public test; từng test sẽ là `PASSED` hoặc `WRONG_ANSWER`.
- Verdict lỗi: `COMPILE_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `OUTPUT_LIMIT_EXCEEDED`, `INTERNAL_ERROR`. Python được kiểm tra cú pháp riêng nên SyntaxError/IndentationError là Compile Error.
- Internal Error không giữ test nào ở trạng thái Passed và không tính thành lỗi học tập. Container bị hạ do hạ tầng hoặc image/runtime không sẵn sàng là Internal Error.
- Pool có 2 worker, tối đa 32 job đang chờ/chạy và 2 job mỗi owner. Vượt giới hạn trả HTTP `429 EXECUTION_QUEUE_FULL`.
- Theo kiến trúc JSON hiện có của repository, Execution được lưu riêng tại `$BACKEND_DATA_DIRECTORY/codepulse-executions.json`. Chưa có SQL table hoặc hàng đợi phân tán. Chỉ chạy **một backend process trên mỗi thư mục dữ liệu**.
- Khởi động lại backend chuyển job QUEUED/RUNNING cũ thành Internal Error và dọn container liên quan; không tự chạy lại code cũ.

## 2. Chuẩn bị Docker trên Windows

Mở PowerShell tại repository:

```powershell
Set-Location 'C:\disk D\SPM-frontend'
docker desktop start
docker info --format '{{.OSType}}'
docker build -t codepulse-sandbox:1 deploy/sandbox
```

`OSType` phải là `linux`. Docker host phải dùng cgroup v2; supervisor đọc CPU usage từ `/sys/fs/cgroup/cpu.stat` để tính cả process con. Image chứa Python 3.13 và C++17; không cần cài compiler lên Windows.

Sandbox dùng network namespace riêng `--network=none`, root filesystem chỉ đọc, không bind-mount host hay Docker socket, giới hạn process/CPU/RAM/swap, và tmpfs riêng. Supervisor chạy root với quyền tối thiểu để hạ UID/GID và dừng process; code sinh viên chạy UID/GID 65534 và không thể nâng quyền. Thư mục `/work` được phép thực thi để chạy binary C++.

- CPU giới hạn theo cấu hình đề; wall limit mỗi test là `2 × CPU limit + 250 ms`.
- RAM được chặn bằng cgroup của container và RLIMIT_AS của process. RAM container bao gồm cả supervisor/compiler, nên không phải toàn bộ dung lượng đó đều dành cho heap của chương trình.
- Compile có budget riêng: 10 giây CPU, 15 giây wall time. Output stdout + stderr mỗi test giữ tối đa 32.000 byte; vượt mức sẽ dừng và trả Output Limit Exceeded.
- Có thể cấu hình `CODEPULSE_SANDBOX_RUNTIME=runsc` nếu Docker host đã cài gVisor. gVisor không được cài hoặc kiểm chứng bởi thay đổi này.

Tài liệu nền: [Docker run](https://docs.docker.com/reference/cli/docker/container/run/), [Python resource limits](https://docs.python.org/3/library/resource.html).

## 3. Chạy toàn bộ kiểm thử tự động

Sau khi build image:

```powershell
Set-Location 'C:\disk D\SPM-frontend'
npm run backend:test
npm run deploy:test

Set-Location 'C:\disk D\SPM-frontend\frontend'
npx vitest run 'src/features/~_private/~course/~$id/components/student-lab-workspace.test.tsx'
npm run lint
npm run build
```

Chạy riêng story nhanh hơn, từ repository root:

```powershell
node --test backend/test/executions.test.mjs backend/test/sandbox.test.mjs backend/test/run-code.test.mjs
```

Các bài test sandbox thực sự tạo và dừng container; Docker/image thiếu sẽ làm các ca thực thi thất bại. Test hạ tầng dừng **container test có UUID riêng**, không dừng Docker daemon. Mỗi backend API test dùng thư mục tạm, không sửa dữ liệu đang dùng của bạn.

## 4. Chạy ứng dụng với dữ liệu test riêng

Terminal 1, repository root:

```powershell
$env:BACKEND_PORT = '4591'
$env:BACKEND_DATA_DIRECTORY = Join-Path $env:TEMP 'scrum71-manual-data'
npm run backend
```

Terminal 2:

```powershell
Set-Location 'C:\disk D\SPM-frontend\frontend'
$env:VITE_FRONTEND_PORT = '3191'
$env:VITE_BACKEND_PROXY_TARGET = 'http://127.0.0.1:4591'
npm run dev -- --host 127.0.0.1
```

Vào `http://127.0.0.1:3191`. Nếu port đang dùng, đổi cả frontend port hoặc backend port/proxy tương ứng.

## 5. Tự tạo LAB test và chạy bằng UI

1. Đăng nhập `lecturer@gmail.com` / `lecturer123`, mở course `13` → **Terms and classrooms**.
2. Chọn classroom đang ACTIVE trong học kỳ ACTIVE. Dùng đề published đã có public tests và version, hoặc tạo/verify/publish một đề mới theo luồng authoring hiện có (publish mới cần Gitea theo cấu hình của ứng dụng).
3. Tạo LAB, chọn version của đề, đặt practice window bao phủ giờ hiện tại và chuyển LAB sang LIVE. Nếu practice chưa mở, dùng chức năng mở ngay hoặc sửa thời gian.
4. Đăng nhập `student@gmail.com` / `student123`, mở cùng course → **Terms and classrooms** → chọn problem.
5. Ở **Run mode**, chọn **Custom input (stdin)**; nhập code `print(input())`, nhập stdin `Hello sandbox`, bấm **Run**.
6. Kỳ vọng thấy chờ/chạy rồi `SUCCESS`, output `Hello sandbox`. Không có Submission hoặc điểm mới. Nút Submit là thao tác riêng.
7. Chuyển **Public tests**, dùng code đúng với đề và bấm Run; chỉ các public tests xuất hiện trong kết quả.
8. Với giảng viên: trong assignment editor, mở lịch sử version đã chạy. Phần **Run history** hiển thị student, mode, verdict, source và output riêng với phần Submissions.

Hai editor hiện có đều hỗ trợ hai mode. Editor Monaco lưu draft trước Run theo hành vi đang có; editor textarea chạy nguyên nội dung đang nhập mà không tự lưu draft. Execution luôn giữ snapshot source đã chạy.

## 6. Bộ ca kiểm thử thủ công

Chọn Python, STDIN; dùng đề có CPU khoảng 1.000 ms, memory 128 MB:

| Ca | Source code | Kỳ vọng |
| --- | --- | --- |
| In output | `print("OK")` | SUCCESS; stdout `OK` |
| Đọc input | `print(input())` | SUCCESS; output đúng dòng stdin |
| Lỗi cú pháp | `def broken(:` | COMPILE_ERROR |
| Lỗi runtime | `raise ValueError("test")` | RUNTIME_ERROR, có stderr |
| Đệ quy | `def f(): return f()` xuống dòng `f()` | RUNTIME_ERROR hoặc MLE; không crash backend |
| CPU | `while True: pass` | TIME_LIMIT_EXCEEDED |
| Wall time | `import time; time.sleep(30)` | TIME_LIMIT_EXCEEDED |
| Memory | `data = bytearray(512 * 1024 * 1024)` | MEMORY_LIMIT_EXCEEDED |
| Output lớn | `print("x" * 100000)` | OUTPUT_LIMIT_EXCEEDED; output bị cắt |
| Internet | `import socket; socket.create_connection(("1.1.1.1", 80), 1)` | RUNTIME_ERROR; Network unreachable/Permission denied |
| Parent filesystem | `print(open("/proc/1/root/etc/shadow").read())` | RUNTIME_ERROR; PermissionError |
| Ghi root filesystem | `open("/etc/student-write", "w")` | RUNTIME_ERROR; read-only/permission error |

Các file runtime công khai **bên trong image sandbox**, ví dụ thư viện Python, vẫn đọc được. Host/backend filesystem và secrets không được mount vào container.

Kiểm tra hạ tầng hỏng mà không dừng Docker hoặc ảnh hưởng tác vụ khác: khởi động một backend test riêng với biến:

```powershell
$env:CODEPULSE_SANDBOX_IMAGE = 'codepulse-missing-image:invalid'
```

Run phải trả `INTERNAL_ERROR`, không hiển thị Passed hoặc Runtime Error cho code sinh viên. Sau đó bỏ biến và khởi động lại backend:

```powershell
Remove-Item Env:CODEPULSE_SANDBOX_IMAGE
```

## 7. Kiểm thử API bằng PowerShell

Với backend test riêng ở port 4591 và dữ liệu seed mới, `workspace-1` thuộc tài khoản student:

```powershell
$apiRoot = 'http://127.0.0.1:4591/api'
$session = Invoke-RestMethod -Uri "$apiRoot/auth/login" -Method Post `
  -ContentType 'application/json' `
  -Body (@{email='student@gmail.com';password='student123'} | ConvertTo-Json)
$runHeaders = @{Authorization="Bearer $($session.accessToken)"}
$queued = Invoke-RestMethod -Uri "$apiRoot/codepulse/workspaces/workspace-1/execute" `
  -Method Post -Headers $runHeaders -ContentType 'application/json' `
  -Body (@{sourceCode='print(input())';mode='STDIN';stdin='Hello sandbox'} | ConvertTo-Json)

do {
  Start-Sleep -Milliseconds 300
  $execution = Invoke-RestMethod -Uri "$apiRoot/codepulse/executions/$($queued.item.id)" -Headers $runHeaders
} while ($execution.item.state -ne 'FINISHED')
$execution.item | Select-Object id,state,status,assignmentVersionId,sourceHash,sandboxImage,limits,stdout,stderr,passedCount,totalCount
```

Kỳ vọng POST trả HTTP 202; kết quả cuối SUCCESS, stdout `Hello sandbox`, limits lấy từ version; `passedCount=0`, `totalCount=0`.

Đổi body thành `@{sourceCode='print(input())';mode='PUBLIC_TESTS'}` để chạy public tests. Body có `testCaseIds=@('hidden-1')` phải bị từ chối HTTP 400. Trên dữ liệu thật, thay `workspace-1` bằng workspaceId do API/UI trả về; quyền owner và practice window vẫn được kiểm tra.

Các endpoint:

| Endpoint | Kết quả |
| --- | --- |
| `POST /api/codepulse/workspaces/:id/execute` | Tạo Execution; 202 + snapshot QUEUED |
| `GET /api/codepulse/executions/:id` | Poll một Execution; owner hoặc lecturer quản lý classroom |
| `GET /api/codepulse/executions?workspaceId=:id` | Tối đa 100 Execution gần nhất trong phạm vi được phép |
| `POST /api/codepulse/classrooms/:classroom/assignments/:assignment/run` | Adapter cũ: cũng xếp hàng sandbox, chờ rồi trả 200; body hỗ trợ hai mode |
| `GET /api/codepulse/classrooms/:classroom/assignment-versions/:version/history` | Lecturer xem Submissions và Executions riêng |

## 8. Đối chiếu acceptance criteria và nơi sửa

| AC | Triển khai | Kiểm chứng |
| --- | --- | --- |
| AC-07a | Snapshot source/version/tests/limits/image ID; STDIN/PUBLIC_TESTS; queue + polling | `executions.test.mjs`, `run-code.test.mjs`; test pinned LAB v1/v2 trong `versioning.test.mjs` |
| AC-07c | Execution ledger riêng; không gọi gradeSubmission, không sửa completed | `run-code.test.mjs`: submissions trước/sau, không có score, workspace completion/draft không đổi |
| AC-07d | Cgroup + CPU accounting + RLIMIT + wall watchdog; verdict riêng | `sandbox.test.mjs`: chương trình thật gây TLE/MLE/output limit |
| AC-07e | Worker lỗi/mất image/container bị kill/restart đều là Internal Error | `executions.test.mjs`, `sandbox.test.mjs`, `run-code.test.mjs` |
| Isolation | Network none, readonly filesystem, không host mounts, UID 65534 | Test socket, parent filesystem, ghi `/etc`, bảo vệ supervisor trong `sandbox.test.mjs` |

- `backend/executions.mjs`: validation hai mode, queue/admission, snapshot, kết quả và recovery.
- `backend/sandbox.mjs`: Docker flags, pin image ID, watchdog phía host, inspect OOM, cleanup.
- `deploy/sandbox/supervisor.py`: compile, chạy UID thấp, CPU/memory/wall/output và verdict.
- `backend/codepulse.mjs`: permission, pinned version, route Run/history và workspace latest result.
- `frontend/src/services/codepulse-api.ts`: request 202, types và poll.
- `sandbox-run-controls.tsx`, `student-lab-workspace.tsx`, `dsa-lab-management.tsx`: mode/stdin và verdict trên hai editor.
- `assignment-editor.tsx`: lecturer Run history.

## 9. Phạm vi xác nhận và vận hành

Kết quả kiểm tra local ngày 21/10/2026: 34/34 backend tests, 10/10 deployment configuration tests, 4/4 workspace UI tests; ESLint và production build thành công. Kiểm tra trực tiếp bằng trình duyệt đã xác nhận custom stdin, public test pass 1/1, Compile Error, TLE và MLE. Các bài test backend chạy Docker thật, gồm cả ca kill container để kiểm tra Internal Error.

Đây là Docker sandbox đã được kiểm thử local, không phải xác nhận triển khai Debian hoặc kiểm toán chống container escape. Không tự deploy từ task này.

CI đã thêm bước build image trước backend tests. Khi triển khai thực tế, máy chạy backend phải có Docker CLI, quyền truy cập Docker daemon và image `codepulse-sandbox:1` đã build; không chỉ máy CI. Các service systemd hiện chạy user `spm`, nên người vận hành cần cấp quyền Docker cho đúng user theo cấu hình hạ tầng. Không mở Docker socket hoặc quyền cấu hình container cho sinh viên.

Các version seed cũ chỉ có metadata, thiếu test suite/limits, sử dụng cấu hình tương thích hiện có của ứng dụng (mặc định 1.000 ms/128 MB khi thiếu). Version mới được publish có snapshot đầy đủ. Muốn kiểm chứng nguồn gốc cấu hình cũ chính xác từ lúc publish cần migrate seed/version thiếu dữ liệu; không thể suy ra dữ liệu lịch sử đã thiếu.

## 10. Kiểm chứng Debian và điều kiện trên máy thật

Đã chạy **34/34 backend tests thành công trong Debian GNU/Linux 12 (bookworm) container**, Node **22.23.1**, user `spm` UID **10001**, root filesystem chỉ đọc và `no-new-privileges`. Harness được cấp quyền kết nối Docker socket để tạo container sandbox riêng; socket này chỉ có trong harness tin cậy, không được truyền vào container chạy code sinh viên. Các job sinh viên vẫn chạy UID 65534.

Đây là kiểm chứng Debian userspace trên Docker Desktop Linux engine, cgroup v2; chưa phải kiểm chứng kernel, systemd unit, Docker permissions hoặc deployment trên máy Debian thật của bạn. Chưa kiểm thử riêng Debian 13 host.

Hai ca isolation lúc đầu có thể chạm CPU budget 200 ms trước khi Python trả traceback. Các ca isolation hiện dùng budget chuẩn 1.000 ms; ca CPU/wall timeout vẫn giữ riêng 200 ms/650 ms. Giới hạn production vẫn lấy nguyên cấu hình đề, không thay đổi vì điều chỉnh test này.

### Kiểm tra trực tiếp trên Debian

Tại thư mục repository chứa code của branch này, dùng tài khoản vận hành Docker:

```bash
node --version
sudo docker info --format 'OS={{.OSType}} cgroup={{.CgroupVersion}}'
sudo docker build -t codepulse-sandbox:1 deploy/sandbox
sudo -u spm -H docker info --format 'OS={{.OSType}} cgroup={{.CgroupVersion}}'
sudo -u spm -H node backend/scripts/check-sandbox.mjs
```

Kỳ vọng Node 22, OS `linux`, cgroup `2`, và dòng `Sandbox ready: host=linux ... studentUid=65534`. Script kiểm tra quyền Docker, image, resource controllers và chạy chương trình stdin thật; lỗi trả exit code 1.

User `spm` phải đọc được đường dẫn script và các thư mục cha. Sau khi release chứa script mới đã được cài vào staging, có thể kiểm tra tại đường dẫn cố định:

```bash
sudo -u spm -H node /opt/spm-frontend-staging/current/backend/scripts/check-sandbox.mjs
```

Với main, thay `/opt/spm-frontend-staging` bằng `/opt/spm-frontend`. Nếu cấu hình `CODEPULSE_SANDBOX_IMAGE` hoặc `CODEPULSE_SANDBOX_RUNTIME` riêng trong service environment, truyền đúng các biến đó khi chạy preflight.

Nếu báo permission denied với Docker socket, quản trị viên cần cấp quyền cho service account. Với Docker Engine rootful tiêu chuẩn và group `docker` đã có:

```bash
sudo usermod -aG docker spm
sudo -u spm -H docker info
```

Sau đó restart **service tương ứng** để process mới nhận supplementary groups: staging là `spm-staging-backend`, main là `spm-backend`. Quyền Docker của backend là quyền quản trị host theo mô hình Docker rootful; [tài liệu Docker](https://docs.docker.com/engine/install/linux-postinstall/) mô tả rõ hệ quả của group này.

Chỉ build image trên GitHub-hosted CI chưa tạo image trên máy Debian chạy backend. Workflow main hiện có hai job chất lượng/deploy tách máy, nên phải chuẩn bị image trên máy deploy bằng lệnh build ở trên. Các script installer hiện tại chưa tự cấp group Docker cho `spm`.

### Tái chạy Debian harness

Từ repository root trên một Docker Linux host, lấy GID của socket rồi chạy:

```bash
docker build -t codepulse-debian-test:1 -f deploy/sandbox/Dockerfile.debian-test .
socket_gid=$(docker run --rm --user 0 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  codepulse-debian-test:1 stat -c '%g' /var/run/docker.sock)
docker run --rm --read-only --security-opt no-new-privileges \
  --tmpfs /tmp:rw,nosuid,nodev,size=256m \
  -v /var/run/docker.sock:/var/run/docker.sock --group-add "$socket_gid" \
  codepulse-debian-test:1 node --test
```

Harness không chạy systemd. Kết quả pass không thay cho `systemctl status`, journal và Run từ UI/API trên bản Debian đã deploy.
