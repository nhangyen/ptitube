# Hướng dẫn Docker & Quy trình Học Tăng Cường Kết Hợp (Hybrid Retraining)

Tài liệu này hướng dẫn cách đóng gói và chạy dịch vụ AI bằng **Docker** (chuyên dùng cho Server thực tế) và cách phối hợp với **Kaggle/Colab** để huấn luyện mô hình ban đêm (tận dụng GPU miễn phí).

---

## PHẦN 1: TRIỂN KHAI DỊCH VỤ VỚI DOCKER

Dịch vụ AI được thiết kế để chạy trên **CPU** của máy chủ Production để tối ưu chi phí và độ ổn định.

### 1. Chuẩn bị
Đảm bảo bạn có các tệp sau trong cùng một thư mục:
- `Dockerfile`, `app.py`, `inference_requirements.txt`
- Thư mục `model/`, tệp `util.py`, `inference.py`
- Tệp trọng số `checkpoints/best_model.pth` (Vừa tải từ Kaggle/Colab về).

### 2. Build & Run Docker Image
Mở Terminal tại thư mục gốc của dự án:

```bash
# 1. Build Docker Image (Tên là recommend-ai)
docker build -t recommend-ai .

# 2. Khởi chạy Container (Chạy ngầm ở cổng 8000)
# Lưu ý: Ta gắn (mount) tệp model thực tế bên ngoài vào container để dễ dàng cập nhật
docker run -d \
  --name ai_service \
  -p 8000:8000 \
  -v $(pwd)/checkpoints:/app/checkpoints \
  recommend-ai
```

---

## PHẦN 2: QUY TRÌNH HỌC TĂNG CƯỜNG (RETRAINING) HYBRID

Bạn **không cần** chạy Retrain trên server Production nếu server đó không có GPU khủng. Hãy tận dụng mô hình Hybrid sau:

### Luồng Hoạt Động (Lifecycle)

1.  **Giai đoạn 1: Thu thập Log (Server Production)**
    - Đội Backend (Spring Boot) ghi nhận thói quen người dùng (Xếp hạng, thời lượng xem).
    - Lúc **1h sáng**, Java Job xuất dữ liệu thành file CSV.
    - Sử dụng công cụ (như `rclone` hoặc API Google Drive) để tự động đẩy file CSV đó lên **Google Drive**.

2.  **Giai đoạn 2: Retrain trên Đám Mây (Kaggle/Colab - GPU T4/P100)**
    - Bạn mở Notebook (Kaggle/Colab) đã cấu hình sẵn.
    - Notebook này sẽ:
        - Tự động kéo file CSV mới nhất từ Google Drive về.
        - Chạy lệnh: `python data_process.py` và `python train.py`.
        - Sau khoảng 30-60 phút, nó sẽ sinh ra tệp `best_model.pth` phiên bản mới.
        - Lưu đè (Overwrite) file `.pth` đó vào Google Drive.

3.  **Giai đoạn 3: Cập nhật "Não bộ" (Server Production)**
    - Job trên Server Production phát hiện Google Drive có file `.pth` mới.
    - Server tự động tải (Download) file mới về đè vào thư mục `./checkpoints/` (Thư mục bạn đã mount vào Docker ở bước trên).
    - Gõ lệnh khởi động lại Service để AI nạp não mới:
      ```bash
      docker restart ai_service
      ```

---

## 💡 CÂU HỎI THƯỜNG GẶP (FAQ)

### 1. Tại sao không chạy Retrain trực tiếp trên Docker Server?
Việc huấn luyện (Training) mạng Seq2Seq Transformer rất nặng. Nếu server của bạn là VPS/Dedicated đời thường, việc chạy train sẽ:
- Làm **CPU 100%**, gây nghẽn RAM khiến hệ thống Web/App bị sập.
- Thời gian chạy trên CPU có thể mất tới 24h thay vì 1h trên GPU.
- Kaggle/Colab cho GPU miễn phí lên tới 30h-40h mỗi tuần, rất phù hợp cho Startup.

### 2. Làm sao để tự động hóa (Automation)?
- Sử dụng **Cronjob** trên Linux Server để hẹn giờ chạy script Sync dữ liệu.
- Sử dụng **Save Version (Run All)** trên Kaggle để treo máy chạy qua đêm.
- Tận dụng **Python Script** gọi API Google Drive để luân chuyển file .pth.

### 3. Khi nào cần Retrain?
- **Mới khởi chạy:** Nên retrain mỗi đêm/mỗi tuần để AI nhanh chóng "khôn" lên từ data thật.
- **Dữ liệu ổn định:** Khi AI đã đạt độ chính xác cao (MAE thấp, XAUC cao), bạn có thể giãn ra 1 tháng retrain một lần.
