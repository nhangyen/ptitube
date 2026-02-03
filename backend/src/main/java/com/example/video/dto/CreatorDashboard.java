package com.example.video.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
public class CreatorDashboard {
    private long totalViews;
    private long totalLikes;
    private long totalComments;
    private long totalShares;
    private long totalVideos;
    private long followerCount;
    private double engagementRate; // (likes + comments) / views * 100
    private List<VideoPerformance> topVideos;
    private List<DailyStats> viewsOverTime;

    @Data
    public static class VideoPerformance {
        private String videoId;
        private String title;
        private long views;
        private long likes;
        private long comments;
        private double engagementRate;
    }

    @Data
    public static class DailyStats {
        private LocalDate date;
        private long views;
        private long likes;
    }
}
