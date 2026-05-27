package com.example.video.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Response cho trang Creator Dashboard — tổng hợp hiệu suất kênh của creator.
 *
 * <p>Bao gồm:
 * <ul>
 *   <li>Các chỉ số tổng hợp: views, likes, comments, shares, videos, followers.</li>
 *   <li>{@code engagementRate} = (likes + comments) / views × 100 — tỉ lệ tương tác.</li>
 *   <li>{@code topVideos} — top video theo lượt xem hoặc tương tác.</li>
 *   <li>{@code viewsOverTime} — lịch sử views/likes theo ngày để vẽ biểu đồ.</li>
 * </ul>
 */
@Data
public class CreatorDashboard {
    private long totalViews;
    private long totalLikes;
    private long totalComments;
    private long totalShares;
    private long totalVideos;
    private long followerCount;
    /** Tỉ lệ tương tác: (likes + comments) / views × 100. */
    private double engagementRate;
    private List<VideoPerformance> topVideos;
    /** Dữ liệu views/likes theo từng ngày để hiển thị biểu đồ đường. */
    private List<DailyStats> viewsOverTime;

    /** Hiệu suất từng video trong danh sách top video của creator. */
    @Data
    public static class VideoPerformance {
        private String videoId;
        private String title;
        private long views;
        private long likes;
        private long comments;
        private double engagementRate;
    }

    /** Thống kê views và likes theo ngày để render biểu đồ thời gian. */
    @Data
    public static class DailyStats {
        private LocalDate date;
        private long views;
        private long likes;
    }
}
