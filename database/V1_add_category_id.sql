-- Thêm cột category_id vào bảng videos nếu chưa có
ALTER TABLE videos ADD COLUMN IF NOT EXISTS category_id INTEGER DEFAULT 0;
