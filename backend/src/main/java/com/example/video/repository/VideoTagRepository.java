package com.example.video.repository;

import com.example.video.model.VideoTag;
import com.example.video.model.VideoTagId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface VideoTagRepository extends JpaRepository<VideoTag, VideoTagId> {
    List<VideoTag> findByVideoId(UUID videoId);
    List<VideoTag> findByTagId(UUID tagId);
    List<VideoTag> findByVideoIdAndTag_Category(UUID videoId, String category);
    boolean existsByVideoIdAndTagId(UUID videoId, UUID tagId);
    void deleteByVideoId(UUID videoId);

    @Query("""
            SELECT vt
            FROM VideoTag vt
            JOIN FETCH vt.tag t
            WHERE vt.videoId IN :videoIds
              AND LOWER(COALESCE(t.category, '')) = LOWER(:category)
            """)
    List<VideoTag> findByVideoIdInAndTagCategory(@Param("videoIds") Collection<UUID> videoIds,
                                                 @Param("category") String category);

    @Query("""
            SELECT vt.tagId, COUNT(DISTINCT vt.videoId)
            FROM VideoTag vt
            WHERE vt.tagId IN :tagIds
            GROUP BY vt.tagId
            """)
    List<Object[]> countDistinctVideoIdsByTagIds(@Param("tagIds") Collection<UUID> tagIds);

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

    @Query(value = """
            SELECT COUNT(DISTINCT vt.video_id)
            FROM video_tags vt
            JOIN videos v ON v.id = vt.video_id
            WHERE vt.tag_id = :tagId
              AND v.status = :status
            """, nativeQuery = true)
    long countDistinctActiveVideoIdsByTagId(@Param("tagId") UUID tagId, @Param("status") String status);
}
