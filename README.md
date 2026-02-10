# Video Sharing Social Network Project

Dự án xây dựng ứng dụng mạng xã hội chia sẻ video ngắn (tương tự TikTok/Reels) bao gồm Backend (Spring Boot), Mobile App (React Native/Expo) và hạ tầng Docker (PostgreSQL, MinIO).

---

## 🏗 Kiến trúc hệ thống

Dự án được tổ chức thành các thành phần chính:

| Thành phần | Công nghệ | Mô tả |
|------------|-----------|-------|
| **Backend** | Java Spring Boot 3 | API Server, xử lý logic, Security, Upload |
| **Mobile App** | React Native (Expo) | Ứng dụng di động đa nền tảng (iOS/Android) |
| **Database** | PostgreSQL 15 | Lưu trữ dữ liệu người dùng, video metadata |
| **Storage** | MinIO | Object Storage tương thích S3 để lưu video file |
| **Infrastructure** | Docker Compose | Quản lý deployment toàn bộ hệ thống |

---

## 🚀 Hướng dẫn Cài đặt & Khởi động

### 1. Yêu cầu tiên quyết (Prerequisites)
- **Docker Desktop** (đã cài đặt và đang chạy)
- **Node.js** (v18+) & Manager gói (npm/yarn)
- **Java JDK 17+** (Tùy chọn, nếu muốn phát triển backend)
- **Android Studio / Xcode** (Để chạy giả lập) hoặc ứng dụng **Expo Go** trên điện thoại.

### 2. Khởi động Backend & Dịch vụ

Sử dụng Docker Compose để khởi chạy toàn bộ hạ tầng Server:

```bash
# Tại thư mục gốc của dự án
docker-compose up -d --build
```

Lệnh này sẽ khởi động 3 container:
1. `video-db`: PostgreSQL Database (Port 5432)
2. `video-minio`: MinIO Object Storage (Port 9000/9001)
3. `video-backend`: Spring Boot Application (Port 8080)

**Kiểm tra trạng thái:**
- API Docs/Healthcheck: `http://localhost:8080/api/videos`
- MinIO Console: `http://localhost:9001` (User: `minio_admin` / Pass: `minio_password`)

### 3. Khởi động Mobile App

1. Di chuyển vào thư mục mobile app:
   ```bash
   cd mobile-app
   ```

2. Cài đặt thư viện:
   ```bash
   npm install
   ```

3. Cấu hình địa chỉ IP:
   - Mở file `mobile-app/constants/Config.ts`.
   - Cập nhật biến `HOST_IP` thành địa chỉ IPv4 LAN của máy bạn (VD: `192.168.1.x`).
   - *Lưu ý: Không dùng `localhost` nếu chạy trên điện thoại thật hoặc giả lập Android.*

4. Chạy ứng dụng:
   ```bash
   npx expo start
   ```
   - Quét mã QR bằng ứng dụng **Expo Go** (Android/iOS).
   - Hoặc nhấn `a` để mở Android Emulator, `i` để mở iOS Simulator.

---

## 📚 API Endpoint Chính

### Authentication
- **Register**: `POST /api/auth/register`
  - Body: `{ "username": "...", "email": "...", "password": "..." }`
- **Login**: `POST /api/auth/login`
  - Body: `{ "username": "...", "password": "..." }`

### Videos
- **Upload**: `POST /api/videos/upload` (Multipart/form-data)
  - Params: `file` (video file), `title` (text), `description` (text)
  - Auth: Yêu cầu Bearer Token (hoặc mặc định testuser trong môi trường dev).
- **Get Feed**: `GET /api/videos`
  - Trả về danh sách video.
- **Stream**: `GET /api/videos/stream/{id}`
  - Stream nội dung video (byte range support).

---

## 🛠 Troubleshooting (Gỡ lỗi thường gặp)

**1. Lỗi kết nối từ Mobile App (Network Error)**
- Đảm bảo điện thoại và laptop cùng kết nối một mạng Wifi.
- Tắt tường lửa (Firewall) trên máy tính hoặc mở port 8080.
- Kiểm tra lại `HOST_IP` trong `Config.ts`.

**2. Lỗi Database & Enum (Type Mismatch)**
- **Khắc phục**: Database đã được chuyển từ PostgreSQL Native ENUM sang `VARCHAR` với `CHECK` constraints để tương thích tốt nhất với Hibernate.
- **Lưu ý**: Nếu gặp lỗi `column "role" is of type user_role but expression is of type character varying`, hãy chạy:
  ```bash
  docker-compose down -v
  docker-compose up -d --build
  ```

**3. Reset Dữ liệu & Storage**
- Để xóa sạch dữ liệu DB và video trong MinIO:
  ```bash
  docker-compose down -v
  docker-compose up -d --build
  ```

---

## 🛠 Tính năng kỹ thuật nổi bật
- **UUID**: Sử dụng UUID v4 cho toàn bộ các Primary Key để bảo mật và dễ dàng mở rộng.
- **Database Triggers**: 
  - Tự động hóa cập nhật `search_vector` cho tìm kiếm toàn văn (Full-Text Search).
  - Tự động khởi tạo và cập nhật thống kê (`like_count`, `view_count`) thông qua Triggers để giảm tải cho Backend.
- **Object Storage**: Tích hợp MinIO (S3 compatible) để lưu trữ video dung lượng lớn một cách chuyên nghiệp.

---

## 📂 Cấu trúc Thư mục

```
project/
├── backend/                # Source code Spring Boot
│   ├── src/main/java...    # Controllers, Services, Models
│   ├── Dockerfile
│   └── pom.xml
├── mobile-app/             # Source code React Native
│   ├── app/                # Screens & Navigation
│   ├── components/         # UI Components
│   └── package.json
├── database/               # Init SQL scripts
├── docker-compose.yml      # Config hạ tầng
└── README.md               # Tài liệu này
```
