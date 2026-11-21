# Triển khai Cinema Booking lên production

Kiến trúc production dùng Host Nginx để kết thúc TLS, proxy tới frontend Nginx
trên `127.0.0.1:3000`. Frontend tiếp tục proxy `/api` và `/ws` qua Docker network
tới backend. Backend, MySQL (`3306`) và Redis (`6379`) không publish port ra host.

## 1. Việc bảo mật bắt buộc trước khi deploy

Các credential từng nằm trong `application.yml` đã xuất hiện trong lịch sử Git
công khai và **không còn an toàn**. Hãy thu hồi rồi tạo mới toàn bộ JWT secret,
Gmail App Password, Cloudinary API secret, ba khóa PayOS và mật khẩu database.
Không sao chép lại giá trị cũ vào `.env`.

Nếu cần xóa secret khỏi lịch sử Git, thực hiện bằng quy trình riêng có phối hợp với
mọi người đang clone repository. Việc sửa lịch sử không thay thế cho thu hồi khóa.

## 2. Chuẩn bị VPS

Chỉ mở firewall cho SSH, HTTP và HTTPS; không mở `8080`, `3306`, `6379`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Tạo user deploy có SSH key và quyền chạy Docker, sau đó đăng nhập lại để group có
hiệu lực:

```bash
sudo usermod -aG docker DEPLOY_USER
sudo install -d -o DEPLOY_USER -g DEPLOY_USER /opt/project-book_movie_tickets
git clone https://github.com/tienvuiet/project-book_movie_tickets.git /opt/project-book_movie_tickets
```

Repository production phải sạch; workflow sẽ dừng nếu `git checkout` gặp thay đổi
tracked, thay vì tự ý xóa chúng.

## 3. Cấu hình `.env`

```bash
cd /opt/project-book_movie_tickets
cp .env.example .env
chmod 600 .env
nano .env
```

Thay mọi `REPLACE_ME`, `REPLACE_WITH...`, `YOUR_DOMAIN` và owner image. Có thể tạo
secret ngẫu nhiên mà không in lại vào log CI:

```bash
openssl rand -hex 32
```

Các ánh xạ quan trọng:

- `MYSQL_USER`, `MYSQL_PASSWORD` → `DB_USERNAME`, `DB_PASSWORD` trong container.
- `REDIS_PASSWORD` → Spring Data Redis và Redis `requirepass`.
- `FRONTEND_URL` → URL trả về/hủy thanh toán PayOS.
- `CORS_ALLOWED_ORIGINS` → CORS HTTP và allowed origins của WebSocket; nhiều origin
  được phân tách bằng dấu phẩy.
- `JWT_SECRET`, Cloudinary, Gmail và PayOS → đúng tên property đang được Java đọc.

Frontend dùng API cùng origin (`/api`) và WebSocket cùng origin (`/ws`), nên không
cần build một biến backend URL vào JavaScript. URL backend công khai là
`https://YOUR_DOMAIN/api`; webhook PayOS là
`https://YOUR_DOMAIN/api/payments/payos/webhook`.

Không commit `.env`. Kiểm tra compose mà không khởi động container:

```bash
docker compose --env-file .env -f docker-compose.prod.yml config --quiet
```

## 4. GitHub Actions và Secrets

Workflow `.github/workflows/deploy.yml` chỉ chạy khi push lên `main`. Nó chạy lint,
test và build; tạo hai image trên GitHub runner; push tag bằng full commit SHA lên
GHCR; sau đó SSH vào VPS, pull image và kiểm tra health từng service. VPS không
build image và workflow không dùng `docker compose down` hay xóa volume.

Tạo GitHub Environment tên `production` và các repository/environment secrets:

| Secret | Nội dung |
| --- | --- |
| `VPS_HOST` | `180.93.127.139` (hoặc hostname sau này) |
| `VPS_PORT` | Cổng SSH, thường là `22` |
| `VPS_USER` | User deploy không phải root |
| `VPS_SSH_PRIVATE_KEY` | Private key dành riêng cho CI, không có passphrase |
| `VPS_KNOWN_HOSTS` | Dòng known-hosts đã xác minh fingerprint của VPS |

Lấy dòng known-hosts từ máy tin cậy bằng `ssh-keyscan -H 180.93.127.139`, nhưng
phải đối chiếu fingerprint với console của nhà cung cấp VPS trước khi lưu Secret.
Public key tương ứng được thêm vào `~/.ssh/authorized_keys` của user deploy.

`GITHUB_TOKEN` do GitHub cấp được workflow dùng để push GHCR và đăng nhập GHCR tạm
thời trên VPS; không cần lưu PAT riêng. Nếu organization chặn package access, cấp
repository quyền đọc package tương ứng trong phần cài đặt GHCR.

## 5. Khởi động lần đầu và kiểm tra

Sau khi workflow đã publish image đầu tiên, trên VPS có thể chạy thủ công:

```bash
cd /opt/project-book_movie_tickets
docker login ghcr.io
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d
docker compose --env-file .env -f docker-compose.prod.yml ps
```

