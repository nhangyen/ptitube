# 🎬 Luồng Hoạt Động Chức Năng Đề Xuất Video — PtiTube

> Tài liệu này mô tả chi tiết end-to-end flow của hệ thống recommendation trong ứng dụng PtiTube, từ khi người dùng mở app cho đến khi nhận được danh sách video được cá nhân hoá.

---

## 📐 Kiến Trúc Tổng Quan

```
┌──────────────────────────────────────────────────────────┐
│                    Mobile App (Android)                   │
│             GET /api/feed?page=0&size=10                  │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP Request (JWT Bearer Token)
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Spring Boot Backend (Java)                   │
│  FeedController → RecommendationService                   │
│                                                          │
│  ┌─────────────────┐     ┌────────────────────────────┐  │
│  │  Path A         │     │  Path B                    │  │
│  │  (New User)     │     │  (Existing User)           │  │
│  │  Random Feed    │     │  AI-Powered Feed           │  │
│  └─────────────────┘     └──────────────┬─────────────┘  │
└─────────────────────────────────────────┼────────────────┘
                                          │ POST /predict
                                          ▼
┌──────────────────────────────────────────────────────────┐
│           FastAPI AI Server (Python - Port 8000)          │
│      Generative Regression Transformer (Seq2Seq)          │
│      → Dự đoán Watch Time cho từng video candidate        │
└──────────────────────────────────────────────────────────┘
```

---

## 📡 1. Entry Point: `FeedController`

**File:** `backend/src/main/java/com/example/video/controller/FeedController.java`  
**Endpoint:** `GET /api/feed`

Khi người dùng mở màn hình feed, app Android gọi:

```
GET /api/feed?page=0&size=10
Authorization: Bearer <JWT_TOKEN>
```

Controller thực hiện hai việc:

1. **Xác định danh tính người dùng** từ JWT token thông qua Spring Security `Authentication`.
2. **Uỷ quyền** sang `RecommendationService.getRecommendedFeed(currentUserId, page, size)`.

> **Lưu ý:** Với người dùng chưa đăng nhập (anonymous), `currentUserId = null` → feed ngẫu nhiên.

---

## 🔀 2. Phân Luồng: New User vs. Existing User

**File:** `RecommendationService.java` — Method: `getRecommendedFeed()`

```java
if (currentUserId == null)          → Path A: Random Feed (ẩn danh)
if (isNewUser(user))                → Path A: Random Feed (người dùng mới)
else                                → Path B: AI-Powered Feed
```

### Điều kiện xác định "người dùng mới" (`isNewUser()`)

Người dùng bị coi là "mới" nếu thoả **ít nhất một** trong hai điều kiện:

| Điều kiện | Ngưỡng |
|-----------|--------|
| Tài khoản được tạo chưa đến **1 ngày** | `NEW_USER_DAYS_THRESHOLD = 1` |
| Tổng số video đã xem dưới **20 video** | `NEW_USER_VIEW_THRESHOLD = 20` |

---

## 🎲 PATH A — Random Feed (Người Dùng Mới / Ẩn Danh)

**Method:** `getRandomFeed(currentUserId, size)`

Dành cho người dùng mới hoặc chưa đăng nhập. Không có đủ dữ liệu hành vi để AI hoạt động hiệu quả.

### Các bước thực hiện:

```
1. Nếu có userId:
   └─ Truy vấn: findRandomUnwatchedVideoIds(userId, size)
       └─ Fallback (không đủ video chưa xem): findRandomActiveVideoIds(size)
   
2. Nếu là anonymous:
   └─ Truy vấn: findRandomActiveVideoIds(size)

3. Load đầy đủ thông tin video kèm thông tin tác giả
   └─ findAllWithUserByIdIn(videoIds)

4. Shuffle ngẫu nhiên danh sách

5. Build FeedContext → Convert sang VideoFeedItem → Trả về
```

---

## 🤖 PATH B — AI-Powered Feed (Người Dùng Hiện Hữu)

**Method:** `getAiPoweredFeed(user, size)`

Đây là luồng chính, phức tạp hơn. Gồm **7 bước**.

---

### Bước 1: Lấy video từ người được follow

