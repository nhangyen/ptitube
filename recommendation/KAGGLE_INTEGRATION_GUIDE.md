# Hướng dẫn Huấn luyện Mô hình trên Kaggle Kernels

Ngoài hệ sinh thái của Google Colab, **Kaggle** cũng là một lựa chọn cực kỳ lý tưởng bởi nó cung cấp môi trường Notebook với GPU mạnh mẽ (như P100 hay T4x2) và đặc biệt là hệ thống Import Dữ liệu nội bộ siêu tốc độ cao hơn cả Colab Drive gấp nhiều lần.

Tài liệu này hướng dẫn bạn đưa dự án cấu trúc này lên huấn luyện ngay trên Kaggle.

---

## Giai đoạn 1: Khởi tạo và Thiết lập Môi trường

### 1. Tạo Notebook mới

1. Đăng nhập [Kaggle](https://www.kaggle.com/) và vào mục **Code** > Chọn nút **New Notebook**.
2. Ở thanh tùy chọn nhanh bên phải, phần **Session Options (Tùy chọn Phiên)**:
   - **Accelerator**: Chọn `GPU P100` hoặc `GPU T4x2` để bật card màn hình tính ma trận. (Tuyệt đối không chạy bằng CPU vì thuật toán Seq2Seq vô cùng ngốn tài nguyên).
   - **Internet**: Chú ý gạt nút bật `Internet On` để cho máy ảo quyền tải code từ github về.

### 2. Tải Source Code (Clone Repo)

Mở một ô Code (Cell) và dán lệnh sau để kéo code của project:

```python
!git clone <ĐƯỜNG_DẪN_GIT_CỦA_BẠN>  # Thay bằng link Github dẫn tới dự án gốc
%cd <TÊN_THƯ_MỤC_CHỨA_CODE>
```

👉 _Lợi thế lớn của Kaggle: Tại Kaggle, đội ngũ kĩ sư đã cài đặt sẵn hệ sinh thái xịn nhất gồm `torch`, `numpy`, `scikit-learn`, `tqdm` với cấu hình CUDA chọc thẳng vào GPU phần cứng, do đó **chúng ta không cần mất thời gian chạy `pip install`** như ở máy chủ cá nhân._

---

## Giai đoạn 2: Bơm dữ liệu (Add Data) trên Kaggle

Kaggle có cơ chế quản lý dữ liệu khác biệt, bạn không mount Drive cá nhân mà sẽ tải dữ liệu trực tiếp vào hạ tầng đám mây chung của nó:

### 1. Tải lên Dataset

1. Nhìn sang Panel điều khiển bên phải của Kaggle, mở mục **Input** -> Nhấn nút **Add Data**.
2. Ở góc phải trên cùng cửa sổ nhỏ, nhấp vào biểu tượng dấu **+ Upload** (Tạo Dataset mới).
3. Đặt cho nó 1 cái tên, ví dụ: `gr-kuairec-npy`.
4. Tiến hành chọn file upload từ dưới máy tính tải lên rồi chọn **Create**.
   > 💡 **Mẹo Thực Chiến (Tải lên bằng file .ZIP):** Hai định dạng `.npy` khá nặng. Thay vì upload từng file, bạn cứ nén chúng lại thành 1 file **`.zip`** cho nhẹ dứt điểm (từ 20GB có khi nén chỉ còn 4GB) và up cục file `.zip` này lên. Sau khi tải xong, máy chủ Kaggle sẽ **tự động tự động bung nén (auto-extract)** file ZIP đó ra tệp `.npy` gốc thẳng vào ổ đĩa ảo. Bạn hoàn toàn không cần còng lưng gõ bất kì câu lệnh `unzip` nào cả!

### 2. Trích xuất vào dự án

Sau khi tải xong, Kaggle ngầm gán dữ liệu này vào đường dẫn Read-only `/kaggle/input/`. Để Training chạy mượt mà theo cấu trúc chuẩn của hệ thống, hãy copy nó vào thư mục code đang làm việc:

```python
!mkdir -p data/data_processed/

# Lưu ý: Cần đổi chữ /gr-kuairec-npy/ nếu lúc nãy bạn đặt tên thư mục Dataset khác
!cp /kaggle/input/gr-kuairec-npy/train_kauiRec.npy data/data_processed/
!cp /kaggle/input/gr-kuairec-npy/test_kauiRec.npy data/data_processed/
```

---

## Giai đoạn 3: Huấn luyện Mô hình (Training)

Không gian làm việc cho phép ghi (Write) của máy ảo này nằm ở bộ nhớ đệm `/kaggle/working/`. Do vậy các điểm Checkpoint (mô hình đã học xong) phải được lưu về đây.

### 1. Train AI ở thiết lập mặc định định

Chạy cell code sau:

```python
!python train.py \
    --train_data data/data_processed/train_kauiRec_wr.npy \
    --test_data  data/data_processed/test_kauiRec_wr.npy  \
    --log_dir    /kaggle/working/checkpoints/ \
    --sample_ratio 0.1 \
    --batch_size 256 \
    --num_epochs 20
```

### 2. Train AI ở chế độ Học tự thích ứng Curriculum Learning (Mặc định khuyên dùng)

```python
!python train.py \
    --train_data data/data_processed/train_kauiRec_wr.npy \
    --test_data  data/data_processed/test_kauiRec_wr.npy  \
    --log_dir    /kaggle/working/checkpoints/ \
    --use_curriculum_learning \
    --curriculum_learning_type exp
```

---

## Giai đoạn 4: Thu hoạch AI (Tải Model về tích hợp)

Lưu ý chết người: **Tuyệt đối không tắt trang web hoặc bấm Restart Kernel** ngay sau khi tiến trình báo 100% (Completed), nếu không mọi mô hình bạn vừa train 5 tiếng ròng rã trong `/kaggle/working/` sẽ bốc hơi. Môi trường Kaggle sẽ không tự Backup như Google Drive.

- **Cách 1 (Export Manual thủ công):** Nhìn Panel bên phải -> Mục **Output** -> Sẽ thấy cây thư mục xuất hiện `/kaggle/working/checkpoints/`. Nhấp menu 3 chấm (...) kế bên file lõi `.pth` (Ví dụ `best_model.pth`) và chọn **Download** để tải não bộ AI về máy tính cá nhân ghép vào Giai đoạn 3 của dự án.

- **Cách 2 (Lưu vết System an toàn - Khuyên dùng):** Khoảng 1 tiếng trước khi đi ngủ, bạn chép tất cả code lại rồi ấn nút **Save Version** to chà bá góc phải trên cùng giao diện, tick vào dạng `Save & Run All (Commit)`. Sáng hôm sau tỉnh dậy truy cập vào version đã chạy lưu đó, Kaggle sẽ cho bạn Download nguyên 1 hòm Zip thành quả nén đính kèm sẵn file AI.
