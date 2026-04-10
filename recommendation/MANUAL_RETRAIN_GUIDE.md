# Hướng Dẫn Tự Chủ Huấn Luyện Lại (Manual Retrain) Mô Hình AI

Một trong những tính năng mạnh mẽ nhất của Ptitube AI là khả năng "Học Tăng Cường" - tức là AI sẽ hiểu được thói quen của người dùng sau một thời gian chạy thực tế của app. Vì bạn không cắm server server 24/24, nên đây là **Quy Trình Chuẩn Điểm Tuyệt Đối** nhằm bảo toàn dữ liệu và Retrain thủ công (bằng Kaggle hoặc Google Colab).

---

## 🛑 BƯỚC 1: TRƯỚC KHI TẮT MÁY (BẮT BUỘC PHẢI LÀM)

Vì bạn sẽ tắt server đi nghỉ ngơi, nếu bạn quên bước này, mọi dữ liệu hành vi vuốt app ban ngày sẽ bị lệch pha với từ điển danh tính người dùng!

1. Bật trình duyệt (Chrome/Edge/Safari) trên máy tính/điện thoại đang truy cập vào mạng nội bộ.
2. Gõ thẳng URL bảo bối này vào thanh url và nhấn Enter:
   👉 **`http://localhost:8080/api/admin/ai/force-export`** 
   *(Mẹo: Hãy Bookmark đường link này lại trên Chrome).*
3. Trên màn hình trả về dòng chữ: `{"message":"AI features exported successfully...","status":"success"}`
   Lúc này, Backend Java vừa làm nhiệm vụ chắt lọc mọi ngóc ngách của Database để vắt thành 2 file `user_features.csv` và `item_categories.csv` tươi roi rói thả vào ổ cứng của bạn.

Bây giờ bạn hoàn toàn có thể yên tâm **TẮT SERVER Ptitube và đi ngủ**.

---

## 📦 BƯỚC 2: GÓI HÀNG ĐỂ MANG LÊN ĐÁM MÂY (KAGGLE/COLAB)

Bây giờ toàn bộ những gì AI cần đều đã tụ hội đầy đủ tại thư mục máy của bạn: `e:\android_project\ptitube\data\data_raw`.

1. Vào thư mục `ptitube\data\data_raw\`.
2. Kiểm tra xem đã có đủ **3 chiến thần** này chưa (hoặc nén từ thư mục `ptitube\data\data_raw\`):
   - `big_matrix_processed.csv` (Cuốn sổ ghi chép lại mọi cú lướt thả tim).
   - `user_features.csv` (Cuốn từ điển quy định user nào nghiện app, user nào mới).
   - `item_categories.csv` (Cuốn từ điển phân loại video nào là chó mèo, nào là thể thao).
3. **MẸO ĐỂ KHÔNG PHẢI HỌC LẠI TỪ ĐẦU:**
   - Hãy copy thêm file **`best_model.pth`** từ thư mục `ptitube\recommendation\checkpoints\` vào cùng chỗ với 3 file CSV trên.
4. Bôi đen cả 4 file này (3 CSV + 1 PTH), chuột phải chọn **Compress to Zip file** (Nén lại thành `.zip`).

---

## 🚀 BƯỚC 3: MANG LÊN KAGGLE ĐỂ HỌC TIẾP (KHÔNG HỌC LẠI TỪ ĐẦU)

Tại môi trường Kaggle, hệ thống miễn phí GPU Khủng (P100) cho bạn thả ga.

1. Đăng nhập [Kaggle](https://www.kaggle.com/) -> Bấm **New Notebook**.
2. **Kích Hoạt Engine V8:** Tại mục Setting bên phải, phần `Accelerator`, chọn `GPU P100`. Mở công tắc `Internet` qua chữ **On**.
3. **Nén Data vào Não Kaggle:** Cột bên phải, chọn mục **Input -> Add Data -> Upload**. Bơm file `.zip` vừa nãy lên.
4. **Copy Code & Chạy Thôi:** Dán kịch bản sau vào ô code của Kaggle:

```bash
# 1. Tải mớ code lõi AI về
!git clone <Link_Github_Dự_Án_Của_Bạn> 
%cd ptitube/recommendation/

# 2. Tạo kho bãi đón hàng 
!mkdir -p data_raw/
!mkdir -p data_processed/

# 3. Lót dữ liệu (Đổi tên My-Zip-File thành tên Thư mục bạn khai báo trên Kaggle)
!cp /kaggle/input/My-Zip-File/*.csv data_raw/
!cp /kaggle/input/My-Zip-File/best_model.pth data_raw/

# 4. Ép file rời rạc thành dạng Sóng Não Ma Trận Tensor (.npy)
!python data_process.py 

# 5. Khởi động - Bắt đầu Train TIẾP (Fine-tuning)
# Lưu ý: Thêm tham số --load_checkpoint để AI lấy kiến thức cũ làm nền tảng
!python train.py \
    --train_data data_processed/train_kauiRec.npy \
    --test_data data_processed/test_kauiRec.npy \
    --log_dir checkpoints/ \
    --use_curriculum_learning \
    --curriculum_learning_type exp \
    --load_checkpoint data_raw/best_model.pth \
    --num_epochs 10
```

---

## 🎁 BƯỚC 4: THU HOẠCH QUẢ NGỌT & ĐẬP CŨ THAY MỚI

Khi Kaggle báo Complete (Epoch 10...):

1. Mở Panel bên phải của Kaggle, mục **Output** `/kaggle/working/checkpoints/`.
2. Tải file `best_model.pth` nóng hổi này về.
3. Ghi đè file này vào đúng thư mục `ptitube\recommendation\checkpoints\` trên máy bạn.
4. XONG! Chạy lại `docker compose up -d` ➡️ AI của bạn đã thông minh hơn sau khi được "nhồi" thêm kiến thức ngày hôm đó!
