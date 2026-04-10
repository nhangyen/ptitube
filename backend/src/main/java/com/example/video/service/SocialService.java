package com.example.video.service;

import com.example.video.dto.CommentRequest;
import com.example.video.dto.CommentResponse;
import com.example.video.model.*;
import com.example.video.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SocialService {

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private FollowRepository followRepository;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private VideoStatsRepository videoStatsRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VideoViewRepository videoViewRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private VideoRepostRepository videoRepostRepository;

    @Autowired
    private InteractionLoggerService interactionLoggerService;

    // ==================== LIKE ====================

    @Transactional
    public boolean toggleLike(UUID userId, UUID videoId) {
        if (likeRepository.existsByUserIdAndVideoId(userId, videoId)) {
            likeRepository.deleteByUserIdAndVideoId(userId, videoId);
            return false; // Unliked
        } else {
            Like like = new Like();
            like.setUserId(userId);
            like.setVideoId(videoId);
            likeRepository.save(like);

            videoRepository.findById(videoId)
                    .map(Video::getUser)
                    .map(User::getId)
                    .ifPresent(ownerId -> notificationService.createLikeNotification(userId, ownerId, videoId));
            return true; // Liked
        }
    }

    public boolean isLiked(UUID userId, UUID videoId) {
        return likeRepository.existsByUserIdAndVideoId(userId, videoId);
    }

    // ==================== COMMENT ====================

    @Transactional
    public CommentResponse addComment(UUID userId, CommentRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Video video = videoRepository.findById(request.getVideoId())
                .orElseThrow(() -> new RuntimeException("Video not found"));

        Comment comment = new Comment();
        comment.setUser(user);
        comment.setVideo(video);
        comment.setContent(request.getContent());

        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
            comment.setParent(parent);
        }

        comment.setCreatedAt(java.time.LocalDateTime.now());
        Comment saved = commentRepository.save(comment);
        updateCommentCount(request.getVideoId(), 1);

        notificationService.createCommentNotification(userId, video.getUser().getId(), video.getId(), saved.getId());
        if (saved.getParent() != null) {
            notificationService.createReplyNotification(
                    userId,
                    saved.getParent().getUser().getId(),
                    video.getId(),
                    saved.getId());
        }

        return convertToResponse(saved);
    }

    public List<CommentResponse> getComments(UUID videoId, boolean nested) {
        if (nested) {
            List<Comment> topLevel = commentRepository.findTopLevelComments(videoId);
            return topLevel.stream()
                    .map(this::convertToResponseWithReplies)
                    .collect(Collectors.toList());
        } else {
            return commentRepository.findByVideoIdOrderByCreatedAtDesc(videoId).stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
        }
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUser().getId().equals(userId)) {
            throw new RuntimeException("Not authorized to delete this comment");
        }

        UUID videoId = comment.getVideo().getId();
        int deletedCount = countCommentTree(comment.getId());
        commentRepository.delete(comment);
        updateCommentCount(videoId, -deletedCount);
    }

    private void updateCommentCount(UUID videoId, int delta) {
        videoStatsRepository.findByVideoId(videoId).ifPresent(stats -> {
            stats.setCommentCount(Math.max(0, stats.getCommentCount() + delta));
            videoStatsRepository.save(stats);
        });
    }

    private CommentResponse convertToResponse(Comment comment) {
        CommentResponse response = new CommentResponse();
        response.setId(comment.getId());
        response.setContent(comment.getContent());
        response.setCreatedAt(comment.getCreatedAt() != null
                ? comment.getCreatedAt().toString()
                : java.time.LocalDateTime.now().toString());

        CommentResponse.UserSummary userSummary = new CommentResponse.UserSummary();
        userSummary.setId(comment.getUser().getId());
        userSummary.setUsername(comment.getUser().getUsername());
        userSummary.setAvatarUrl(comment.getUser().getAvatarUrl());
        response.setUser(userSummary);

        return response;
    }

    private CommentResponse convertToResponseWithReplies(Comment comment) {
        CommentResponse response = convertToResponse(comment);
        List<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtAsc(comment.getId());
        if (!replies.isEmpty()) {
            response.setReplies(replies.stream()
                    .map(this::convertToResponseWithReplies)
                    .collect(Collectors.toList()));
        }
        return response;
    }

    private int countCommentTree(UUID commentId) {
        List<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtAsc(commentId);
        int total = 1;
        for (Comment reply : replies) {
            total += countCommentTree(reply.getId());
        }
        return total;
    }

    // ==================== FOLLOW ====================

    @Transactional
    public boolean toggleFollow(UUID followerId, UUID followingId) {
        if (followerId.equals(followingId)) {
            throw new RuntimeException("Cannot follow yourself");
        }

        if (followRepository.existsByFollowerIdAndFollowingId(followerId, followingId)) {
            followRepository.deleteByFollowerIdAndFollowingId(followerId, followingId);
            return false; // Unfollowed
        } else {
            Follow follow = new Follow();
            follow.setFollowerId(followerId);
            follow.setFollowingId(followingId);
            followRepository.save(follow);
            notificationService.createFollowNotification(followerId, followingId);
            return true; // Followed
        }
    }

    public boolean isFollowing(UUID followerId, UUID followingId) {
        return followRepository.existsByFollowerIdAndFollowingId(followerId, followingId);
    }

    public long getFollowerCount(UUID userId) {
        return followRepository.countByFollowingId(userId);
    }

    public long getFollowingCount(UUID userId) {
        return followRepository.countByFollowerId(userId);
    }

    // ==================== SHARE ====================

    @Transactional
    public String generateShareLink(UUID videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));

        // Increment share count
        videoStatsRepository.findByVideoId(videoId).ifPresent(stats -> {
            stats.setShareCount(stats.getShareCount() + 1);
            videoStatsRepository.save(stats);
        });

        // Return deep link format
        return "videoapp://video/" + videoId;
    }

    @Transactional
    public long createRepost(UUID userId, UUID videoId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));

        if (video.getStatus() != VideoStatus.active) {
            throw new RuntimeException("Only active videos can be reposted");
        }

        if (!videoRepostRepository.existsByUserIdAndVideoId(userId, videoId)) {
            VideoRepost repost = new VideoRepost();
            repost.setUser(user);
            repost.setVideo(video);
            videoRepostRepository.save(repost);
        }

        return getRepostCount(videoId);
    }

    @Transactional
    public long removeRepost(UUID userId, UUID videoId) {
        videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));
        if (videoRepostRepository.existsByUserIdAndVideoId(userId, videoId)) {
            videoRepostRepository.deleteByUserIdAndVideoId(userId, videoId);
        }
        return getRepostCount(videoId);
    }

    public boolean hasReposted(UUID userId, UUID videoId) {
        return videoRepostRepository.existsByUserIdAndVideoId(userId, videoId);
    }

    public long getRepostCount(UUID videoId) {
        return videoRepostRepository.countByVideoIds(List.of(videoId)).stream()
                .findFirst()
                .map(row -> ((Number) row[1]).longValue())
                .orElse(0L);
    }

    // ==================== VIEW ====================

    @Transactional
    public void recordView(UUID videoId, UUID userId, float watchDuration, boolean completed) {
        Video video = videoRepository.findById(videoId).orElse(null);
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        // 1. Log view to video_views table
        if (user != null && video != null) {
            VideoView view = new VideoView();
            view.setUserId(user.getId());
            view.setVideoId(video.getId());
            view.setWatchDuration((int) watchDuration);
            view.setIsCompleted(completed);
            videoViewRepository.save(view);
        }

        // 2. Update views in Stats
        videoStatsRepository.findByVideoId(videoId).ifPresent(stats -> {
            stats.setViewCount(stats.getViewCount() + 1);
            videoStatsRepository.save(stats);
        });
        System.out.println("View recorded for video " + videoId + " by user " + userId+" video: "+video.getNumericId()+" user: "+user.getNumericId());
        // 3. Log to CSV for AI training if we have user and video info
        if (video != null && user != null && video.getNumericId() != null && user.getNumericId() != null) {
            float totalDuration = video.getDurationSeconds() != null ? video.getDurationSeconds() : 30.0f;
            if (totalDuration <= 0) totalDuration = 30.0f; // Prevent division by zero
            
            float watchRatio = watchDuration / totalDuration;
            long timestamp = System.currentTimeMillis() / 1000;

            interactionLoggerService.logInteraction(
                user.getNumericId(),
                video.getNumericId(),
                timestamp,
                totalDuration,
                watchRatio
            );
        }
    }
}