Flyway tự chạy trước khi Spring Boot sẵn sàng. Không sửa migration đã chạy và
không dùng `down -v`. Hai named volume bền vững là
`cinema_booking_mysql_data` và `cinema_booking_redis_data`.

Kiểm tra kỹ log nhưng không chia sẻ secret:

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 backend
docker compose --env-file .env -f docker-compose.prod.yml exec -T backend \
  curl -fsS http://127.0.0.1:8080/actuator/health/readiness
curl -fsS http://127.0.0.1:3000/healthz
```

## 6. Nginx host và HTTPS

Chưa có domain nên repository chỉ chứa template, không tạo domain giả. Sau khi A/AAAA
record trỏ đúng VPS:

```bash
cd /opt/project-book_movie_tickets
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot
sudo cp deploy/nginx/cinema-booking-http.conf.example /etc/nginx/sites-available/cinema-booking
sudo sed -i 's/YOUR_DOMAIN/example.com/g' /etc/nginx/sites-available/cinema-booking
sudo ln -s /etc/nginx/sites-available/cinema-booking /etc/nginx/sites-enabled/cinema-booking
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d example.com
```

Sau khi certificate tồn tại, thay site bằng
`deploy/nginx/cinema-booking-https.conf.example`, thay `YOUR_DOMAIN`, rồi chạy
`sudo nginx -t && sudo systemctl reload nginx`. Xác minh tự gia hạn:

```bash
systemctl status certbot.timer
sudo certbot renew --dry-run
```

Template chuyển đúng `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, Upgrade header
và timeout một giờ cho WebSocket.

## 7. Backup và restore MySQL

Script backup tạo file gzip với quyền riêng tư, dùng transaction nhất quán và chỉ
xóa file backup do chính nó tạo khi quá `BACKUP_RETENTION_DAYS`:

```bash
bash scripts/backup-mysql.sh
gzip -t backups/cinemabooking-YYYYMMDDTHHMMSSZ.sql.gz
```

Cài lịch backup 02:30 hằng ngày:

```bash
sudo cp deploy/systemd/cinema-booking-backup.service /etc/systemd/system/
sudo cp deploy/systemd/cinema-booking-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cinema-booking-backup.timer
systemctl list-timers cinema-booking-backup.timer
```

Sao chép backup sang nơi lưu trữ ngoài VPS. Restore là thao tác ghi dữ liệu: bật
maintenance, tạo thêm một backup, xác nhận đúng file rồi mới chạy:

```bash
cd /opt/project-book_movie_tickets
gzip -dc /ABSOLUTE/PATH/cinemabooking-TIMESTAMP.sql.gz | \
  docker compose --env-file .env -f docker-compose.prod.yml exec -T mysql sh -c \
  'exec mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

Sau restore, khởi động lại backend (không xóa volume) và kiểm tra Flyway/log/health.

## 8. Rollback image

Mỗi deploy thành công lưu tag hiện tại và tag trước trong `.deploy/`. Nếu health
check thất bại, workflow tự đưa backend/frontend về tag trước. Rollback thủ công:

```bash
cd /opt/project-book_movie_tickets
PREVIOUS_TAG="$(cat .deploy/previous-image-tag)"
IMAGE_TAG="$PREVIOUS_TAG" docker compose --env-file .env -f docker-compose.prod.yml up -d --no-deps backend
IMAGE_TAG="$PREVIOUS_TAG" docker compose --env-file .env -f docker-compose.prod.yml up -d --no-deps frontend
```

Rollback image không rollback schema. Vì vậy migration production phải tương thích
ngược; luôn backup trước release có migration.

## 9. Ngân sách tài nguyên và nghiệm thu

Giới hạn hiện tại ưu tiên ổn định trên VPS 2 GB: backend 768 MB (heap khoảng 65%),
MySQL 512 MB (buffer pool 128 MB), Redis 128 MB (dataset 64 MB, `noeviction`) và
frontend 96 MB. Tổng giới hạn là khoảng 1,5 GB, chừa phần còn lại cho Ubuntu,
Docker và Host Nginx. Image được build ở GitHub nên VPS không tốn RAM cho Maven/npm.

Chỉ kết luận deploy thành công sau khi kiểm tra thực tế trên domain production:

1. `docker compose ps` cho thấy cả bốn service healthy và Flyway không lỗi.
2. Refresh trực tiếp một route React không trả 404; API đăng nhập/đăng ký hoạt động.
3. Chọn ghế/đặt vé, thanh toán và webhook PayOS hoạt động với khóa production.
4. DevTools xác nhận WebSocket `wss://DOMAIN/ws` kết nối và chat realtime nhận sự kiện.
5. Upload Cloudinary, Gmail OTP, backup và `certbot renew --dry-run` đều thành công.

Các kiểm tra tích hợp ngoài (PayOS, Gmail, Cloudinary, DNS/TLS và nghiệp vụ trên VPS)
không thể xác nhận chỉ bằng build cục bộ; cần chạy checklist này sau khi có domain và
secret mới.