```java
List<UUID> followedVideoIds = 
    videoRepository.findRandomFollowedVideoIds(userId, MIN_FOLLOWED_VIDEOS);
// MIN_FOLLOWED_VIDEOS = 2
```

Đảm bảo tối thiểu **2 video** từ các creator mà user đang follow luôn xuất hiện trong feed → tăng retention & social engagement.

---

### Bước 2: Lấp đầy pool ứng viên còn lại

```java
int remainingSlots = CANDIDATE_POOL_SIZE - followedVideoIds.size();
// CANDIDATE_POOL_SIZE = 60

List<UUID> otherVideoIds = 
    videoRepository.findRandomVideoIdsExcluding(excludeIds, remainingSlots);
```

Tổng pool ứng viên: **tối đa 60 video** (2 từ followed + 58 ngẫu nhiên). Pool lớn để AI có đủ lựa chọn, nhưng không quá lớn để giữ hiệu năng.

---

### Bước 3: Tải đầy đủ thông tin candidate

```java
List<Video> allCandidates = 
    videoRepository.findAllWithUserByIdIn(allCandidateIds);
```

Tách candidate thành 2 nhóm để xử lý riêng:
- `followedVideos` — sẽ được đưa thẳng vào kết quả cuối
- `candidatesForAi` — sẽ được đưa qua AI để chấm điểm

---

### Bước 4: Gọi AI Server để dự đoán Watch Time

Đây là bước quan trọng nhất.

#### 4a. Build AI Request

`buildAiRequest(user, candidatesForAi)` tạo payload gồm 2 phần:

**User Profile** — đặc trưng hành vi người dùng:

| Field | Mô tả | Cách tính |
|-------|--------|-----------|
| `user_id` | Numeric ID của user | `user.getNumericId()` |
| `active_degree` | Mức độ hoạt động (0-3) | `< 10 views → 0`, `< 50 → 1`, `< 200 → 2`, `>= 200 → 3` |
| `is_live_streamer` | Có phát live không | Hiện tại luôn = 0 |
| `is_video_author` | Đã upload video chưa | `videoCount > 0 ? 1 : 0` |
| `follow_user_num_range` | Số người đang follow (dạng range 0-4) | Thresholds: [0, 10, 50, 100, 500] |
| `fans_user_num_range` | Số người follow mình | Thresholds: [0, 10, 50, 100, 500] |
| `register_days_range` | Số ngày từ khi đăng ký | Thresholds: [0, 7, 30, 90, 365] |

**Video Candidates** — thông tin từng video ứng viên:

| Field | Mô tả |
|-------|--------|
| `candidate_id` | Numeric ID của video |
| `item_id` | `0` (chưa có trong training data của AI) |
| `duration_seconds` | Thời lượng video (giây) |
| `feat0` | Category ID của video (map từ `VideoCategory` enum) |
| `feat1-3` | Hiện tại = 0 (chờ mở rộng) |

#### 4b. Gọi AI Server

```java
AiPredictionResponse response = callAiServer(request);
// POST http://192.168.1.23:8000/predict
```

**Request JSON:**
```json
{
  "user_profile": {
    "user_id": 1234,
    "active_degree": 2,
    "is_live_streamer": 0,
    "is_video_author": 1,
    "follow_user_num_range": 2,
    "fans_user_num_range": 1,
    "register_days_range": 3
  },
  "video_candidates": [
    {
      "candidate_id": 9001,
      "item_id": 0,
      "duration_seconds": 30.0,
      "feat0": 5,
      "feat1": 0,
      "feat2": 0,
      "feat3": 0
    },
    ...
  ]
}
```

**Response JSON:**
```json
{
  "status": "success",
  "predictions": [
    { "candidate_id": 9001, "predicted_watch_time": 13.5 },
    { "candidate_id": 9002, "predicted_watch_time": 8.2 },
    ...
  ]
}
```

> **Fallback:** Nếu AI Server lỗi (timeout, model chưa load, etc.) → shuffle ngẫu nhiên candidates thay vì throw exception, đảm bảo feed vẫn hoạt động.

---

### Bước 5: Sắp xếp theo điểm AI

