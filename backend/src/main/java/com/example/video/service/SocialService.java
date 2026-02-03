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

    // ==================== LIKE ====================
    
    @Transactional
    public boolean toggleLike(UUID userId, UUID videoId) {
        if (likeRepository.existsByUserIdAndVideoId(userId, videoId)) {
            likeRepository.deleteByUserIdAndVideoId(userId, videoId);
            updateLikeCount(videoId, -1);
            return false; // Unliked
        } else {
            Like like = new Like();
            like.setUserId(userId);
            like.setVideoId(videoId);
            likeRepository.save(like);
            updateLikeCount(videoId, 1);
            return true; // Liked
        }
    }

    public boolean isLiked(UUID userId, UUID videoId) {
        return likeRepository.existsByUserIdAndVideoId(userId, videoId);
    }

    private void updateLikeCount(UUID videoId, int delta) {
        videoStatsRepository.findByVideoId(videoId).ifPresent(stats -> {
            stats.setLikeCount(Math.max(0, stats.getLikeCount() + delta));
            videoStatsRepository.save(stats);
        });
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
        commentRepository.delete(comment);
        updateCommentCount(videoId, -1);
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
        if (comment.getReplies() != null && !comment.getReplies().isEmpty()) {
            response.setReplies(comment.getReplies().stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList()));
        }
        return response;
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

    // ==================== VIEW ====================

    @Transactional
    public void recordView(UUID videoId, UUID userId, int watchDuration, boolean completed) {
        videoStatsRepository.findByVideoId(videoId).ifPresent(stats -> {
            stats.setViewCount(stats.getViewCount() + 1);
            videoStatsRepository.save(stats);
        });
    }
}
