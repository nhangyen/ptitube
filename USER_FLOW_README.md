# Luồng Hoạt Động Của Ứng Dụng (User Flow)

Tài liệu này mô tả chi tiết luồng hoạt động của ứng dụng, tập trung vào hai thao tác chính của người dùng: **Tym (Like) Video** và **Hiển thị video tiếp theo (Cuộn Feed)**. 

Bao gồm chi tiết về các file ở phía Mobile App (React Native/Expo) gọi đến các API, và các Controller xử lý tương ứng ở phía Backend (Spring Boot).

---

## 1. Thao tác Tym (Like) Video

Khi người dùng nhấn vào biểu tượng trái tim để thích (hoặc bỏ thích) một video:

### Mobile App (Frontend)
1. **`mobile-app/app/(tabs)/index.tsx`**: 
   - Màn hình Feed truyền videoId, thông tin user, trạng thái like (`isLiked`), và hàm callback vào component `SocialActions`.
2. **`mobile-app/components/SocialActions.tsx`**:
   - Khi người dùng bấm nút Like, hàm `handleLike()` được kích hoạt.
   - **Xử lý UI**: Component lập tức cập nhật trạng thái like và số lượng like (Optimistic Update) giúp tạo cảm giác mượt mà không có độ trễ, đồng thời chạy hiệu ứng (animation) thu phóng trái tim.
   - Gọi hàm API: `api.toggleLike(videoId)`. Trường hợp API lỗi, component sẽ tự dội ngược lại (revert) trạng thái cũ.
3. **`mobile-app/services/api.ts`**:
   - Hàm `toggleLike(videoId)` thực hiện một POST request thông qua HTTP Client (Axios) đến đường dẫn: `/social/like/${videoId}`.

### Backend (Spring Boot)
4. **`backend/src/main/java/com/example/video/controller/SocialController.java`**:
   - Nhận request tại endpoint `@PostMapping("/like/{videoId}")` ở hàm `toggleLike()`.
   - Lấy thông tin user hiện tại thông qua `Authentication`. 
   - Yêu cầu `SocialService` thực hiện thay đổi trạng thái like.
   - Trả về response JSON gồm thuộc tính `success` và boolean `liked` mới nhất.

---

## 2. Hiển thị Video Tiếp Theo (Cuộn xem Video / Feed)

Luồng tải video diễn ra ngay từ khi mở app và khi người dùng vuốt/cuộn để xem video tiếp theo.

### Mobile App (Frontend)
1. **`mobile-app/app/(tabs)/index.tsx`**:
   - Sử dụng thẻ `<FlatList>` với thuộc tính `pagingEnabled` (để cuộn từng video toàn màn hình).
   - **Ghi nhận khi lướt video**: Sự kiện `onViewableItemsChanged` gọi hàm `handleViewableItemsChanged(...)`. 
     - Hàm tính toán video nào đang lọt vào tầm nhìn.
     - Dừng và tua về 0 (pause & setPosition 0) cho các video bị ẩn đi, đồng thời gọi `playAsync()` phát video hiện tại.
     - Kích hoạt hàm `recordVideoView(videoId)` (gọi POST API `/feed/view/${videoId}`) để ghi nhận lượt xem cho backend.
   - **Tải thêm khi sắp hết danh sách (Load more)**: Khi cuộn đến gần cuối (`onEndReached`), hàm `handleLoadMore()` cập nhật số trang (page + 1) và gọi `fetchVideos()`.
2. **`mobile-app/services/api.ts`**:
   - Hàm `getFeed(page, size)` thực hiện GET request đến `/feed` với query parameter là `page` và `size`.
   - Hàm `recordView(videoId, ...)` thực hiện POST request đến `/feed/view/${videoId}` để đẩy dữ liệu phân tích.