```java
List<Video> aiSortedVideos = applySorting(candidatesForAi, response);
```

- Map `candidate_id → predicted_watch_time` từ response.
- Sắp xếp candidates **giảm dần** theo `predicted_watch_time`.
- Video có watch time dự đoán cao nhất sẽ ở đầu.

---

### Bước 6: Chọn video cuối cùng cho feed

`selectFinalVideos(aiSortedVideos, followedVideos, size)` áp dụng chiến lược lai:

```
result = [followed_videos]              ← luôn bao gồm (ưu tiên social)
       + [top (size-1) from AI]         ← video AI cho điểm cao nhất
       + [1 video gần cuối danh sách]   ← video khám phá (content discovery)
```

Ví dụ với `size = 10`:
- 2 video từ người được follow
- 7 video top AI
- 1 video "bất ngờ" từ gần cuối danh sách AI

Mục đích của video "gần cuối": tránh filter bubble, cho phép người dùng khám phá nội dung mới lạ có thể họ chưa từng thấy.

---

### Bước 7: Shuffle và trả về kết quả

```java
Collections.shuffle(selectedVideos);          // Shuffle để ẩn thứ tự AI
FeedContext context = buildFeedContext(...);   // Build metadata batch
return videos.stream()
    .map(v -> convertToFeedItem(v, 0, userId, context))
    .collect(Collectors.toList());
```

`FeedContext` là một batch query tối ưu dùng để load:
- `VideoStats` (views, likes, comments, shares)
- Hashtags của từng video
- Danh sách video đã được user này like
- Danh sách creator đã được user này follow

→ Tránh N+1 query problem, tất cả được load trong 4 queries song song.

---

## 📊 3. Thu Thập Dữ Liệu Hành Vi Người Dùng

### 3a. Ghi nhận lượt xem thời gian thực

**Endpoint:** `POST /api/feed/view/{videoId}?watchDuration=15.5&completed=false`

Khi người dùng vuốt qua một video, app gọi endpoint này. `SocialService.recordView()` thực hiện:

```
1. Lưu VideoView vào database (bảng video_views)
   → user_id, video_id, watch_duration, is_completed

2. Tăng view_count trong VideoStats (+1)

3. Ghi interaction vào CSV cho AI training:
   → /app/data/data_raw/big_matrix_processed.csv
   → format: user_id, item_id, timestamp, duration_normed, watch_ratio_normed
```

**Ví dụ dòng CSV được append:**
```
1234,9001,1712678400,30.00,0.5167
```

> **watch_ratio** = `watchDuration / totalDuration` — chỉ số chính AI dùng để học.

### 3b. Export dữ liệu training định kỳ

`AiDataExportService` chạy **Cron Job mỗi ngày lúc 2:00 SA**:

```
Cron: 0 0 2 * * ?
```

Export ra 2 file:

| File | Nội dung |
|------|----------|
| `user_features.csv` | Đặc trưng hành vi của từng user (active_degree, follow_range, etc.) |
| `item_categories.csv` | Category tag của từng video (feat0, feat1, feat2, feat3) |

Admin có thể trigger export thủ công:
```
GET /api/admin/ai/force-export
```

---

## 🧠 4. AI Server (Python FastAPI)

**File:** `recommendation/app.py`  
**Port:** 8000

### Kiến trúc model: Generative Regression Transformer (Seq2Seq)

Không phải regression đơn giản, mà là **transformer sinh chuỗi** — mô hình đọc đặc trưng user + video như input, rồi "sinh ra" chuỗi token đại diện cho thời lượng xem dự đoán.

```
Input  → [User Features (7 chiều)] + [Video Features (6 chiều)]
         = Vector 52 chiều sau khi merge và encode

        ┌─────────────────────────────┐
        │   Encoder (Transformer)     │
        │   → Ngữ cảnh sâu 128 chiều │
        └──────────────┬──────────────┘
                       │ Memory
        ┌──────────────▼──────────────┐
        │   Decoder (Transformer)     │
        │   → Sinh chuỗi token dự đoán│
        └──────────────┬──────────────┘
                       │ Windowed Soft-Argmax Decode
                       ▼
              predicted_watch_time (giây)
```

