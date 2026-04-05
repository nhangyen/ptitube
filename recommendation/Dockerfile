# Sử dụng Python 3.10 slim để giảm dung lượng ảnh
FROM python:3.10-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Cài đặt các thư viện cần thiết thay vì toàn bộ repo
# Sử dụng inference_requirements.txt đã tối ưu cho CPU
COPY inference_requirements.txt .
RUN pip install --no-cache-dir -r inference_requirements.txt

# Sao chép mã nguồn mô hình và các tệp phụ trợ
COPY model/ ./model/
COPY util.py .
COPY inference.py .
# Lưu ý: app.py sẽ được tạo sau
COPY app.py .

# Tạo thư mục cho trọng số mô hình
# Khi chạy docker, bạn sẽ gắn (mount) file .pth vào đây
RUN mkdir -p checkpoints

# Mở cổng 8000 cho FastAPI
EXPOSE 8000

# Chạy server FastAPI với uvicorn
# --workers 4 giúp xử lý song song nhiều request
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
