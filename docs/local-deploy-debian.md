# Deploy main và staging dùng chung Gitea trên Debian

Sau khi thay đổi được đưa vào `main`, workflow `.github/workflows/main-ci.yml`
chạy quality checks, tự setup dịch vụ production và deploy từ chính commit
`main`. Setup dùng chung stack `/srv/git-platform` với staging.

## Secrets và Variables trên GitHub

Vào **Settings → Secrets and variables → Actions → Secrets**. Cả main và
staging dùng chung hai repository secrets:

| Secret | Giá trị |
| --- | --- |
| `GITEA_ADMIN_PASSWORD` | Mật khẩu admin Gitea mới, ít nhất 12 ký tự |
| `RUNNER_SUDO_PASSWORD` | Mật khẩu Linux của tài khoản chạy self-hosted runner |

Không cần thêm secret riêng bắt buộc cho main. Mật khẩu admin đã tồn tại được
giữ nguyên. Secret sudo có thể bỏ qua nếu runner có quyền root sudo không cần
mật khẩu. Giữ secret `E2E_DISPATCH_TOKEN` đang có cho bước promotion.

| Cấu hình tùy chọn | Loại | Mặc định/hành vi |
| --- | --- | --- |
| `GITEA_ADMIN_USERNAME` | Variable | `spm-admin`, chung cho cả hai môi trường |
| `GITEA_ADMIN_EMAIL` | Variable | `spm-admin@example.com` |
| `GITEA_OWNER` | Variable | `codepulse-bot`, dành cho staging |
| `GITEA_MAIN_OWNER` | Variable | `codepulse-bot-main`, dành cho main |
| `GITEA_API_TOKEN` | Secret | Token staging; tự tạo nếu không khai báo |
| `GITEA_MAIN_API_TOKEN` | Secret | Token main; tự tạo nếu không khai báo |
| `POSTGRES_PASSWORD` | Secret | Giữ mật khẩu PostgreSQL hiện có nếu không khai báo |

Token tự tạo được kiểm tra bằng thao tác repo private, branch và file commit,
sau đó được giữ lại cho lần deploy tiếp theo. Nếu tự cung cấp token, token
phải thuộc đúng service account của môi trường, truy cập được repo private
và có scopes `write:repository,write:user`. Mật khẩu PostgreSQL khai báo thêm
phải trùng với mật khẩu của database hiện có.

Không dùng cùng owner cho hai môi trường có dữ liệu ứng dụng độc lập:
backend đặt tên repo từ assignment ID, nên các bài tập trùng ID sẽ đụng repo.
Hai service accounts khác nhau vẫn sử dụng cùng một Gitea và database.

## Thành phần dùng chung và thành phần riêng

| Thành phần | Main | Staging |
| --- | --- | --- |
| Gitea API | `http://127.0.0.1:8211/api/v1` | Cùng API |
| Gitea/PostgreSQL | `gitea` / `git-postgres` trong một Compose project | Cùng containers, database và volumes |
| Owner repo | `codepulse-bot-main` | `codepulse-bot` |
| Nginx / backend | `80 / 4000` | `8080 / 4011` |
| Backend env | `/etc/spm-frontend/backend.env` | `/etc/spm-frontend/staging.env` |
| Dữ liệu ứng dụng | `/opt/spm-frontend/shared/data` | `/opt/spm-frontend-staging/shared/data` |
| Backend service | `spm-backend.service` | `spm-staging-backend.service` |
| Quick Tunnel | `spm-quick-tunnel.service` | `spm-staging-quick-tunnel.service` |

Database PostgreSQL ở đây phục vụ Gitea. Dữ liệu backend ứng dụng hiện vẫn
dùng các file JSON trong thư mục riêng của từng môi trường.

Setup không tạo database Gitea thứ hai, không xóa volumes, không đổi password
database đang dùng và không sao chép dữ liệu ứng dụng staging sang main.
Nó giữ Compose project/volume identities và từ chối thay đổi image Gitea.