### Dữ liệu training (KuaiRec dataset + dữ liệu thực)

| File | Vai trò |
|------|---------|
| `big_matrix_processed.csv` | Ma trận tương tác (ai xem gì, bao lâu) |
| `user_features.csv` | Đặc trưng người dùng |
| `item_categories.csv` | Danh mục video |

### Quy trình huấn luyện

```
data_process.py    → Merge, normalize, encode → tensor .npy
datasets.py        → DataLoader (batch loading)
train.py           → Training loop + Curriculum Learning
                   → Save checkpoints/best_model.pth
inference.py       → Evaluate: xAUC + MAE metrics
app.py             → Load model → Serve /predict endpoint
```

---

## 🔄 5. Vòng Đời Dữ Liệu — Data Flywheel

```
┌─────────────────────────────────────────────────────┐
│  User xem video → recordView() → big_matrix.csv     │
│         ↓                                            │
│  Cron 2AM → user_features.csv + item_categories.csv │
│         ↓                                            │
│  Kaggle/Colab: data_process → train → best_model.pth│
│         ↓                                            │
│  Deploy model mới → AI Server                        │
│         ↓                                            │
│  Dự đoán tốt hơn → User thích xem hơn               │
│         ↓ (vòng lặp tiếp tục)                        │
└─────────────────────────────────────────────────────┘
```

Đây là Data Flywheel (bánh đà dữ liệu): càng nhiều người dùng → càng nhiều data → model càng chính xác → feed càng hấp dẫn → càng nhiều người dùng.

---

## 📋 6. Tóm Tắt Các Component

| Component | File | Vai trò |
|-----------|------|---------|
| API Entry | `FeedController.java` | Nhận request, extract JWT, route sang service |
| Phân luồng | `RecommendationService.java` | New user vs. existing user routing |
| Random Feed | `RecommendationService.java` | Path A - feed ngẫu nhiên |
| AI Feed | `RecommendationService.java` | Path B - candidate pool + AI ranking |
| AI Request | `AiPredictionRequest.java` | DTO: user profile + video candidates |
| AI Response | `AiPredictionResponse.java` | DTO: predicted_watch_time per candidate |
| View Tracking | `SocialService.java` | Ghi nhận lượt xem + log CSV |
| Interaction Logger | `InteractionLoggerService.java` | Append vào big_matrix.csv |
| Data Export | `AiDataExportService.java` | Cron export user/item features |
| AI Server | `recommendation/app.py` | FastAPI + Transformer inference |
| Model Training | `recommendation/train.py` | Huấn luyện Seq2Seq |
| Data Processing | `recommendation/data_process.py` | Merge CSV → tensor .npy |

---

## ⚙️ 7. Các Hằng Số Quan Trọng

```java
// RecommendationService.java
CANDIDATE_POOL_SIZE       = 60    // Số video đưa vào AI để đánh giá
MIN_FOLLOWED_VIDEOS       = 2     // Số video tối thiểu từ người được follow
NEW_USER_VIEW_THRESHOLD   = 20    // Ngưỡng số video đã xem để xác định user mới
NEW_USER_DAYS_THRESHOLD   = 1     // Ngưỡng số ngày tài khoản để xác định user mới

// AiDataExportService.java / InteractionLoggerService.java
CSV_DIR = "/app/data/data_raw"    // Thư mục lưu data training (Docker volume)

// AI Server URL (application.properties)
ai.server.url = http://192.168.1.23:8000
```

---

## 🐞 8. Xử Lý Lỗi & Fallback

| Tình huống | Xử lý |
|-----------|--------|
| User không tồn tại | → Random feed |
| AI Server timeout/lỗi | → Shuffle random (không crash) |
| Không đủ video chưa xem | → Fallback sang `findRandomActiveVideoIds` |
| Pool candidate rỗng | → Random feed |
| Video không có `numericId` | → Bị lọc khỏi AI request |
| Model chưa được load | → HTTP 503 từ AI server |

---

*Tài liệu này được tạo tự động từ phân tích source code PtiTube — cập nhật lần cuối: 09/04/2026.*
