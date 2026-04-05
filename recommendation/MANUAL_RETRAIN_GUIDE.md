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
2. Kiểm tra xem đã có đủ **3 chiến thần** này chưa:
   - `big_matrix_processed.csv` (Cuốn sổ ghi chép lại mấy triệu cú lướt thả tim ban ngày).
   - `user_features.csv` (Cuốn từ điển quy định user nào nghiện app, user nào mới).
   - `item_categories.csv` (Cuốn từ điển phân loại video nào là chó mèo, nào là thể thao).
3. Bôi đen cả 3 file này, chuột phải chọn **Compress to Zip file** (Nén lại thành `.zip`).
   *(Việc này đưa 3 file nặng vài GB nén gọn lại thành cục nhỏ mười mấy MB lôi lên mây cho nhẹ)*.

---

## 🚀 BƯỚC 3: MANG LÊN KAGGLE (HOẶC GOOGLE COLAB) ĐỂ LUYỆN ĐAN

Tại môi trường Kaggle, hệ thống miễn phí GPU Khủng (P100) cho bạn thả ga.

1. Đăng nhập [Kaggle](https://www.kaggle.com/) -> Bấm **New Notebook**.
2. **Kích Hoạt Engine V8:** Tại mục Setting bên phải, phần `Accelerator`, nhẫn nhâm chọn `GPU P100` (Không dùng CPU chậm như rùa bò nha!). Đồng thời mở công tắc `Internet` qua chữ **On**.
3. **Nén Data vào Não Kaggle:** Cột bên phải, chọn mục **Input -> Add Data -> Upload**. Bơm luồng file `.zip` vừa nãy lên (Kaggle sẽ khôn ngoan tự động giải nén 3 file nát bét đó ra cho mình luôn!).
4. **Copy Code & Chạy Thôi:** Dán 1 cục kịch bản sau vào ô màu xám của Kaggle và ấn nút `RUN (Tam Giác)`:

```bash
# 1. Tải mớ code lõi AI của nhà về
!git clone <Link_Github_Dự_Án_Của_Bạn> 
%cd ptitube/recommendation/

# 2. Tạo kho bãi đón hàng 
!mkdir -p data_raw/
!mkdir -p data_processed/

# 3. Lót tấm dữ liệu (Đổi tên My-Zip-File thành tên Thư mục bạn khai báo trên Kaggle)
!cp /kaggle/input/My-Zip-File/*.csv data_raw/

# 4. Ép 3 file rời rạc thành dạng Sóng Não Ma Trận Tensor (.npy)
!python data_process.py 

# 5. Khởi động Lò Bát Quái - Bắt đầu Train 
!python train.py --train_data data_processed/train_kauiRec.npy --test_data data_processed/test_kauiRec.npy --log_dir checkpoints/ --use_curriculum_learning --curriculum_learning_type exp
```

---

## 🎁 BƯỚC 4: THU HOẠCH QUẢ NGỌT & ĐÓNG DẤU CHẠY THỰC TẾ

Khi vòng quay màn hình báo Complete (Nó sẽ đếm sừng sững vòng lặp Epoch 1... Epoch 20). 

1. Mở Panel bên phải của Kaggle, mục **Output** `/kaggle/working/checkpoints/`.
2. Sẽ có 1 file sinh ra tên là `best_model.pth`. Nhấp vào mục ba chấm `...` và bấm **Download**. 
3. Kéo đè file `best_model.pth` nóng hổi này về ghi đè đúng vào thư mục `e:\android_project\ptitube\recommendation\checkpoints\` trên chiếc laptop của bạn.
4. XONG! Chạy lại `docker compose up -d` ➡️ Từ giây phút thuật toán Ptitube đã cực kỳ thông thái so với 24 tiếng trước đó!
