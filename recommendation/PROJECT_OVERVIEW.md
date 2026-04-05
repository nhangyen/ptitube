# Tổng quan Dự án Generative Regression (GR)

Dự án này là hệ thống Học máy (Machine Learning) được thiết kế đặc thù để **định lượng và dự báo thời gian xem (Watch Time Prediction)** của người dùng trên các nền tảng video ngắn điện thoại (nổi bật là thuật toán lõi ứng dụng cho TikTok, Facebook Reels, Kuaishou). 

**Mục tiêu cốt lõi:** Thay vì dùng các mô hình hồi quy (Regression) truyền thống để tính ra một con số thô cứng dễ bị nhiễu do người dùng "lướt nhầm", dự án áp dụng hệ tư duy hoàn toàn mới bằng kiến trúc mạng **Transformer sinh chuỗi (Seq2Seq Generation)**. Mô hình sẽ đóng vai trò giống như AI ngôn ngữ: Đọc thông tin Đặc trưng người dùng + Tính năng Video, sau đó "sinh ra" một trình tự đại diện cho mức độ và thời gian mà thẻ user đó có thể sẽ bị cuốn vào đoạn video ngắn.

---

## 🗄️ Cấu trúc và Mối quan hệ Dữ liệu (Dataset Schema)

Dự án được xây dựng dựa trên lõi dữ liệu hành vi người dùng cực kỳ phức tạp (KuaiRec), được chia làm **3 thực thể chính** kết nối chặt chẽ với nhau:

### 1. Thực thể Tương tác (Interaction Matrix)
*Là tệp tin trung tâm (ví dụ `big_matrix_processed.csv`), nơi mỗi kỷ lục lưu trữ một "cú quẹt video" trúng đích của người dùng.*
- **`user_id`**: Mã định danh người dùng vãng lai.
- **`item_id`**: Mã định danh đoạn video.
- **`timestamp`**: Dấu thời gian hệ thống ghi nhận lượt xem.
- **`watch_ratio_normed`**: Tỷ lệ xem đã được chuẩn hóa. **Đây chính là Target (nhãn kết quả) quan trọng nhất mà mô hình Transformer cần học để dự đoán.**
- **`duration_normed`**: Chiều dài (thời lượng gốc) của video đó.

### 2. Thực thể Hồ sơ Video (Item Categories)
*Được Nối khóa (Join) thẳng vào cấu trúc Tương tác thông qua khóa ngoại `item_id`.*
- **`item_id`**: Mã định danh video.
- **`feat0` -> `feat3`**: Mô hình hỗ trợ tối đa 4 thẻ danh mục (tags chủ đề) gắn cho video đó (ví dụ Tag Giải trí, PK, Hài hước). Nếu video ít thẻ hơn sẽ được tự động chèn Padding bằng số 0.

### 3. Thực thể Đặc trưng Người xem (User Features)
*Được Nối khóa (Join) thẳng vào cấu trúc Tương tác thông qua khóa ngoại `user_id`.*
- Chứa các chuỗi tần suất liên tục như: Mức độ tương tác chung (`user_active_degree`), Trạng thái cấp độ Livestream (`is_live_streamer`), Khoảng số lượng quạt hâm mộ (`fans_user_num_range`), Số ngày thâm niên từ lúc tải App (`register_days_range`)...
- **Nhóm bảo mật One-hot (18 trường):** Mã băm ẩn danh hành vi (từ `onehot_feat0` đến `onehot_feat17`) mô tả thói quen lướt ngầm cực sâu của thẻ User đó (chống kỹ sư nhân loại đọc hiểu).

👉 **Cách thức Vận hành liên hệ (Pipeline):** 
Script `data_process.py` sẽ thực hiện quy trình ráp bảng khổng lồ: Mở Bảng Tương tác -> Nhặt khóa `item_id` và `user_id` -> Tra ngược sang Bảng Dữ liệu Video và Bảng Dữ liệu Người dùng -> Dán gộp chèn lại thành một dải Băng thông tin siêu dài quy mô **52 chiều** (52 dimensions) cho mỗi lần lướt video. 

Toàn bộ mảng Vector 52 chiều dài thòng này sau đó sẽ được nén lại (file `.npy`) và bơm thẳng vào "Xương sống Transformer" để nó tự phân tích và tìm ra ma trận quy luật "Thời gian xem kì vọng".

---

## 📂 Tổ chức File và Thư mục

Dưới đây là sơ đồ cấu trúc của dự án, kèm diễn giải chi tiết cho vai trò và tác dụng của từng tệp mã nguồn:

