package com.example.video.service;

import com.example.video.dto.CreatorDashboard;
import com.example.video.dto.UpdateProfileRequest;
import com.example.video.dto.UserCardResponse;
import com.example.video.dto.UserProfile;
import com.example.video.dto.VideoFeedItem;
import com.example.video.model.*;
import com.example.video.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service đa năng phục vụ quản lý báo cáo vi phạm, hồ sơ người dùng và dashboard creator.
 *
 * <p>Khi người dùng báo cáo video ({@link #createReport}), hệ thống tự động:
 * <ul>
 *   <li>Tạo bản ghi {@code ModerationQueue} mới với priority="high" nếu chưa có entry active.</li>
 *   <li>Hoặc leo thang (escalate) entry đang pending/in_review lên priority="high".</li>
 * </ul>
 *
 * <p>Dashboard creator ({@link #getCreatorDashboard}) tổng hợp view/like/comment/share
 * từ bảng {@code video_stats} cho tất cả video active của creator, tính engagement rate
 * và trả về top 10 video theo lượt xem.
 */
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

    @Autowired
    private VideoRepostRepository videoRepostRepository;

    @Autowired
    private ModerationQueueRepository moderationQueueRepository;

    // ==================== CONTENT MODERATION ====================

    /** Lấy tất cả báo cáo có trạng thái "open" (chưa xử lý). */
    public List<Report> getOpenReports() {
        return reportRepository.findByStatus("open");
    }

    /** Lấy tất cả báo cáo không phân biệt trạng thái. */
    public List<Report> getAllReports() {
        return reportRepository.findAll();
    }

    /**
     * Tạo báo cáo vi phạm và tự động cập nhật hàng chờ kiểm duyệt.
     *
     * <p>Nếu đã có entry pending/in_review → escalate priority lên "high".
     * Nếu chưa có entry active → tạo entry mới với priority="high" và
     * autoFlags = {@code {"source":"user_report"}}.
     *
     * @param reporterId ID người báo cáo
     * @param videoId    ID video bị báo cáo
     * @param reason     lý do báo cáo
     * @return Report entity vừa tạo
     * @throws RuntimeException nếu người dùng đã báo cáo video này trước đó
     */
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

        Report savedReport = reportRepository.save(report);

        // Re-queue or escalate in moderation queue
        List<ModerationQueue> existingEntries = moderationQueueRepository.findByVideoId(videoId);

        boolean hasActiveEntry = existingEntries.stream()
                .anyMatch(q -> "pending".equals(q.getStatus()) || "in_review".equals(q.getStatus()));

        if (hasActiveEntry) {
            // Escalate priority on active entries
            existingEntries.stream()
                    .filter(q -> "pending".equals(q.getStatus()) || "in_review".equals(q.getStatus()))
                    .forEach(q -> {
                        q.setPriority("high");
                        moderationQueueRepository.save(q);
                    });
        } else {
            // All entries are "reviewed" or none exist — create new entry
            ModerationQueue newEntry = new ModerationQueue();
            newEntry.setVideo(video);
            newEntry.setPriority("high");
            newEntry.setStatus("pending");
            newEntry.setAutoFlags("{\"source\":\"user_report\"}");
            moderationQueueRepository.save(newEntry);
        }

        return savedReport;
    }

    /**
     * Xử lý báo cáo với một trong ba hành động quản trị.
     *
     * @param reportId ID báo cáo cần xử lý
     * @param action   "dismiss" (bác bỏ), "hide" (ẩn video), "ban" (cấm user + ẩn tất cả video)
     * @throws RuntimeException nếu action không hợp lệ
     */
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

    /**
     * Ẩn video bằng cách chuyển trạng thái sang {@code banned}.
     * Video bị ẩn sẽ không còn xuất hiện trên feed.
     *
     * @param videoId ID video cần ẩn
     */
    @Transactional
    public void hideVideo(UUID videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));
        video.setStatus(VideoStatus.banned);
        videoRepository.save(video);
    }

    /**
     * Bỏ ẩn video bằng cách khôi phục trạng thái về {@code active}.
     *
     * @param videoId ID video cần bỏ ẩn
     */
    @Transactional
    public void unhideVideo(UUID videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));
        video.setStatus(VideoStatus.active);
        videoRepository.save(video);
    }

    /**
     * Cấm người dùng bằng cách chuyển toàn bộ video của họ sang {@code banned}.
     *
     * @param userId ID người dùng cần cấm
     */
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

    /**
     * Lấy thống kê tổng hợp của creator: view/like/comment/share, engagement rate
     * và top 10 video theo lượt xem.
     * <p>Engagement rate = (likes + comments) / views × 100 (%)
     *
     * @param userId ID creator
     * @return CreatorDashboard với các chỉ số tổng hợp và danh sách VideoPerformance
     */
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

    /**
     * Lấy hồ sơ người dùng. Email chỉ được trả về khi xem hồ sơ của chính mình.
     *
     * @param userId        ID người dùng cần xem hồ sơ
     * @param currentUserId ID người dùng hiện tại (có thể null)
     * @return UserProfile với thông tin public và follow status
     */
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
        long videoCount = activeVideos.size() + videoRepostRepository.countActiveByUserIdAndVideoStatus(userId, VideoStatus.active);
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

    /**
     * Lấy danh sách video và repost active của người dùng, kết hợp và sắp xếp theo thời gian.
     *
     * @param userId        ID người dùng cần lấy video
     * @param currentUserId ID người dùng hiện tại (dùng để kiểm tra like/follow status)
     * @return danh sách VideoFeedItem gộp cả video gốc và repost
     */
    public List<VideoFeedItem> getUserVideos(UUID userId, UUID currentUserId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return recommendationService.toProfileActivityItems(
                videoRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, VideoStatus.active),
                videoRepostRepository.findActiveByUserIdOrderByCreatedAtDesc(userId, VideoStatus.active),
                currentUserId
        );
    }

    /**
     * Lấy danh sách người theo dõi (followers) của người dùng, sắp xếp theo thời gian follow mới nhất.
     *
     * @param userId        ID người dùng cần xem followers
     * @param currentUserId ID người dùng hiện tại (dùng để kiểm tra trạng thái follow)
     * @return danh sách UserCardResponse với followerCount và isFollowedByCurrentUser
     */
    @Transactional(readOnly = true)
    public List<UserCardResponse> getFollowers(UUID userId, UUID currentUserId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<User> users = followRepository.findByFollowingIdOrderByCreatedAtDesc(userId).stream()
                .map(Follow::getFollower)
                .collect(Collectors.toList());

        return toUserCards(users, currentUserId);
    }

    /**
     * Lấy danh sách người dùng đang được follow (following) bởi người dùng.
     *
     * @param userId        ID người dùng cần xem danh sách following
     * @param currentUserId ID người dùng hiện tại
     * @return danh sách UserCardResponse
     */
    @Transactional(readOnly = true)
    public List<UserCardResponse> getFollowing(UUID userId, UUID currentUserId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<User> users = followRepository.findByFollowerIdOrderByCreatedAtDesc(userId).stream()
                .map(Follow::getFollowing)
                .collect(Collectors.toList());

        return toUserCards(users, currentUserId);
    }

    /**
     * Cập nhật hồ sơ người dùng. Chỉ cập nhật các field không null/blank.
     * Kiểm tra trùng username trước khi thay đổi.
     *
     * @param userId  ID người dùng
     * @param request thông tin cần cập nhật (username, bio, avatarUrl)
     * @return UserProfile sau khi cập nhật
     * @throws RuntimeException nếu username mới đã bị sử dụng
     */
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

    /**
     * Chuyển đổi danh sách User entity sang UserCardResponse, tối ưu bằng batch query
     * để lấy follower count và video count trong một lần truy vấn thay vì N+1.
     */
    private List<UserCardResponse> toUserCards(List<User> users, UUID currentUserId) {
        if (users.isEmpty()) {
            return List.of();
        }

        List<UUID> userIds = users.stream().map(User::getId).collect(Collectors.toList());

        Map<UUID, Long> followerCounts = followRepository.countFollowersByFollowingIds(userIds).stream()
                .collect(Collectors.toMap(
                        entry -> (UUID) entry[0],
                        entry -> (Long) entry[1]
                ));

        Map<UUID, Long> videoCounts = videoRepository.countByUserIdsAndStatus(userIds, VideoStatus.active).stream()
                .collect(Collectors.toMap(
                        entry -> (UUID) entry[0],
                        entry -> (Long) entry[1]
                ));

        Set<UUID> followedIds = currentUserId == null
                ? Set.of()
                : Set.copyOf(followRepository.findFollowingIdsByFollowerIdAndFollowingIdIn(currentUserId, userIds));

        return users.stream().map(user -> {
            UserCardResponse response = new UserCardResponse();
            response.setId(user.getId());
            response.setUsername(user.getUsername());
            response.setAvatarUrl(user.getAvatarUrl());
            response.setBio(user.getBio());
            response.setFollowerCount(followerCounts.getOrDefault(user.getId(), 0L));
            response.setVideoCount(videoCounts.getOrDefault(user.getId(), 0L));
            response.setFollowedByCurrentUser(currentUserId != null && followedIds.contains(user.getId()));
            return response;
        }).collect(Collectors.toList());
    }
}
