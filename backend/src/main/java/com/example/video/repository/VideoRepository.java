package com.example.video.repository;

import com.example.video.model.Video;
import com.example.video.model.VideoStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface VideoRepository extends JpaRepository<Video, UUID> {
    List<Video> findByUserId(UUID userId);
    List<Video> findByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, VideoStatus status);
    List<Video> findByStatusOrderByCreatedAtDesc(VideoStatus status);
    long countByUserId(UUID userId);
    long countByUserIdAndStatus(UUID userId, VideoStatus status);

    @EntityGraph(attributePaths = "user")
    @Query("SELECT v FROM Video v WHERE v.id IN :ids")
    List<Video> findAllWithUserByIdIn(@Param("ids") Collection<UUID> ids);

    @EntityGraph(attributePaths = "user")
    @Query("""
            SELECT v
            FROM Video v
            WHERE v.status = :status
            ORDER BY v.createdAt DESC
            """)
    List<Video> findByStatusWithUserOrderByCreatedAtDesc(@Param("status") VideoStatus status, Pageable pageable);

    @Query("""
            SELECT v.user.id, COUNT(v)
            FROM Video v
            WHERE v.user.id IN :userIds
              AND v.status = :status
            GROUP BY v.user.id
            """)
    List<Object[]> countByUserIdsAndStatus(@Param("userIds") Collection<UUID> userIds, @Param("status") VideoStatus status);

    @Query(value = """
            SELECT v.id
            FROM videos v
            LEFT JOIN video_stats vs ON vs.video_id = v.id
            WHERE v.status = 'active'
            ORDER BY (
                COALESCE(vs.view_count, 0) * 1.0
                + COALESCE(vs.like_count, 0) * 3.0
                + COALESCE(vs.share_count, 0) * 5.0
                - (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v.created_at)) / 3600.0) * 0.1
                + RANDOM() * (
                    (
                        COALESCE(vs.view_count, 0) * 1.0
                        + COALESCE(vs.like_count, 0) * 3.0
                        + COALESCE(vs.share_count, 0) * 5.0
                    ) * 0.2 + 10.0
                )
            ) DESC,
            v.created_at DESC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<UUID> findRecommendedVideoIds(@Param("limit") int limit, @Param("offset") int offset);

    @Query(value = """
            SELECT *
            FROM videos v
            WHERE v.status = 'active'
              AND (
                v.search_vector @@ websearch_to_tsquery('english', :query)
                OR EXISTS (
                    SELECT 1
                    FROM video_tags vt
                    JOIN tags t ON t.id = vt.tag_id
                    WHERE vt.video_id = v.id
                      AND t.category = 'hashtag'
                      AND LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%'))
                )
              )
            ORDER BY ts_rank(v.search_vector, websearch_to_tsquery('english', :query)) DESC NULLS LAST,
                     v.created_at DESC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<Video> searchActiveVideos(@Param("query") String query, @Param("limit") int limit, @Param("offset") int offset);

    @Query("""
            SELECT v
            FROM Video v
            WHERE v.status = :status
              AND (
                LOWER(v.title) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(COALESCE(v.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
              )
            ORDER BY v.createdAt DESC
            """)
    List<Video> searchActiveVideosFallback(@Param("query") String query, @Param("status") VideoStatus status);

    // ==================== AI FEED QUERIES ====================

    /**
     * Random N active videos that user has NOT watched yet.
     */
    @Query(value = """
            SELECT v.id FROM videos v
            WHERE v.status = 'active'
              AND v.id NOT IN (SELECT vv.video_id FROM video_views vv WHERE vv.user_id = :userId)
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<UUID> findRandomUnwatchedVideoIds(@Param("userId") UUID userId, @Param("limit") int limit);

    /**
     * Random N active videos from users that the given user follows.
     */
    @Query(value = """
            SELECT v.id FROM videos v
            WHERE v.status = 'active'
              AND v.user_id IN (SELECT f.following_id FROM follows f WHERE f.follower_id = :userId)
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<UUID> findRandomFollowedVideoIds(@Param("userId") UUID userId, @Param("limit") int limit);

    /**
     * Random N active videos excluding a set of IDs.
     */
    @Query(value = """
            SELECT v.id FROM videos v
            WHERE v.status = 'active'
              AND v.id NOT IN (:excludeIds)
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<UUID> findRandomVideoIdsExcluding(@Param("excludeIds") Collection<UUID> excludeIds, @Param("limit") int limit);

    /**
     * Random N active videos (no filter).
     */
    @Query(value = """
            SELECT v.id FROM videos v
            WHERE v.status = 'active'
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<UUID> findRandomActiveVideoIds(@Param("limit") int limit);
}