### 1. Nhóm Xử lý Dữ liệu
* **`data_process.py`**: Là trái tim của khâu Tiền xử lý dữ liệu. Đóng vai trò đọc các file cấu trúc rời rạc từ Database gốc (như CSV), sau đó dùng thư viện Pandas để gộp nối thông tin Người dùng và phân loại Video lại với nhau ở dạng chuỗi nguyên mẫu. Bước cuối, hàm này sẽ ép kiểu tất cả sang vector `.npy` tốc độ cao phục vụ tính toán.
* **`datasets.py`**: Định nghĩa tiêu chuẩn mảng nạp thông tin thông qua class `Dataset` và `DataLoader` của PyTorch. Trong lúc Train, file này làm nhiệm vụ bốc từng lô (Batch Size) dữ liệu vector đã làm sạch để bơm vào mô hình ở từng hiệp, tránh làm hệ thống sập RAM do nhồi nhét data một lần.

### 2. Nhóm Huấn luyện & Đánh giá (Vận hành Lõi)
* **`train.py`**: Động cơ thực thi cốt lõi của việc đào tạo AI. Nơi thiết lập vòng lặp huấn luyện định kỳ, áp dụng các thuật toán tiến trình như *Curriculum Learning* (bắt mô hình học từ bài dễ đến bài khó) để tránh việc học vẹt, tính hàm mất mát (loss function) tự điều chỉnh, và cuối cùng đóng gói lại file chất xám `.pth`.
* **`inference.py`**: Chứa thuật toán Suy luận và Dự đoán ứng dụng. Code ở đây chuyên dùng để nạp mô hình đã train thành công, chạy cơ chế giải mã mềm (*windowed soft-argmax decode*), nhận input người dùng vãng lai và tung ra ước đoán số giây xem.
* **`metrics.py`**: Thước đo sức khỏe của mô hình. Chứa các công thức tính toán độ lệch như thuật toán bình phương (MSE) và sự sai số tuyệt đối (MAE). Nhờ các thước đo này mà `train.py` biết AI của mình đưa ra dự báo hiện tại có đang tiệm cận mức chính xác chưa ngả rẽ học lại.
* **`util.py`**: Rương đồ nghề phụ trợ. Đựng các đoạn code linh tinh hỗ trợ ghi nhận lịch sử vào biến nhật ký (logger) và cài đặt seed (chốt số ngẫu nhiên chung) để mọi lần run đều ra kết quả nhất quán.

### 3. Nhóm Kiến trúc Não bộ (Thuộc thư mục `model/`)
Thư mục model chứa chất xám của mạng nơ-ron Transformer độc quyền của tác giả:
* **`model/encoder.py`**: Hệ thống Khảo sát. Chuyên chụp lấy input đặc điểm của Video cũng như User, sau đó ánh xạ và nén các thông tin này lại thành một "vùng nhớ ngữ cảnh sâu kín".
* **`model/decoder.py`**: Hệ thống Giải dịch. Tham chiếu vào khu nhớ ngữ cảnh của Khảo Sát, tiến hành bắn ra hàng rào các lớp xác suất phân bổ để biến đổi thông tin tĩnh thành trình tự dòng dự đoán số thời lượng xem liên tục.
* **`model/attention.py`**: Lớp Chú ý (*Self-Attention cơ học*). Điểm mạnh nhất của Transformer. Tính năng này giúp AI cân nhắc đâu là yếu tố cần quan tâm. *(Ví dụ: User Nam giới, quan tâm Game FPS -> Bộ phận Attention tự đánh giá điểm sáng và tập trung sức mạnh vào đặc tính Video bắn súng)*.
* **`model/transformer.py`**: Vỏ bọc hệ thống. Trực tiếp điều phối và lắp ghép khối Encoder và rào Decoder lại để lộ ra một class thành phẩm `GRModel` duy nhất đưa cho `train.py` nhập dữ liệu vào.

### 4. Nhóm Tài liệu
* **`README.md`**: File mặc định của tác giả dự án. Liệt kê cách set up môi trường máy cá nhân và cung cấp các cờ dòng lệnh (flags command) cho Python.
* **`BACKEND_INTEGRATION_GUIDE.md`**: Tài liệu Hướng dẫn mở rộng. Chuyên tập trung vào việc mô tả cách đưa dự án lên huấn luyện ở hạ tầng mây Google Colab, giải pháp đóng gói mô hình AI, và cấu hình API để gọi nối với Backend máy chủ (Java/Node, v.v) cho hệ thống thực tiễn mạng xã hội của riêng bạn.
