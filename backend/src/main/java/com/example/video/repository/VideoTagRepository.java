package com.example.video.repository;

import com.example.video.model.VideoTag;
import com.example.video.model.VideoTagId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Repository truy vấn bảng {@code video_tags}.
 * Khóa chính composite {@code (videoId, tagId)} được khai báo qua {@link VideoTagId}.
 * Hỗ trợ pipeline hashtag (gán tag, tìm tag theo video/category), trang Discover,
 * và trang Hashtag Detail với phân trang native SQL.
 */
public interface VideoTagRepository extends JpaRepository<VideoTag, VideoTagId> {
    /** Lấy tất cả tag của một video. */
    List<VideoTag> findByVideoId(UUID videoId);

    /** Lấy tất cả video gắn một tag cụ thể. */
    List<VideoTag> findByTagId(UUID tagId);

    /** Lấy tag của video theo category (ví dụ: chỉ lấy hashtag). */
    List<VideoTag> findByVideoIdAndTag_Category(UUID videoId, String category);

    /** Kiểm tra video đã được gán tag chưa (tránh gán trùng). */
    boolean existsByVideoIdAndTagId(UUID videoId, UUID tagId);

    /** Xóa toàn bộ tag của video (dùng khi xóa video hoặc cập nhật lại tag). */
    void deleteByVideoId(UUID videoId);

    /**
     * Batch load tag theo category cho nhiều video cùng lúc, eager-load tag entity.
     * Dùng để render hashtag label trên feed mà không gây N+1.
     */
    @Query("""
            SELECT vt
            FROM VideoTag vt
            JOIN FETCH vt.tag t
            WHERE vt.videoId IN :videoIds
              AND LOWER(COALESCE(t.category, '')) = LOWER(:category)
            """)
    List<VideoTag> findByVideoIdInAndTagCategory(@Param("videoIds") Collection<UUID> videoIds,
                                                 @Param("category") String category);

    /**
     * Batch count số video distinct theo từng tag — trả về {@code Object[]}: {@code [tagId, count]}.
     * Dùng để điền videoCount vào response trang Discover mà không cần N+1.
     */
    @Query("""
            SELECT vt.tagId, COUNT(DISTINCT vt.videoId)
            FROM VideoTag vt
            WHERE vt.tagId IN :tagIds
            GROUP BY vt.tagId
            """)
    List<Object[]> countDistinctVideoIdsByTagIds(@Param("tagIds") Collection<UUID> tagIds);

    /**
     * Lấy top N hashtag theo số video active nhiều nhất trong một category.
     * Native SQL để GROUP BY và ORDER BY trực tiếp trên số lượng.
     * Trả về {@code Object[]}: {@code [tagId, tagName, videoCount]}.
     */
    @Query(value = """
            SELECT t.id, t.name, COUNT(DISTINCT vt.video_id) AS video_count
            FROM video_tags vt
            JOIN tags t ON t.id = vt.tag_id
            JOIN videos v ON v.id = vt.video_id
            WHERE LOWER(COALESCE(t.category, '')) = LOWER(:category)
              AND v.status = :status
            GROUP BY t.id, t.name
            ORDER BY video_count DESC, t.name ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findTopTagCountsByCategoryAndStatus(@Param("category") String category,
                                                       @Param("status") String status,
                                                       @Param("limit") int limit);

    /**
     * Lấy danh sách videoId active có gắn tag, phân trang bằng LIMIT/OFFSET.
     * Dùng cho trang Hashtag Detail để lazy-load danh sách video theo tag.
     */
    @Query(value = """
            SELECT v.id
            FROM video_tags vt
            JOIN videos v ON v.id = vt.video_id
            WHERE vt.tag_id = :tagId
              AND v.status = :status
            ORDER BY v.created_at DESC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<UUID> findActiveVideoIdsByTagId(@Param("tagId") UUID tagId,
                                         @Param("status") String status,
                                         @Param("limit") int limit,
                                         @Param("offset") int offset);

    /** Đếm tổng video active của một tag — dùng tính tổng trang cho Hashtag Detail. */
    @Query(value = """
            SELECT COUNT(DISTINCT vt.video_id)
            FROM video_tags vt
            JOIN videos v ON v.id = vt.video_id
            WHERE vt.tag_id = :tagId
              AND v.status = :status
            """, nativeQuery = true)
    long countDistinctActiveVideoIdsByTagId(@Param("tagId") UUID tagId, @Param("status") String status);
}
