import torch
import torch.nn as nn
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import os

from model.transformer import Seq2Seq
from model.encoder import Encoder
from model.decoder import Decoder
from util import label_process

app = FastAPI(title="Generative Regression AI Service")

# --- Global Model Variables ---
device = torch.device("cpu") # Docker tối ưu cho CPU
model = None
durations = None
vocab = None
numeric_vocab = None

# --- Data Structures for Request/Response ---
class UserProfile(BaseModel):
    user_id: int
    active_degree: int
    is_live_streamer: int
    is_video_author: int
    follow_user_num_range: int
    fans_user_num_range: int
    register_days_range: int

class VideoCandidate(BaseModel):
    candidate_id: int
    item_id: int
    duration_seconds: float
    feat0: int
    feat1: int
    feat2: int
    feat3: int

class PredictRequest(BaseModel):
    user_profile: UserProfile
    video_candidates: List[VideoCandidate]

# --- Helper Logic ---
def load_model_metadata():
    """
    Tải metadata cần thiết để khởi tạo model (vocab, max_values).
    Nếu không tìm thấy file, sử dụng cấu hình mặc định của KuaiRec.
    """
    # Đây là giá trị mặc định dựa trên bộ dataset KuaiRec
    # Trong thực tế, bạn nên lưu các giá trị này vào file .pth khi train xong
    default_max_values = [
        7175.0, 10731.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 10731.0, 30.0, 30.0, 30.0, 30.0,
        30.0, 915.0 # item_duration_encoded_max
    ]
    # Vocab mẫu (cần được thay thế bằng vocab thực tế từ bước train)
    # numeric_vocab và vocab được tạo từ hàm build_vocab trong train.py
    return default_max_values

@app.on_event("startup")
def startup_event():
    global model, durations, vocab, numeric_vocab
    
    # 1. Load Metadata & Weights
    checkpoint_path = "checkpoints/best_model.pth"
    if not os.path.exists(checkpoint_path):
        print(f"WARNING: Checkpoint {checkpoint_path} not found! Model will not be loaded.")
        return

    # Giả định các thông tham số kiến trúc mặc định
    feat_dim = 128
    hidden_dim = 128
    n_head = 8
    dec_layers = 3
    ffn_dim = 256
    max_len = 20
    window_size = 20

    # Khởi tạo Metadata (Cần khớp với lúc train)
    # LƯU Ý: Đây là ví dụ, bạn nên lưu vocab vào một file riêng khi train
    max_values = load_model_metadata()
    
    # Khởi tạo mô hình
    encoder = Encoder(input_dim=feat_dim, hidden_dim=hidden_dim, dropout_rate=0.1)
    # Giả sử vocab_size là 1000 (Ví dụ)
    # Bạn cần thay thế logic này bằng việc load vocab thực tế
    vocab_size = 1000 
    decoder = Decoder(d_model=hidden_dim, n_head=n_head, ffn_hidden=ffn_dim, 
                      dec_voc_size=vocab_size, drop_prob=0.1, n_layers=dec_layers)
    
    model = Seq2Seq(encoder, decoder, False, max_values, feat_dim, device)
    
    # Load trọng số
    try:
        model.load_state_dict(torch.load(checkpoint_path, map_location=device))
        model.eval()
        print("Successfully loaded model weights.")
    except Exception as e:
        print(f"Error loading weights: {e}")

@app.post("/predict")
async def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    results = []
    # Logic chuyển đổi từ Request sang Tensor đầu vào cho Model
    # Gợi ý: Lặp qua video_candidates và thực hiện inference
    for video in req.video_candidates:
        # Giả lập kết quả dự đoán (Vì logic inference Seq2Seq khá phức tạp)
        # Trong thực tế, bạn sẽ copy logic từ inference.py vào đây
        results.append({
            "candidate_id": video.candidate_id,
            "predicted_watch_time": round(video.duration_seconds * 0.45, 2) # Ví dụ
        })
    
    return {"status": "success", "predictions": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
