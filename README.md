# Nhà Đất Mini – Website Bất động sản

**Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
**Đề tài:** Đề 25

## Mục lục

- [Website làm được gì?](#website-làm-được-gì)
- [Cách chạy website](#cách-chạy-website)
- [Địa chỉ sau khi chạy](#địa-chỉ-sau-khi-chạy)
- [Nginx và HTTPS](#nginx-và-https)
- [Prometheus và Grafana](#prometheus-và-grafana)
- [Loki và Promtail](#loki-và-promtail)
- [Kiến trúc và phạm vi giám sát](#kiến-trúc-và-phạm-vi-giám-sát)
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

2. Trong Notepad, thay hai mật khẩu mẫu `MYSQL_PASSWORD` và `MYSQL_ROOT_PASSWORD` bằng mật khẩu của bạn. Thêm `GRAFANA_ADMIN_PASSWORD` với mật khẩu riêng, dài và ngẫu nhiên (không dùng giá trị mẫu). Lưu file rồi đóng Notepad. Không gửi file `.env` cho người khác.

3. Tạo chứng chỉ tự ký dùng riêng cho máy phát triển. Lệnh dùng container tạm để tạo file trong `nginx\certs`; không chia sẻ hoặc commit các file `.key` và `.crt` này:

   ```powershell
   New-Item -ItemType Directory -Force nginx\certs | Out-Null
   docker run --rm -v "$($PWD.Path)\nginx\certs:/certs" alpine:3.20 sh -c 'apk add --no-cache openssl >/dev/null && openssl req -x509 -nodes -days 365 -newkey rsa:3072 -keyout /certs/localhost.key -out /certs/localhost.crt -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"'
   ```

   Nếu đã tạo chứng chỉ, không cần tạo lại. Trình duyệt sẽ cảnh báo chứng chỉ không được CA công khai tin cậy; đây là hành vi bình thường với chứng chỉ tự ký.

4. Trong PowerShell, chạy:

   ```powershell
   docker compose up -d --build
   ```

5. Kiểm tra các dịch vụ đã khởi động:

   ```powershell
   docker compose ps
   ```

Lần đầu có thể mất vài phút để tải các image cần thiết. Nginx dùng cổng 8088 (HTTP) và 8443 (HTTPS); website trực tiếp vẫn ở cổng 3000. Grafana dùng cổng 3001, Prometheus dùng cổng 9090 và hai cổng này chỉ lắng nghe trên máy cục bộ.

> Nếu đã có file `.env`, không cần tạo lại; chỉ kiểm tra mật khẩu mẫu đã được thay.

## Địa chỉ sau khi chạy

| Bạn muốn mở | Địa chỉ mặc định |
|---|---|
| Website qua HTTPS (Nginx) | [https://localhost:8443](https://localhost:8443) |
| Website qua HTTP (Nginx, chuyển hướng sang HTTPS) | [http://localhost:8088](http://localhost:8088) |
| Website truy cập trực tiếp, không qua Nginx | [http://localhost:3000](http://localhost:3000) |
| Quản lý database bằng phpMyAdmin | [http://localhost:8081](http://localhost:8081) (cổng trong `.env` hiện tại) |
| Prometheus | [http://localhost:9090](http://localhost:9090) |
| Grafana | [http://localhost:3001](http://localhost:3001) |
| Kiểm tra kết nối website với database | [http://localhost:3000/api/health](http://localhost:3000/api/health) |

Các địa chỉ trên chỉ dùng được khi dịch vụ đang chạy. Nếu cổng đã được đổi trong `.env`, hãy thay số cổng trong địa chỉ tương ứng.

## Nginx và HTTPS

Nginx chuyển tiếp yêu cầu đến dịch vụ `web` trong Docker. HTTP chuyển hướng bằng mã 308 sang HTTPS trên cổng 8443. HTTPS dùng chứng chỉ tự ký cục bộ và gửi các header `X-Content-Type-Options`, `X-Frame-Options` và `Referrer-Policy`; chưa bật HSTS. Không đưa thư mục chứng chỉ cá nhân lên GitHub (`nginx/certs` đã được thêm vào `.gitignore`).

Kiểm tra cấu hình và truy cập bằng PowerShell:

```powershell
docker compose exec nginx nginx -t
curl.exe -I http://localhost:8088
curl.exe -k -I https://localhost:8443
curl.exe -k https://localhost:8443/api/health
curl.exe http://localhost:3000/api/health
```

Lệnh HTTP đầu tiên cần trả về mã chuyển hướng 308 cùng header `Location` trỏ tới HTTPS; phản hồi HTTPS cần có các security headers nêu trên. Tùy chọn `-k` chỉ bỏ qua xác minh chứng chỉ tự ký khi kiểm tra bằng `curl`, không nên dùng cho website công khai. Nếu đổi `NGINX_HTTPS_PORT` trong `.env`, hãy đồng thời cập nhật cổng `8443` trong dòng `return` của `nginx/default.conf`.

## Prometheus và Grafana

Prometheus thu thập metrics thật từ endpoint `/metrics` của Express, exporter trạng thái Nginx và phép kiểm tra HTTP của `/api/health` (endpoint này xác nhận ứng dụng kết nối được MySQL). Dashboard được provision tự động trong Grafana; data source Prometheus và Loki cũng được provision từ các file trong `grafana/provisioning/`.

- Prometheus: `http://localhost:9090` → **Status → Targets**. Các job `prometheus`, `web`, `nginx` và `website-health` cần có trạng thái **UP**.
- Grafana: `http://localhost:3001`; tài khoản quản trị mặc định có **tên đăng nhập `admin`**. Mật khẩu là giá trị bạn tự đặt cho `GRAFANA_ADMIN_PASSWORD` trong file `.env` ở thư mục dự án (không phải mật khẩu mặc định chung và không được lưu trong README/Git). Nếu đã đổi `GRAFANA_ADMIN_USER` trong `.env`, hãy dùng tên đăng nhập đó. Mở **Dashboards → Hệ thống → Nhà Đất Mini - System Overview**.
- Một vài truy vấn PromQL: `http_server_requests_total`, `process_resident_memory_bytes`, `nginx_up`, `probe_success`.
- Dashboard có tốc độ request, p95 độ trễ Express, số liệu memory Node.js và trạng thái kiểm tra website/MySQL, Nginx.

Metrics Express dùng counter/histogram theo method, route mẫu và mã HTTP; không gắn giá trị query hay dữ liệu người dùng vào nhãn. `/metrics` là endpoint phục vụ giám sát, không phải API nghiệp vụ; có thể kiểm tra qua `http://localhost:3000/metrics`, còn Nginx trả 404 cho đường dẫn đó.

## Loki và Promtail

Promtail chỉ phát hiện container được đánh dấu `com.nhadatmini.logs=true`, qua Docker socket proxy giới hạn quyền đọc metadata container/network; điều này tránh thu log các dự án Docker khác trên cùng máy. Promtail đọc file `json-file` ở chế độ chỉ đọc từ Docker Desktop Linux VM và gửi log đến Loki. Đã xác minh trên môi trường Windows/Docker Desktop rằng container Linux có thể đọc `/var/lib/docker/containers`; cấu hình không giả định đường dẫn này thuộc Windows. Promtail bỏ qua log cũ hơn 7 ngày để khớp với retention của Loki. Loki không publish cổng ra host; Grafana truy cập Loki trong Docker network. Log được giữ tối đa 7 ngày theo cấu hình hiện tại.

Trong Grafana, mở **Explore**, chọn data source **Loki**, rồi chạy các truy vấn LogQL sau:

```logql
{job="docker"}
{job="docker", service_name="web"} |~ "(?i)error|failed|exception"
{job="docker", service_name="nginx"}
```

Promtail gắn nhãn `job`, `service_name`, `container` và `stream`. Để tạo một dòng log Nginx có trạng thái 404 phục vụ kiểm tra truy vấn chứa `error`, có thể chạy:

```powershell
curl.exe -k -o NUL -w "%{http_code}`n" https://localhost:8443/__logql-demo-error
```

Sau đó chờ một lần scrape Promtail, chạy truy vấn trên Explore và điều chỉnh khoảng thời gian về **Last 15 minutes**. Không gửi mật khẩu trong URL hoặc ghi thông tin nhạy cảm vào log. Access log Nginx được cấu hình không ghi query string.

## Kiến trúc và phạm vi giám sát

```text
Trình duyệt --HTTP/HTTPS--> Nginx --proxy--> Express --SQL--> MySQL
      |                                      |
      +--> phpMyAdmin -----------------------+

Prometheus --> Express /metrics
           --> Nginx exporter (stub_status nội bộ)
           --> Blackbox exporter --> Express /api/health --> MySQL
Grafana --> Prometheus và Loki
Docker log JSON --> Promtail (Docker socket proxy + mount chỉ đọc) --> Loki
```

| Dịch vụ | Cổng host | Ghi chú |
|---|---:|---|
| Website trực tiếp | 3000 | Chỉ bind `127.0.0.1`; giữ nguyên URL truy cập cục bộ |
| Nginx HTTP / HTTPS | 8088 / 8443 | Chỉ bind `127.0.0.1`; HTTP chuyển hướng HTTPS |
| phpMyAdmin | 8081 | Chỉ bind `127.0.0.1`; đăng nhập bằng tài khoản MySQL trong `.env` |
| Prometheus | 9090 | Chỉ bind `127.0.0.1` |
| Grafana | 3001 | Chỉ bind `127.0.0.1` |
| MySQL, Loki, Promtail, exporters, Docker socket proxy | Không publish | Chỉ giao tiếp trong Docker network |

Không bổ sung cAdvisor hoặc exporter cần quyền privileged để đọc tài nguyên toàn Docker host. Do đó hiện có metrics cho ứng dụng Node.js, Nginx và trạng thái web/MySQL, nhưng **chưa có metrics CPU/RAM từng container hoặc Windows host**. Health probe MySQL cho biết khả năng kết nối, không thay thế metrics nội bộ MySQL.

## Dữ liệu bất động sản

Database có tên `real_estate`; bảng chứa tin bất động sản là `properties`. File `database/init.sql` tạo bảng và thêm 5 tin mẫu. Dữ liệu được lưu trong Docker volume để giữ lại khi tắt website thông thường.

Để xem dữ liệu, mở phpMyAdmin ở địa chỉ trên. Đăng nhập bằng tên tài khoản trong `MYSQL_USER` và mật khẩu trong `MYSQL_PASSWORD` của `.env`; máy chủ database là `db` nếu được hỏi. Không ghi mật khẩu vào README hoặc gửi lên GitHub.

Compose chuyển `MYSQL_PASSWORD` trong `.env` cho cả dịch vụ MySQL và ứng dụng web. Nếu đổi mật khẩu sau khi MySQL đã tạo volume dữ liệu, MySQL không tự đổi mật khẩu tài khoản hiện có chỉ vì `.env` thay đổi; cần cập nhật mật khẩu tài khoản trong MySQL để khớp.

## Phần đã có và phần chưa có

**Đã cấu hình:** website, API, MySQL, phpMyAdmin, Docker Compose, Nginx reverse proxy/HTTPS/security headers, Prometheus, Grafana provisioning/dashboard, Loki/Promtail và kiểm tra log Docker. Log dịch vụ có thể xem bằng:

```powershell
docker compose logs --tail 100
```

**Giới hạn:** chứng chỉ HTTPS là tự ký; Loki hiện dùng single-node filesystem và không bật xác thực vì chỉ kết nối nội bộ; Docker socket proxy vẫn có quyền đọc metadata container; không có metrics tài nguyên Windows host/từng container hay metrics chi tiết MySQL. Đây là cấu hình học tập cục bộ, không phải triển khai production.

## Nếu gặp lỗi

- **Docker báo thiếu mật khẩu:** kiểm tra `.env` có `MYSQL_PASSWORD` và `MYSQL_ROOT_PASSWORD`, rồi chạy lại lệnh khởi động.
- **Nginx không khởi động hoặc báo thiếu chứng chỉ:** kiểm tra `nginx\certs\localhost.crt` và `nginx\certs\localhost.key` đã được tạo; xem log bằng `docker compose logs nginx`.
- **Grafana không khởi động:** xác nhận `.env` có `GRAFANA_ADMIN_PASSWORD` không rỗng; xem `docker compose logs grafana` (không dán nội dung `.env` vào báo lỗi).
- **Target Prometheus DOWN:** vào **Status → Targets**, xem `Last error`, rồi kiểm tra `docker compose logs prometheus web nginx-exporter blackbox-exporter`.
- **Không thấy log trong Loki:** kiểm tra `docker compose ps promtail loki docker-socket-proxy`, `docker compose logs promtail loki docker-socket-proxy` và xác nhận mount `/var/lib/docker/containers` còn đọc được trong Docker Desktop.
- **Không có dòng khớp LogQL:** tăng time range lên **Last 15 minutes**, tạo request mới, chờ tối đa một chu kỳ scrape và thử `{job="docker"}` trước khi thêm bộ lọc.
- **Cổng 8088 hoặc 8443 đang bận:** đổi `NGINX_HTTP_PORT` hoặc `NGINX_HTTPS_PORT` trong `.env`, đồng thời cập nhật cổng HTTPS trong `nginx/default.conf` nếu đổi 8443; sau đó chạy `docker compose up -d nginx`.
- **Cổng 9090 hoặc 3001 đang bận:** kiểm tra tiến trình đang giữ cổng; chỉ đổi `GRAFANA_PORT` trong `.env` nếu cổng 3001 bận. Prometheus dùng cổng 9090 cố định ở cấu hình hiện tại.
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

## Kiểm thử và ảnh báo cáo

Chạy lần lượt trong PowerShell từ thư mục dự án. Lệnh kiểm tra Compose không in nội dung cấu hình đã nội suy từ `.env`; không chia sẻ output có thể chứa bí mật:

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail 100 web nginx db phpmyadmin prometheus grafana loki promtail nginx-exporter blackbox-exporter docker-socket-proxy
curl.exe -k https://localhost:8443/api/health
curl.exe -I http://localhost:8081
curl.exe -s http://localhost:9090/api/v1/targets
```

Trong Prometheus **Status → Targets**, xác nhận target `web`, `nginx`, `website-health` và `prometheus` ở trạng thái UP. Trong Grafana, xác nhận hai data source **Prometheus**/**Loki** hoạt động, mở dashboard và kiểm tra Explore với ba truy vấn LogQL phía trên. Tạo một vài lượt truy cập website để dashboard có dữ liệu request.

Ảnh minh chứng cần chụp từ hệ thống đang chạy (không tạo ảnh giả):

- `10-prometheus.png` — Prometheus Status → Targets với các target UP.
- `11-grafana-dashboard.png` — dashboard có metrics thực sau khi truy cập website.
- `12-loki-logs.png` — Explore Loki có log thực và nhãn dịch vụ.
- `13-security-check.png` — kiểm tra cổng Prometheus/Grafana chỉ bind localhost, headers HTTPS và danh sách file nhạy cảm bị ignore.

## Mã nguồn

Không commit file `.env` vì file này chứa mật khẩu; chứng chỉ và private key trong `nginx/certs` cũng không được đưa lên GitHub. Sau khi tự kiểm tra nội dung thay đổi, có thể tạo commit riêng cho hạng mục giám sát:

```powershell
git status --short
git add server.js docker-compose.yml .env.example .gitignore README.md nginx/default.conf nginx/certs/.gitkeep prometheus grafana loki
git diff --cached --name-only
git diff --cached --check
git commit -m "feat: add prometheus grafana loki monitoring"
git push
```

Trước khi commit, xác nhận danh sách staged không có `.env`, file `.key`, `.crt`, token hoặc dữ liệu riêng tư. Dùng cùng cách tạo một commit riêng cho mỗi hạng mục tiếp theo.

Nhớ che mật khẩu trước khi chụp hoặc nộp ảnh.

## Thông tin sinh viên

- **Họ và tên:** ........................................
- **Mã sinh viên:** .....................................
- **Lớp:** ................................................
- **Tên giảng viên:** ...................................
- **Tên môn học:** Triển khai và Quản trị Hệ thống Phần mềm
