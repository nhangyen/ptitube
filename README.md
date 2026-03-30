# Video Sharing Social Network — PTITube 🎬

Dự án xây dựng ứng dụng mạng xã hội chia sẻ video ngắn (tương tự TikTok/Reels) bao gồm Backend (Spring Boot), Mobile App (React Native/Expo) và hạ tầng Docker (PostgreSQL, MinIO).

---

## 🏗 Kiến trúc hệ thống

| Thành phần | Công nghệ | Port | Mô tả |
|------------|-----------|------|-------|
| **Backend** | Java Spring Boot 3 | `8080` | API Server, Security, Upload, JWT |
| **Mobile App** | React Native (Expo Go) | `8082` | Ứng dụng Android/iOS |
| **Database** | PostgreSQL 15 | `5432` | Dữ liệu người dùng, video metadata |
| **Storage** | MinIO | `9000/9001` | Object Storage (S3-compatible) lưu video |
| **Tunnel** | Cloudflare Tunnel | — | Expose backend ra ngoài internet (tùy chọn) |
| **Infrastructure** | Docker Compose | — | Quản lý toàn bộ hệ thống |

---

## 🚀 Hướng dẫn Khởi chạy Dự án

### ✅ Bước 1 — Khởi động Backend & Hạ tầng (Docker)

Mở terminal tại thư mục gốc dự án:

```bash
# Khởi động toàn bộ infrastructure (PostgreSQL + MinIO + Backend)
docker-compose up -d --build
```

**Kiểm tra container đang chạy:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Kết quả mong muốn:
```
NAMES           STATUS
video-backend   Up X minutes
video-db        Up X minutes
video-minio     Up X minutes
video-tunnel    Up X minutes  (nếu có)
```

**Verify backend hoạt động:**
```bash
# Test endpoint GET videos
Invoke-RestMethod -Uri "http://localhost:8080/api/videos"

# Test đăng ký tài khoản
Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" `
    -Method POST -ContentType "application/json" `
    -Body '{"username":"testuser","email":"test@test.com","password":"password123"}'
```

**Truy cập MinIO Console:**
- URL: `http://localhost:9001`
- Username: `minio_admin`
- Password: `minio_password`

---

### ✅ Bước 2 — Upload Video Mẫu (Tùy chọn)

Thư mục `resource/` đã có sẵn 6 video mẫu. Chạy script Python để upload lên hệ thống:

```bash
python upload_samples.py
```

Script sẽ tự động:
1. Đăng nhập / đăng ký tài khoản `testuser`
2. Upload tất cả file `.mp4` trong `resource/` lên backend & MinIO
3. Verify và in danh sách video đã upload

---

### ✅ Bước 3 — Cấu hình IP cho Mobile App

Mở file `mobile-app/constants/Config.ts` và cập nhật `HOST_IP`:

| Môi trường | Giá trị HOST_IP |
|-----------|-----------------|
| **Android Emulator** (Pixel 7...) | `10.0.2.2` |
| **Thiết bị thật** (cùng Wifi) | IP LAN máy tính, vd: `192.168.1.150` |
| **Web (localhost)** | `localhost` |

> 💡 Kiểm tra IP LAN của máy bằng lệnh: `ipconfig` → tìm dòng "IPv4 Address" dưới Wi-Fi

```typescript
// mobile-app/constants/Config.ts
const HOST_IP = "10.0.2.2"; // Dùng cho Android Emulator
export const API_BASE_URL = `http://${HOST_IP}:8080/api`;
export const API_TIMEOUT = 15000;
```

---

### ✅ Bước 4 — Khởi động Mobile App (Expo)

```bash
cd mobile-app
npm install       # Lần đầu chạy
npx expo start --port 8082
```

Trong menu Expo terminal, thực hiện:

1. **Nhấn `s`** → Chuyển sang **Expo Go** mode (nếu đang ở development build)
2. **Nhấn `a`** → Tự động mở trên Android Emulator
3. Hoặc **Quét QR code** bằng app **Expo Go** trên điện thoại thật

> ⚠️ Lưu ý: Project dùng `expo-dev-client`. Khi chạy `npx expo start --android`, nếu bị lỗi `No development build installed`, hãy nhấn `s` để chuyển sang **Expo Go** trước khi nhấn `a`.

---

## 📚 API Endpoints

### 🔐 Authentication
| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/auth/register` | `{username, email, password}` | Đăng ký tài khoản |
| POST | `/api/auth/login` | `{username, password}` | Đăng nhập → JWT Token |

### 🎬 Videos
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/videos` | Không | Lấy danh sách video |
| POST | `/api/videos/upload` | Bearer Token | Upload video (multipart/form-data) |
| GET | `/api/videos/stream/{id}` | Không | Stream video |

**Upload Video Example:**
```bash
# Python (khuyến nghị)
python upload_samples.py

# PowerShell
$token = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" \
    -Method POST -ContentType "application/json" \
    -Body '{"username":"testuser","password":"password123"}').token
