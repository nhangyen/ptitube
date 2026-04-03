package com.example.video.service;

import com.example.video.dto.CreatorDashboard;
import com.example.video.dto.UpdateProfileRequest;
import com.example.video.dto.UserProfile;
import com.example.video.dto.VideoFeedItem;
import com.example.video.model.*;
import com.example.video.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminService {

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private VideoStatsRepository videoStatsRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FollowRepository followRepository;

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private RecommendationService recommendationService;

    // ==================== CONTENT MODERATION ====================

    public List<Report> getOpenReports() {
        return reportRepository.findByStatus("open");
    }

    public List<Report> getAllReports() {
        return reportRepository.findAll();
    }

    @Transactional
    public Report createReport(UUID reporterId, UUID videoId, String reason) {
        if (reportRepository.existsByReporterIdAndVideoId(reporterId, videoId)) {
            throw new RuntimeException("You have already reported this video");
        }

        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));

        Report report = new Report();
        report.setReporter(reporter);
        report.setVideo(video);
        report.setReason(reason);
        report.setStatus("open");

        return reportRepository.save(report);
    }

    @Transactional
    public void resolveReport(UUID reportId, String action) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));

        switch (action.toLowerCase()) {
            case "dismiss":
                report.setStatus("dismissed");
                break;
            case "hide":
                report.setStatus("resolved");
                hideVideo(report.getVideo().getId());
                break;
            case "ban":
                report.setStatus("resolved");
                banUser(report.getVideo().getUser().getId());
                break;
            default:
                throw new RuntimeException("Invalid action: " + action);
        }

        reportRepository.save(report);
    }

    @Transactional
    public void hideVideo(UUID videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));
        video.setStatus(VideoStatus.banned);
        videoRepository.save(video);
    }

    @Transactional
    public void unhideVideo(UUID videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));
        video.setStatus(VideoStatus.active);
        videoRepository.save(video);
    }

    @Transactional
    public void banUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Set all user's videos to banned
        List<Video> userVideos = videoRepository.findByUserId(userId);
        
        for (Video video : userVideos) {
            video.setStatus(VideoStatus.banned);
            videoRepository.save(video);
        }

        // Could also add a 'banned' flag to user if needed
    }

    // ==================== CREATOR DASHBOARD ====================

    public CreatorDashboard getCreatorDashboard(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Video> userVideos = videoRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, VideoStatus.active);

        CreatorDashboard dashboard = new CreatorDashboard();
        dashboard.setTotalVideos(userVideos.size());
        dashboard.setFollowerCount(followRepository.countByFollowingId(userId));

        // Calculate totals
        long totalViews = 0;
        long totalLikes = 0;
        long totalComments = 0;
        long totalShares = 0;

        java.util.Map<UUID, VideoStats> statsByVideoId = videoStatsRepository.findByVideoIdIn(
                        userVideos.stream().map(Video::getId).collect(Collectors.toList()))
                .stream()
                .collect(Collectors.toMap(VideoStats::getVideoId, value -> value));

        List<CreatorDashboard.VideoPerformance> performances = new java.util.ArrayList<>();

        for (Video video : userVideos) {
            VideoStats stats = statsByVideoId.get(video.getId());
            
            if (stats != null) {
                long views = stats.getViewCount() != null ? stats.getViewCount() : 0;
                long likes = stats.getLikeCount() != null ? stats.getLikeCount() : 0;
                long comments = stats.getCommentCount() != null ? stats.getCommentCount() : 0;
                long shares = stats.getShareCount() != null ? stats.getShareCount() : 0;

                totalViews += views;
                totalLikes += likes;
                totalComments += comments;
                totalShares += shares;

                CreatorDashboard.VideoPerformance perf = new CreatorDashboard.VideoPerformance();
                perf.setVideoId(video.getId().toString());
                perf.setTitle(video.getTitle());
                perf.setViews(views);
                perf.setLikes(likes);
                perf.setComments(comments);
                perf.setEngagementRate(views > 0 ? (double)(likes + comments) / views * 100 : 0);
                performances.add(perf);
            }
        }

        dashboard.setTotalViews(totalViews);
        dashboard.setTotalLikes(totalLikes);
        dashboard.setTotalComments(totalComments);
        dashboard.setTotalShares(totalShares);
        dashboard.setEngagementRate(totalViews > 0 ? (double)(totalLikes + totalComments) / totalViews * 100 : 0);

        // Sort by views and get top 10
        performances.sort((a, b) -> Long.compare(b.getViews(), a.getViews()));
        dashboard.setTopVideos(performances.stream().limit(10).collect(Collectors.toList()));

        return dashboard;
    }

    // ==================== USER PROFILE ====================

    public UserProfile getUserProfile(UUID userId, UUID currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserProfile profile = new UserProfile();
        profile.setId(user.getId());
        profile.setUsername(user.getUsername());
        profile.setEmail(currentUserId != null && currentUserId.equals(userId) ? user.getEmail() : null);
        profile.setAvatarUrl(user.getAvatarUrl());
        profile.setBio(user.getBio());
        profile.setVerified(user.isVerified());
        profile.setCurrentUser(currentUserId != null && currentUserId.equals(userId));
        profile.setJoinedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        profile.setFollowerCount(followRepository.countByFollowingId(userId));
        profile.setFollowingCount(followRepository.countByFollowerId(userId));

        List<Video> activeVideos = videoRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, VideoStatus.active);
        long videoCount = activeVideos.size();
        profile.setVideoCount(videoCount);

        long totalLikes = activeVideos.isEmpty()
                ? 0
                : videoStatsRepository.sumLikeCountByVideoIds(
                        activeVideos.stream().map(Video::getId).collect(Collectors.toList()));
        profile.setTotalLikes(totalLikes);

        if (currentUserId != null && !currentUserId.equals(userId)) {
            profile.setFollowedByCurrentUser(followRepository.existsByFollowerIdAndFollowingId(currentUserId, userId));
        }

        return profile;
    }

    public List<VideoFeedItem> getUserVideos(UUID userId, UUID currentUserId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return recommendationService.toFeedItems(
                videoRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, VideoStatus.active),
                currentUserId
        );
    }

    @Transactional
    public UserProfile updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getUsername() != null && !request.getUsername().isBlank()
                && !request.getUsername().equalsIgnoreCase(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new RuntimeException("Username is already taken");
            }
            user.setUsername(request.getUsername().trim());
        }

        if (request.getBio() != null) {
            user.setBio(request.getBio().trim());
        }

        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }

        userRepository.save(user);
        return getUserProfile(userId, userId);
    }
}
