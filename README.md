# Nhà Đất Mini – Website Bất động sản

**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
**Đề tài:** Đề 25

## Mục lục

- [Website làm được gì?](#website-làm-được-gì)
- [Cách chạy website](#cách-chạy-website)
- [Địa chỉ sau khi chạy](#địa-chỉ-sau-khi-chạy)
- [Dữ liệu bất động sản](#dữ-liệu-bất-động-sản)
- [Phần đã có và phần chưa có](#phần-đã-có-và-phần-chưa-có)
- [Nếu gặp lỗi](#nếu-gặp-lỗi)
- [Tắt website](#tắt-website)
- [Thông tin sinh viên](#thông-tin-sinh-viên)

## Website làm được gì?

Website hiển thị các tin nhà, căn hộ và đất nền. Người xem có thể tìm theo tên, lọc theo loại và mở phần chi tiết của từng tin.

Website dùng Node.js và Express; dữ liệu được lưu trong MySQL. Docker Compose giúp chạy website, database và phpMyAdmin cùng nhau.

## Cách chạy website

### Cần chuẩn bị

- Cài và mở Docker Desktop.
- Mở PowerShell tại thư mục dự án (thư mục có file `docker-compose.yml`).

### Khởi động lần đầu

1. Tạo file cấu hình `.env` từ file mẫu:

   ```powershell
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   notepad .env
   ```

2. Trong Notepad, thay hai mật khẩu mẫu `MYSQL_PASSWORD` và `MYSQL_ROOT_PASSWORD` bằng mật khẩu của bạn. Lưu file rồi đóng Notepad. Không gửi file `.env` cho người khác.

3. Trong PowerShell, chạy:

   ```powershell
   docker compose up -d --build
   ```

4. Kiểm tra các dịch vụ đã khởi động:

   ```powershell
   docker compose ps
   ```

Lần đầu có thể mất vài phút để tải các image cần thiết. Khi chạy xong, mở website theo địa chỉ ở mục tiếp theo.

> Nếu đã có file `.env`, không cần tạo lại; chỉ kiểm tra mật khẩu mẫu đã được thay.

## Địa chỉ sau khi chạy

| Bạn muốn mở | Địa chỉ mặc định |
|---|---|
| Website | [http://localhost:3000](http://localhost:3000) |
| Quản lý database bằng phpMyAdmin | [http://localhost:8081](http://localhost:8081) (cổng trong `.env` hiện tại) |
| Kiểm tra kết nối website với database | [http://localhost:3000/api/health](http://localhost:3000/api/health) |

Các địa chỉ trên chỉ dùng được khi dịch vụ đang chạy. Nếu cổng đã được đổi trong `.env`, hãy thay số cổng trong địa chỉ tương ứng.

## Dữ liệu bất động sản

Database có tên `real_estate`; bảng chứa tin bất động sản là `properties`. File `database/init.sql` tạo bảng và thêm 5 tin mẫu. Dữ liệu được lưu trong Docker volume để giữ lại khi tắt website thông thường.

Để xem dữ liệu, mở phpMyAdmin ở địa chỉ trên. Đăng nhập bằng tên tài khoản trong `MYSQL_USER` và mật khẩu trong `MYSQL_PASSWORD` của `.env`; máy chủ database là `db` nếu được hỏi. Không ghi mật khẩu vào README hoặc gửi lên GitHub.

Compose chuyển `MYSQL_PASSWORD` trong `.env` cho cả dịch vụ MySQL và ứng dụng web. Nếu đổi mật khẩu sau khi MySQL đã tạo volume dữ liệu, MySQL không tự đổi mật khẩu tài khoản hiện có chỉ vì `.env` thay đổi; cần cập nhật mật khẩu tài khoản trong MySQL để khớp.

## Phần đã có và phần chưa có

**Đã có:** website, API, MySQL, phpMyAdmin, Docker Compose và kiểm tra kết nối database. Log của ứng dụng xem bằng:

```powershell
docker compose logs
```

**Chưa có:** Nginx, HTTPS, Prometheus/Grafana để theo dõi số liệu, Loki/Promtail để gom log. Vì vậy hiện chưa có dashboard, truy vấn LogQL hay địa chỉ truy cập cho các công cụ này. Dockerfile cũng chưa thiết lập chạy ứng dụng bằng user không phải root.

## Nếu gặp lỗi

- **Docker báo thiếu mật khẩu:** kiểm tra `.env` có `MYSQL_PASSWORD` và `MYSQL_ROOT_PASSWORD`, rồi chạy lại lệnh khởi động.
- **Website không mở được:** kiểm tra Docker Desktop đang chạy và xem `docker compose ps`.
- **Trang hiện lên nhưng không có dữ liệu:** kiểm tra `http://localhost:3000/api/health` và xem log bằng `docker compose logs`.
- **Cổng 3000 hoặc 8081 đang bận:** đổi `APP_PORT` hoặc `PHPMYADMIN_PORT` trong `.env`, rồi chạy lại `docker compose up -d --build`.

## Tắt website

Để tắt các dịch vụ nhưng giữ dữ liệu:

```powershell
docker compose down
```

Không dùng lệnh dưới đây trừ khi bạn muốn xóa cả dữ liệu database:

```powershell
docker compose down -v
```

## Mã nguồn và ảnh báo cáo

Không commit file `.env` vì file này chứa mật khẩu. Nếu dự án đã được kết nối với GitHub, có thể kiểm tra và gửi thay đổi README bằng:

```powershell
git status
git add README.md
git commit -m "docs: update README"
git push
```

Chưa có ảnh minh chứng trong dự án. Sau khi chạy và kiểm tra website, có thể lưu ảnh chụp thật vào `docs/screenshots/`. Nhớ che mật khẩu trước khi chụp hoặc nộp ảnh.

## Thông tin sinh viên

- **Họ và tên:** ........................................
- **Mã sinh viên:** .....................................
- **Lớp:** ................................................
- **Tên giảng viên:** ...................................
- **Tên môn học:** Triển khai và Quản trị Hệ thống Phần mềm