```

---

## 🐛 Log Lỗi & Cách Khắc phục

### Lỗi 1 — `403 Forbidden` khi gọi API từ Mobile App
**Triệu chứng:** `AxiosError: Request failed with status code 403`

**Nguyên nhân:** Spring Security chặn request do CORS hoặc JWT không hợp lệ.

**Khắc phục:**
- Đảm bảo `SecurityConfig.java` đã `permitAll()` hoặc đã bật CORS đúng cách.
- Kiểm tra token JWT còn hạn (exp: 7 ngày).
- Đăng nhập lại để lấy token mới.
- Xem log backend: `docker logs video-backend --tail 50`

---

### Lỗi 2 — `Timeout exceeded` khi kết nối từ Emulator
**Triệu chứng:** `AxiosError: timeout exceeded` khi login hoặc fetch video

**Nguyên nhân:** Mobile App đang dùng IP sai (`localhost` hoặc IP LAN) thay vì `10.0.2.2` cho emulator.

**Khắc phục:**
```typescript
// mobile-app/constants/Config.ts
const HOST_IP = "10.0.2.2"; // ← BẮT BUỘC dùng cái này cho Android Emulator
```
> Android Emulator ánh xạ `10.0.2.2` → `127.0.0.1` của máy host. IP `localhost` hay `192.168.x.x` sẽ không hoạt động.

---

### Lỗi 3 — `No development build installed` khi chạy Expo
**Triệu chứng:**
```
CommandError: No development build (com.example.videoapp) for this project is installed.
```

**Nguyên nhân:** Project có `expo-dev-client` nhưng emulator chưa cài APK dev build.

**Khắc phục:** Chuyển sang Expo Go mode:
```bash
npx expo start --port 8082
# Trong menu: Nhấn 's' để switch sang Expo Go
# Sau đó nhấn 'a' để mở Android Emulator
```

---

### Lỗi 4 — `Port 8081 is being used by another process`
**Triệu chứng:** Expo không khởi động được vì port 8081 bị chiếm.

**Khắc phục:** Chạy trên port khác:
```bash
npx expo start --port 8082
```

---

### Lỗi 5 — Upload video thất bại (`Required part 'file' is not present`)
**Triệu chứng:** Upload bằng `curl` hoặc PowerShell bị lỗi 400 Bad Request.

**Nguyên nhân:** `Invoke-RestMethod -Form` và `curl` alias trong PowerShell không hỗ trợ đúng multipart với tên file có ký tự đặc biệt.

**Khắc phục:** Dùng Python script thay thế:
```bash
python upload_samples.py
```

---

### Lỗi 6 — Database Enum Type Mismatch
**Triệu chứng:** `column "role" is of type user_role but expression is of type character varying`

**Nguyên nhân:** PostgreSQL native ENUM conflict với Hibernate.

**Khắc phục:** Reset hoàn toàn database:
```bash
docker-compose down -v
docker-compose up -d --build
```
> ⚠️ Lệnh này sẽ xóa toàn bộ dữ liệu. Chạy lại `upload_samples.py` để upload lại video.

---

## 📂 Cấu trúc Thư mục

```
video/
├── backend/                    # Spring Boot API Server
│   ├── src/main/java/com/example/video/
│   │   ├── config/             # SecurityConfig, MinioConfig, CorsConfig
│   │   ├── controller/         # AuthController, VideoController
│   │   ├── dto/                # LoginRequest, RegisterRequest, AuthResponse
│   │   ├── model/              # User, Video, UserRole, VideoStatus
│   │   ├── repository/         # UserRepository, VideoRepository
│   │   ├── security/           # JwtTokenProvider, JwtAuthenticationFilter
│   │   └── service/            # AuthService, VideoService, MinioService
│   ├── src/main/resources/
│   │   └── application.properties
│   ├── Dockerfile
│   └── pom.xml
├── mobile-app/                 # React Native (Expo) App
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx     # Tab navigation
│   │   │   ├── index.tsx       # Feed Screen
│   │   │   └── explore.tsx     # Upload Screen
│   │   └── _layout.tsx
│   ├── constants/
│   │   └── Config.ts           # API URL configuration ← QUAN TRỌNG
│   └── package.json
├── database/
│   └── init.sql                # PostgreSQL schema (tables, indexes, triggers)
├── resource/                   # Video mẫu (.mp4)
├── docker-compose.yml          # Docker services definition
├── upload_samples.py           # Script upload video mẫu
└── README.md                   # File này
```

---

## 🛠 Lệnh Docker hữu ích

```bash
# Xem log backend real-time
docker logs video-backend -f

# Xem log 50 dòng cuối
docker logs video-backend --tail 50

# Restart backend (sau khi thay đổi code)
docker-compose restart backend

# Rebuild và restart toàn bộ
docker-compose up -d --build

# Dừng toàn bộ (GIỮ data)
docker-compose down

# Dừng toàn bộ và XÓA data (reset sạch)
docker-compose down -v

# Kiểm tra container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## 👥 Tài khoản mặc định

| Loại | Username | Password | Email |
|------|----------|----------|-------|
| Test user | `testuser` | `password123` | `testuser@test.com` |
| MinIO Console | `minio_admin` | `minio_password` | — |

---

*Cập nhật lần cuối: 2026-03-05*
