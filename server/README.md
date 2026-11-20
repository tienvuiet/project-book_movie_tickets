# CGV Cinemas Server

## Lệnh tạo project và dependency

Có thể tạo bằng Spring Initializr:

```bash
curl https://start.spring.io/starter.zip \
  -d type=maven-project -d language=java -d bootVersion=3.3.5 \
  -d groupId=com.cinemabooking -d artifactId=server -d name=server \
  -d packageName=com.cinemabooking -d javaVersion=21 \
  -d dependencies=web,data-jpa,security,validation,mysql,flyway,lombok \
  -o server.zip
```

Project hiện tại đã bổ sung MapStruct, JWT JJWT, Spring Data Redis và Springdoc OpenAPI trong `pom.xml`.

## Chạy local

```bash
cd server
docker compose up -d mysql redis
mvn spring-boot:run
```

Chạy các lệnh trên từ thư mục gốc project. Backend lắng nghe tại
`http://localhost:8080`, frontend chạy bằng Vite tại `http://localhost:5173`.

Redis mặc định chạy tại `localhost:6379`. Có thể cấu hình bằng
`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.

Ghế của booking `PENDING` được giữ bằng key `seat-lock:{showtimeId}:{seatId}`
trong 1 phút. Việc khóa nhiều ghế là nguyên tử: nếu một ghế đã bị giữ thì
không ghế nào trong yêu cầu được khóa. Redis tự giải phóng khóa khi hết TTL;
transaction MySQL theo suất chiếu vẫn là lớp bảo vệ nhất quán cuối cùng.
Job đối soát chạy mặc định mỗi 30 giây để chuyển các booking `PENDING` đã quá
`expiresAt` thành `EXPIRED` trong MySQL bằng một câu lệnh cập nhật hàng loạt.

Thay đổi trạng thái ghế được publish qua Redis channel
`cinemabooking:seat-events` rồi chuyển tới frontend bằng STOMP WebSocket tại
`/topic/showtimes/{showtimeId}/seats`. Redis phải bật keyspace notification
`Ex` để phát `BOOKING_EXPIRED`; Docker Compose đã cấu hình tùy chọn này.

OTP quên mật khẩu được lưu dưới dạng hash tại
`password-reset:otp:{email}` và tự hết hạn sau 5 phút. Số lần nhập sai được
lưu tại `password-reset:attempts:{email}` với cùng TTL và được tăng nguyên tử,
do đó tất cả instance server dùng chung một giới hạn. Mặc định OTP bị vô hiệu
sau 5 lần nhập sai. Key `password-reset:resend:{email}` giới hạn gửi lại trong
60 giây.

## Logout và refresh token rotation

Gọi logout với access token trong header và refresh token trong body:

```http
POST /api/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{"refreshToken":"<refresh-token>"}
```

Server lưu `revoked-access-token:{jti}` và `revoked-refresh-token:{jti}` với
TTL đúng bằng thời gian sống còn lại của token. JWT filter từ chối access token
đã thu hồi. Mỗi refresh token chỉ dùng được một lần; việc dùng lại token cũ sẽ
trả về `401 UNAUTHORIZED`.
Mỗi tài khoản còn có `auth:session-version:{email}`. Đổi mật khẩu hoặc đặt lại
mật khẩu sẽ tăng version nguyên tử, khiến toàn bộ access/refresh token cũ mất
hiệu lực trên mọi instance server.

Swagger UI: http://localhost:8080/swagger-ui.html

## Cấu hình payOS

Lấy ba khóa trong mục **Kênh thanh toán** trên my.payos.vn rồi đặt biến môi trường:

```text
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key
```

Webhook dùng endpoint `POST /api/payments/payos/webhook`.
URL quay lại frontend sau thanh toán là `http://localhost:5173`.

Admin seed:

- Email: `admin@cinemabooking.com`
- Password: `Admin@123`

# Cấu hình Cloudinary

Đặt các biến môi trường trước khi chạy server:

```text
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Poster và backdrop của phim được upload vào các thư mục `cinema/movies/posters` và
`cinema/movies/backdrops` trên Cloudinary. Giới hạn mặc định là 10 MB cho mỗi ảnh.
