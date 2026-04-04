# Tài liệu Cơ sở dữ liệu Ptitube

Hệ quản trị cơ sở dữ liệu: **PostgreSQL 15**

Dưới đây là chi tiết các bảng và thuộc tính trong hệ thống Ptitube.

---

## 1. Bảng `users` (Người dùng)
Lưu trữ thông tin tài khoản và hồ sơ người dùng.

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | UUID | Khóa chính (Mặc định tự sinh ngẫu nhiên) |
| `username` | VARCHAR(50) | Tên đăng nhập (Duy nhất, không trống) |
| `email` | VARCHAR(255) | Email (Duy nhất, không trống) |
| `password_hash` | VARCHAR(255) | Mật khẩu đã mã hóa |
| `avatar_url` | VARCHAR(255) | Đường dẫn ảnh đại diện |
| `bio` | TEXT | Tiểu sử ngắn |
| `role` | VARCHAR(20) | Quyền: `user`, `moderator`, `admin` |
| `is_verified` | BOOLEAN | Trạng thái xác thực tài khoản |
| `created_at` | TIMESTAMP | Thời điểm tạo tài khoản |
| `updated_at` | TIMESTAMP | Thời điểm cập nhật thông tin |

---

## 2. Bảng `videos` (Video)
Lưu trữ thông tin về các video được tải lên.

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | UUID | Khóa chính |
| `user_id` | UUID | FK -> `users(id)` (Chủ sở hữu video) |
| `video_url` | VARCHAR(255) | Đường dẫn file video |
| `thumbnail_url` | VARCHAR(255) | Đường dẫn ảnh đại diện video |
| `title` | VARCHAR(100) | Tiêu đề video |
| `description` | TEXT | Mô tả chi tiết |
| `duration_seconds`| INTEGER | Độ dài video (giây) |
| `status` | VARCHAR(20) | Trạng thái: `pending`, `active`, `failed`, `banned` |
| `search_vector` | TSVECTOR | Hỗ trợ tìm kiếm toàn văn (Full-text search) |

---

## 3. Bảng `video_stats` (Thống kê Video)
Lưu trữ các con số thống kê của video (Quan hệ 1-1 với `videos`).

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `video_id` | UUID | Khóa chính, FK -> `videos(id)` |
| `view_count` | BIGINT | Tổng lượt xem |
| `like_count` | BIGINT | Tổng lượt thích |
| `comment_count` | BIGINT | Tổng số bình luận |
| `share_count` | BIGINT | Tổng số lượt chia sẻ |

---

## 4. Bảng `follows` (Theo dõi)
Lưu trữ quan hệ giữa người dùng theo dõi lẫn nhau.

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `follower_id` | UUID | FK -> `users(id)` (Người theo dõi) |
| `following_id` | UUID | FK -> `users(id)` (Người được theo dõi) |
| `created_at` | TIMESTAMP | Ngày bắt đầu theo dõi |

---

## 5. Bảng `likes` (Lượt thích)
Lưu trữ thông tin người dùng thích video nào.

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `user_id` | UUID | FK -> `users(id)` |
| `video_id` | UUID | FK -> `videos(id)` |
| `created_at` | TIMESTAMP | Thời điểm thích |

---

## 6. Bảng `comments` (Bình luận)
Lưu trữ nội dung bình luận của người dùng trên video.

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | UUID | Khóa chính |
| `video_id` | UUID | FK -> `videos(id)` |
| `user_id` | UUID | FK -> `users(id)` |
| `parent_id` | UUID | FK -> `comments(id)` (Dùng cho trả lời bình luận) |
| `content` | TEXT | Nội dung bình luận |

---

## 7. Bảng `video_views` (Lượt xem chi tiết)
Dùng cho phân tích hành vi người xem.

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | UUID | Khóa chính |
| `video_id` | UUID | FK -> `videos(id)` |
| `user_id` | UUID | FK -> `users(id)` (Có thể null nếu khách xem) |
| `watch_duration` | INTEGER | Thời gian đã xem (giây) |
| `is_completed` | BOOLEAN | Đã xem hết video chưa |
| `device_info` | JSONB | Thông tin thiết bị (Browser, OS,...) |

---

## 8. Bảng `reports` (Báo cáo vi phạm)
Lưu trữ thông tin khi người dùng báo cáo video.

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | UUID | Khóa chính |
| `reporter_id` | UUID | FK -> `users(id)` |
| `video_id` | UUID | FK -> `videos(id)` |
| `reason` | TEXT | Lý do báo cáo |
| `status` | VARCHAR(50) | Trạng thái xử lý báo cáo |

---

## Cơ chế tự động (Triggers)
Hệ thống sử dụng các Trigger để tự động hóa:
1.  **Cập nhật Tìm kiếm:** Tự động tạo `search_vector` từ `title` và `description` khi thêm/sửa video.
2.  **Đếm Like:** Tự động tăng/giảm `like_count` trong bảng `video_stats` khi có bản ghi mới trong bảng `likes`.
3.  **Khởi tạo Thống kê:** Khi một video mới được tạo, một bản ghi tương ứng trong `video_stats` sẽ tự động được tạo với các giá trị bằng 0.
