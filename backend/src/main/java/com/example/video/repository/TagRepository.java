package com.example.video.repository;

import com.example.video.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository truy vấn bảng {@code tags}.
 * Tag được tổ chức theo {@code category} (ví dụ: "hashtag", "topic") và lưu dạng lowercase unique.
 * Hỗ trợ soft-delete qua trường {@code isActive} — tag không hoạt động bị ẩn khỏi gợi ý.
 */
public interface TagRepository extends JpaRepository<Tag, UUID> {
    /** Lấy tất cả tag đang hoạt động (dùng khi liệt kê tag cho UI). */
    List<Tag> findByIsActiveTrue();

    /** Tìm tag theo tên không phân biệt hoa thường — dùng khi find-or-create trong pipeline hashtag. */
    Optional<Tag> findByNameIgnoreCase(String name);

    /** Lấy toàn bộ tag theo category (ví dụ: tất cả hashtag). */
    List<Tag> findByCategory(String category);

    /** Gợi ý tối đa 10 tag theo category và tên gần đúng, sắp xếp A-Z (dùng cho autocomplete). */
    List<Tag> findTop10ByCategoryAndNameContainingIgnoreCaseOrderByNameAsc(String category, String name);
}
