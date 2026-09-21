# Deploy `main` vào Debian local

Workflow `.github/workflows/main-ci.yml` có thêm job `Deploy local Debian`. Job này chỉ chạy sau `Frontend Quality` và `Backend Quality`, dùng self-hosted runner label `local-deploy`, build frontend production và triển khai một release nguyên tử vào `/opt/spm-frontend`.

Kiến trúc local:

- Nginx listen port `80`, serve `/opt/spm-frontend/current/frontend`.
- Nginx proxy `/api/*` tới backend `127.0.0.1:4000`.
- `spm-backend.service` chạy Node.js bằng user hệ thống `spm`.
- Dữ liệu runtime nằm ở `/opt/spm-frontend/shared/data`, không bị ghi đè khi deploy release mới.
- E2E staging dùng port `3010/4010`, nên không đụng production local `80/4000` trên cùng Debian.

## Cài một lần trên Debian

Đăng nhập bằng user chạy GitHub Actions runner, sau khi Node.js 22 đã được cài ở mức system:

```bash
cd /path/to/SPM-frontend
chmod +x deploy/install-local.sh
RUNNER_USER="$(whoami)" bash deploy/install-local.sh
```

Script cài `nginx`, `rsync`, tạo user `spm`, cài systemd unit, cài Nginx config và cấp quyền sudo giới hạn cho đúng wrapper `/usr/local/sbin/spm-deploy`.

Nếu Debian đang bật site Nginx mặc định, kiểm tra trước:

```bash
ls -l /etc/nginx/sites-enabled/
```

Nếu `default` đang chiếm default server port 80 và không còn dùng, đổi tên để có thể khôi phục:

```bash
sudo mv /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.disabled
sudo nginx -t
```

Không thực hiện lệnh này nếu máy đang phục vụ một website khác qua Nginx.

Runner cần có thêm label:

```text
local-deploy
```

Có thể dùng cùng máy Debian với runner `staging-e2e`; staging E2E chạy ở port `3010/4010`, còn production chạy ở port `80/4000`. Nếu dùng cùng một runner process, GitHub sẽ xếp các job chạy tuần tự; tốt hơn là tạo hai runner service với hai thư mục `_work` riêng.

## Cách hoạt động

Sau khi merge `staging -> main`:

1. `main-ci.yml` chạy quality checks trên GitHub-hosted runner.
2. Nếu cả hai check pass, `deploy-local` được nhận vào Debian runner.
3. Frontend được build từ chính commit `main`.
4. Backend/frontend được copy vào release mới.
5. Symlink `current` chuyển sang release mới.
6. Backend restart, Nginx reload.
7. Workflow kiểm tra `http://127.0.0.1/api/health` và trang `/`.

Để mở từ máy khác trong LAN, truy cập `http://<IP-DEBIAN>/`. Nếu firewall bật, chỉ mở port 80 trong mạng nội bộ:

```bash
sudo ufw allow from 192.168.0.0/16 to any port 80 proto tcp
```

Không đặt password, token hoặc dữ liệu production vào repository. Nếu cần domain/HTTPS, giữ Nginx local làm reverse proxy và bổ sung TLS sau khi HTTP deployment đã ổn định.