## Trình tự đưa thay đổi lên main

1. Thêm hai secrets trên GitHub nếu chưa có.
2. Merge PR chứa cấu hình này vào `staging`, đợi **Staging Deploy** xanh.
3. Mở PR `staging → main` theo quy trình promotion hiện có; đợi checks/E2E.
4. Merge PR promotion vào `main`.
5. Mở **Actions → Main CI → lần chạy mới nhất**.
6. Đợi quality jobs và **Deploy local Debian** xanh.
7. Mở **Summary** để lấy URL production, health endpoint và **Shared Gitea**.
8. Kiểm tra publish bài tập và LAB submission trên main; repo sẽ thuộc
   `codepulse-bot-main` trong chính Gitea dùng chung.

Main CI chỉ deploy khi ref là `main`. Có thể dùng **Run workflow** trên main
sau khi cấu hình đã có trong nhánh đó. Nếu thiếu/sai secret, sửa secret rồi
**Re-run failed jobs**. Không cần SSH để thực hiện flow này.

## Cách setup và deploy

Shared helper `deploy/actions/run-deployment-setup.mjs` chọn môi trường từ
`SPM_DEPLOY_ENVIRONMENT=main` hoặc `staging`. Nó xác thực secrets/sudo trước
khi build và gọi setup root dưới khóa `flock`. Hai deploy jobs còn dùng chung
GitHub concurrency group `spm-git-platform-deploy` để tránh deploy đồng thời.
Nhóm này dùng `cancel-in-progress: false` theo
[cơ chế concurrency của GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

Main setup cài/cập nhật Nginx site, backend/tunnel systemd units, deploy helper
và quyền sudo giới hạn; tạo environment file khi thiếu, giữ các giá trị cũ.
Node 22 được đặt ngoài thư mục home của runner để backend systemd chạy được.
Docker Engine, Compose, cloudflared và runner online với label `local-deploy`
là các prerequisites trên Debian hiện có.

Nếu Gitea chưa cài đặt, setup migrate database và tạo admin trước khi bật
`INSTALL_LOCK=true`. Nếu đã cài, nó giữ users/repos. Nó tạo service account
main khi thiếu và lưu token vào `backend.env` với owner `root:spm`, mode `0640`.

Deploy helper tạo release mới rồi chuyển symlink `current`, restart backend
của đúng môi trường và reload Nginx. Các kiểm tra gồm frontend, `/api/health`,
`/git/` và `/git/api/v1/version` ở URL công khai.

## URL Gitea dùng chung

Gitea có một `ROOT_URL`. Khi mới chỉ staging chạy, ROOT_URL dùng URL staging.
Sau khi main deploy thành công bước tunnel, setup lưu URL main làm URL Gitea.
Các lần deploy staging tiếp theo giữ URL main và không restart Gitea chỉ để
đổi hostname. Khi main lấy URL tunnel mới, nó cập nhật ROOT_URL theo URL mới.

Actions Summary của cả hai môi trường trả về URL Gitea đã chọn. Các backend
vẫn gọi API loopback `8211` nên không phụ thuộc hostname public.
Quick Tunnel chưa cần domain hay Cloudflare credentials, nhưng URL có thể
đổi khi tunnel restart. Muốn URL/clone address cố định cần Named Tunnel và
domain sau này.

## Kiểm tra trước khi đưa lên GitHub

- `npm run backend:test`: regression cho API ứng dụng.
- `npm run deploy:test`: validation, volume/password continuity, hai môi trường
  và ưu tiên URL main.
- Harness Docker trong [hướng dẫn staging](staging-deploy-debian.md) chạy
  Gitea/PostgreSQL/Redis thật; kiểm tra hai owners tạo repo trùng tên độc lập,
  token reuse, giữ application data/environment, setup song song được khóa
  và staging không ghi đè URL main.

Harness stub systemd/Nginx/cloudflared. Dịch vụ và tunnel Debian thực tế được
xác nhận bằng Actions sau khi merge; harness không thay thế bước này.
