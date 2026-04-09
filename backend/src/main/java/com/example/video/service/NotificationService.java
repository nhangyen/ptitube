package com.example.video.service;

import com.example.video.dto.NotificationResponse;
import com.example.video.model.*;
import com.example.video.repository.CommentRepository;
import com.example.video.repository.NotificationRepository;
import com.example.video.repository.UserRepository;
import com.example.video.repository.VideoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Transactional
    public void createFollowNotification(UUID actorId, UUID recipientId) {
        createNotification(actorId, recipientId, null, null, NotificationType.follow);
    }

    @Transactional
    public void createLikeNotification(UUID actorId, UUID recipientId, UUID videoId) {
        createNotification(actorId, recipientId, videoId, null, NotificationType.like);
    }

    @Transactional
    public void createCommentNotification(UUID actorId, UUID recipientId, UUID videoId, UUID commentId) {
        createNotification(actorId, recipientId, videoId, commentId, NotificationType.comment);
    }

    @Transactional
    public void createReplyNotification(UUID actorId, UUID recipientId, UUID videoId, UUID commentId) {
        createNotification(actorId, recipientId, videoId, commentId, NotificationType.reply);
    }

    @Transactional
    public void createModerationNotification(UUID recipientId, UUID videoId, NotificationType type) {
        User recipient = userRepository.findById(recipientId).orElse(null);
        if (recipient == null) return;

        Notification notification = new Notification();
        notification.setActor(recipient);
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setMessage(buildMessage(type, null));

        if (videoId != null) {
            videoRepository.findById(videoId).ifPresent(notification::setVideo);
        }

        notificationRepository.save(notification);
    }

    public List<NotificationResponse> getNotifications(UUID userId, int page, int size) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size)).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByRecipientIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new RuntimeException("Not allowed");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        List<Notification> notifications = notificationRepository.findByRecipientIdAndReadFalse(userId);
        notifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(notifications);
    }

    private void createNotification(UUID actorId, UUID recipientId, UUID videoId, UUID commentId, NotificationType type) {
        if (actorId == null || recipientId == null || actorId.equals(recipientId)) {
            return;
        }

        User actor = userRepository.findById(actorId).orElse(null);
        User recipient = userRepository.findById(recipientId).orElse(null);
        if (actor == null || recipient == null) {
            return;
        }

        Notification notification = new Notification();
        notification.setActor(actor);
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setMessage(buildMessage(type, actor.getUsername()));

        if (videoId != null) {
            videoRepository.findById(videoId).ifPresent(notification::setVideo);
        }
        if (commentId != null) {
            commentRepository.findById(commentId).ifPresent(notification::setComment);
        }

        notificationRepository.save(notification);
    }

    private String buildMessage(NotificationType type, String username) {
        return switch (type) {
            case like -> username + " liked your video";
            case comment -> username + " commented on your video";
            case follow -> username + " started following you";
            case reply -> username + " replied to your comment";
            case video_approved -> "Your video has been approved and is now live";
            case video_rejected -> "Your video has been rejected by moderation";
        };
    }

    private NotificationResponse toResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setType(notification.getType().name());
        response.setMessage(notification.getMessage());
        response.setRead(notification.isRead());
        response.setCreatedAt(notification.getCreatedAt() != null ? notification.getCreatedAt().toString() : null);

        NotificationResponse.ActorSummary actorSummary = new NotificationResponse.ActorSummary();
        actorSummary.setId(notification.getActor().getId());
        actorSummary.setUsername(notification.getActor().getUsername());
        actorSummary.setAvatarUrl(notification.getActor().getAvatarUrl());
        response.setActor(actorSummary);

        if (notification.getVideo() != null) {
            response.setVideoId(notification.getVideo().getId());
            response.setVideoTitle(notification.getVideo().getTitle());
            response.setVideoThumbnailUrl(notification.getVideo().getThumbnailUrl());
        }

        if (notification.getComment() != null) {
            response.setCommentId(notification.getComment().getId());
        }

        return response;
    }
}
