# Hướng dẫn Huấn luyện và Tích hợp Mô hình Generative Regression (GR) vào Hệ thống Backend

Tài liệu này cung cấp các bước chi tiết để bạn có thể tự tay huấn luyện (train) mô hình GR (dự báo thời gian xem) và cách đưa nó vào tích hợp trong hệ thống Backend (như Spring Boot/Node.js) của bạn.

---

## Giai đoạn 1: Chuẩn bị Môi trường trên Google Colab

Vì bạn sử dụng Google Colab để huấn luyện mô hình (giúp tận dụng GPU miễn phí), quy trình setup sẽ hơi khác một chút.

### 1. Khởi tạo sổ tay (Notebook) và kết nối GPU
1. Truy cập [Google Colab](https://colab.research.google.com/) và tạo một Notebook mới.
2. Ở thanh menu, chọn **Runtime > Change runtime type > Hardware accelerator** và chọn **T4 GPU** (hoặc cao hơn).
3. Mount Google Drive của bạn để lưu file sau khi train không bị mất:
```python
from google.colab import drive
drive.mount('/content/drive')
```

### 2. Clone mã nguồn và Cài đặt Thư viện
Tải Source code của project này vào Colab và tiến hành cài đặt thư viện cần thiết:
```python
!git clone <ĐƯỜNG_DẪN_GIT_CỦA_BẠN>  # Thay bằng link Github chứa repo này của bạn
%cd <TÊN_THƯ_MỤC_CHỨA_CODE>
!pip install torch numpy scikit-learn tqdm
```
*(Để phục vụ Backend API ở giai đoạn sau trên máy chủ của bạn, bạn vẫn cần nhớ cài thêm `fastapi` và `uvicorn` trên máy cá nhân/server).*

### 3. Chuẩn bị Dữ liệu Huấn Luyện
**Cách nhanh nhất:** Do bạn đã ở trên môi trường Cloud, bạn hãy tải 2 file `train_kauiRec.npy` và `test_kauiRec.npy` lên Google Drive của mình (Ví dụ lưu vào thư mục `My Drive/GR_Data/`).

Sau đó, copy chúng vào thư mục code đang làm việc trên Colab:
```python
!mkdir -p data/data_processed/
!cp "/content/drive/My Drive/GR_Data/train_kauiRec.npy" data/data_processed/
!cp "/content/drive/My Drive/GR_Data/test_kauiRec.npy" data/data_processed/
```
*(Hoặc bạn có thể tự chạy `!python data_process.py` nếu đã có file dữ liệu thô gốc ghép vào).*

---

## Giai đoạn 2: Huấn luyện Mô hình (Training) trên Colab

Mục đích của việc này tạo ra file "Checkpoint" - bộ não AI mà ta sẽ giữ lại và tải về máy chủ nội bộ.

### 1. Bắt đầu Train mô hình
Chạy Cell sau trong Google Colab. Lưu ý đã thêm dấu chấm than `!` ở đầu để chạy lệnh terminal:

```python
!python train.py \
    --train_data data/data_processed/train_kauiRec.npy \
    --test_data  data/data_processed/test_kauiRec.npy  \
    --log_dir    /content/drive/MyDrive/GR_Checkpoints/ \
    --batch_size 512 \
    --num_epochs 20
```
👉 *Quan trọng: Ở đây tham số `--log_dir` đã được truyền trực tiếp bằng đường dẫn Google Drive (`/content/drive/MyDrive/GR_Checkpoints/`). Việc này đảm bảo file trọng số AI (`.pth`) sinh ra tới đâu sẽ được upload thẳng về Drive của bạn tới đó, để tránh hiện tượng Colab reset bị mất hết dữ liệu.*

### 2. Sử dụng Curriculum Learning (Khuyên dùng)
Nếu muốn sử dụng tùy chọn học tăng cường từ dễ đến khó ở trên Colab:

```python
!python train.py \
    --train_data data/data_processed/train_kauiRec.npy \
    --test_data  data/data_processed/test_kauiRec.npy  \
    --log_dir    /content/drive/MyDrive/GR_Checkpoints/ \
    --use_curriculum_learning \
    --curriculum_learning_type exp
```
**Kết thúc giai đoạn này:** Bạn về lại khu vực `My Drive` trên Google Drive của bạn, mở thư mục `GR_Checkpoints`, bạn sẽ thấy file Model `.pth`. Hãy **Tải file AI này về máy chủ/máy tính của bạn** để chuẩn bị cho Giai đoạn 3 (Tích hợp Backend nội bộ bằng code Python và kết nối Spring Boot).

---

## Giai đoạn 3: Tích hợp vào Hệ thống Backend (Inference / Serving)

Bởi vì mã nguồn mô hình là **Python / PyTorch**, trong khi Backend web/app của bạn có thể là nền tảng khác (**Spring Boot, Node.js, Golang**). 

**Mô hình thiết kế tốt nhất:** Dựng một **AI Microservice** độc lập bằng Python sử dụng FastAPI. Backend chính (Spring Boot) sẽ gọi qua dịch vụ AI đó để lấy điểm "Dự đoán thời lượng xem".

### Bước 1: Trích xuất các tệp tin quan trọng
Tạo một thư mục mới cho tiểu dịch vụ AI (AI Microservice, ví dụ: `gr-inference-api`). Dịch vụ này chỉ chứa những file chạy (không chứa code huấn luyện để tối ưu dung lượng docker). Bạn cần copy:
1. Toàn bộ thư mục `model/` (để AI hiểu kiến trúc Transformer).
2. Thư mục `checkpoints/` (chứa file Model bạn vừa train xong).
3. File `inference.py` (Chứa hàm decode luồng đánh giá).

### Bước 2: Viết mã nguồn Web API (Sử dụng FastAPI)
Bạn tạo một file `app.py` với cấu trúc tương tự đoạn code sau nằm trong thư mục dịch vụ:

```python
from fastapi import FastAPI
from pydantic import BaseModel
import torch
import numpy as np

# Gọi các component mô hình (Bạn import theo kiến trúc model/transformer của dự án gốc)
# from model.transformer import GRModel 

app = FastAPI(title="Short Video Watch Time Predictor")

# Khởi tạo thiết bị (Dùng GPU nếu có, không thì CPU)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 1. LOAD MODEL (Chạy một lần duy nhất lúc API khởi động)
'''
model = GRModel(feat_dim=128, hidden_dim=128, n_head=8, dec_layers=3) # thông số setup giống mạng lúc nãy bạn train
model.load_state_dict(torch.load("checkpoints/xxx.pth", map_location=device))
model.eval()
'''

# 2. Định nghĩa Dữ liệu từ Backend (Ví dụ Spring) truyền sang
class RecRequest(BaseModel):
    user_features: list  # mảng các vector đặc trưng của Người dùng hiện tại
    video_features: list # mảng các vector đặc trưng của Video cần gợi ý

# 3. Tạo Endpoint dự đoán
@app.post("/predict")
def predict_watch_time(req: RecRequest):
    # Chuyển đổi mảng số của Backend sang định dạng mà PyTorch đọc được
    user_t = torch.FloatTensor(req.user_features).unsqueeze(0).to(device)
    item_t = torch.FloatTensor(req.video_features).unsqueeze(0).to(device)
    
    # Kết hợp đặc trưng user và item theo format của input (phụ thuộc vào `inference.py`)
    # inputs = torch.cat([user_t, item_t], dim=-1)
    
    # Suy luận (Inference)
    '''
    with torch.no_grad():
        # Code mẫu (Cần gọi logic hàm inference được định nghĩa trong dự án)
        # outputs = model(inputs) 
        # predicted_seconds = process_output(outputs) 
    '''
    
    # Trả JSON lại cho Backend
    return {
        "status": "success",
        "predicted_watch_time_seconds": 15.6 # Thay bằng kết quả tính toán thực
    }
```

### Bước 3: Khởi chạy AI Microservice
Chạy server API xử lý AI bằng `uvicorn`:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

### Bước 4: Kết nối với Hệ thống phân phối luồng đề xuất (Ví dụ: Qua Spring Boot)
Bây giờ, tại Backend Spring Boot chính của bạn, khi một người dùng cuộn app mở danh sách Video Ngắn:
1. **Lấy Tập 100 Video ngẫu nhiên** từ Database.
2. Trích xuất thuộc tính `user_features` của người đang vào app, và `video_features` của 100 cái video đó.
3. Call **HTTP POST** sang cổng `http://localhost:8000/predict` của AI Service với danh sách features ở trên.
4. Python API sẽ trả về dữ liệu (VD: Video A dự đoán được xem `5.2` giây, Video B dự đoán được xem `18.5` giây, Video C... ).
5. Spring Boot sẽ **Sắp xếp (Sort)** video theo thời gian xem từ cao xuống thấp và trả JSON API cuối cùng về cho màn hình điện thoại (Android/iOS).

---

## 💡 Lời khuyên nâng cao cho hệ thống thật (Production)
1. **Độ trễ hệ thống (Latency):** Việc suy luận bằng Seq2Seq Transformer khá nặng. Nếu app bạn có hàng vạn người truy cập, bạn nên Convert file mô hình `PyTorch` sang chuẩn `.ONNX` hoặc dùng giải pháp `TensorRT`. Tốc độ phản hồi sẽ x3 - x5 lần so với chạy code thuần.
2. **Feature Store:** Lấy trực tiếp feature thao tác thời gian thực là rất khó, nên dùng **Redis** để lưu đệm sẵn (Cache) các vector `user_features` và `video_features`. Spring Boot lúc quét ra chỉ cần bốc từ Redis rồi ném luôn qua cho AI.