### Backend (Spring Boot)
3. **`backend/src/main/java/com/example/video/controller/FeedController.java`**:
   - **Lấy danh sách video**: Endpoint `@GetMapping("")` (tức là `/api/feed`).
     - Gọi `RecommendationService.getRecommendedFeed()`.
     - Dựa vào logic đề xuất của hệ thống, backend tính điểm theo công thức: *`Score = (Views × 1) + (Likes × 3) + (Shares × 5) - (Decay_Time) + Random`* để quyết định video nào được hiển thị cho người xem. Trả về danh sách gồm `VideoFeedItem`.
   - **Ghi nhận lượt xem**: Endpoint `@PostMapping("/view/{videoId}")` ở hàm `recordView()`. Chuyển thông tin cho `SocialService` để thống kê, phục vụ cho bộ máy đề xuất nội dung.

---

## 3. Thao tác Tải Video (Upload Video)

Khi người dùng thực hiện tải một video mới lên hệ thống, luồng hoạt động diễn ra từ giao diện cho đến máy chủ thông qua giao thức truyền tải tệp nặng (multipart/form-data):

### Mobile App (Frontend)
1. **`mobile-app/app/(tabs)/explore.tsx` (Component UploadScreen)**:
   - Người dùng đăng nhập/đăng ký thành công (nếu chưa có Auth Token).
   - Mở màn chọn tệp video từ điện thoại thông qua thư viện `expo-document-picker` (hàm `handleSelectVideo()`). Hệ thống cũng có hỗ trợ giao diện chờ để cắt/trim video (thông qua `VideoTrimmer`).
   - Sau khi điền tiêu đề (title) và mô tả (description), người dùng nhấn "Upload Video" để kích hoạt hàm `handleUpload()`.
   - Hàm `handleUpload()` gọi api để tải, đồng thời cập nhật biến trạng thái `uploadProgress` để hiển thị thanh tiến trình (%) cho người dùng thấy.
2. **`mobile-app/services/api.ts`**:
   - Hàm `uploadVideo()` tiếp nhận đối tượng file, title và description.
   - Dữ liệu được đóng gói vào trong `FormData`. Trong đó key mang tên `file` sẽ chứa `uri` đường dẫn thực đến tệp ở bộ nhớ cục bộ, `name`, và `type` (ví dụ `video/mp4`).
   - Thực hiện Axios POST request tới `/videos/upload` với cấu hình Header `{'Content-Type': 'multipart/form-data'}`. 
   - Hàm thiết lập callback listener tên là `onUploadProgress` từ Axios để bắt liên tục tiến độ đẩy file và truyền ngược lại lên giao diện UI.

### Backend (Spring Boot)
3. **`backend/src/main/java/com/example/video/controller/VideoController.java`**:
   - Controller đảm nhiệm việc bắt request tải lên tại endpoint `@PostMapping("/upload")` ở hàm `uploadVideo()`.
   - Hàm định nghĩa các `@RequestParam` bao gồm `"file"` với định dạng dữ liệu là `MultipartFile`.
   - Nó truy xuất thông tin xác thực (`Authentication`) để biết ai là người upload, sau đó gọi xuống `videoService.uploadVideo(...)`.
   - Ở lớp dịch vụ trung tâm, tệp video được lưu thành tệp vật lý (hoặc lên Cụm lưu trữ ngoài S3), và bản ghi metadata về video mới (gồm file location, title, định dạng thời gian) được lưu trữ vào CSDL.
   - Khi hoàn tất, Backend phản hồi về cho thiết bị Mobile dưới dạng JSON đối tượng Video vừa được định hình xong.

---
**Tóm lại**, hệ thống hoạt động thông qua cơ chế RESTful API nơi Mobile App phản hồi thao tác ngay lập tức trên UI (Optimistic updates) để mang lại cảm giác mượt mà, sau đó âm thầm đồng bộ liệu và tải feed thông qua `api.ts` kết nối trực tiếp đến các `FeedController`, `SocialController` và `VideoController` ở backend để tính toán thuật toán gợi ý cũng như quản lý nội dung đa phương tiện.
