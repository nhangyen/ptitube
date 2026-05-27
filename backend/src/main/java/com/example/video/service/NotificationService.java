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

/**
 * Service tạo và quản lý thông báo trong ứng dụng.
 *
 * <p>Thông báo được tạo bởi các service khác (SocialService) thông qua các phương thức convenience:
 * {@link #createFollowNotification}, {@link #createLikeNotification},
 * {@link #createCommentNotification}, {@link #createReplyNotification}.
 *
 * <p>Quy tắc tạo thông báo: không tạo thông báo khi actor = recipient
 * (tự like/comment video của chính mình), và không tạo khi một trong hai người không tồn tại.
 *
 * <p>Nội dung thông báo được sinh tự động bằng {@code buildMessage()} theo từng loại.
 */
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

    /**
     * Tạo thông báo "follow" khi người dùng bắt đầu theo dõi người khác.
     *
     * @param actorId     ID người thực hiện follow
     * @param recipientId ID người được follow (sẽ nhận thông báo)
     */
    @Transactional
    public void createFollowNotification(UUID actorId, UUID recipientId) {
        createNotification(actorId, recipientId, null, null, NotificationType.follow);
    }

    /**
     * Tạo thông báo "like" khi người dùng like video.
     *
     * @param actorId     ID người thực hiện like
     * @param recipientId ID chủ video (sẽ nhận thông báo)
     * @param videoId     ID video được like
     */
    @Transactional
    public void createLikeNotification(UUID actorId, UUID recipientId, UUID videoId) {
        createNotification(actorId, recipientId, videoId, null, NotificationType.like);
    }

    /**
     * Tạo thông báo "comment" khi người dùng bình luận lên video.
     *
     * @param actorId     ID người bình luận
     * @param recipientId ID chủ video
     * @param videoId     ID video được bình luận
     * @param commentId   ID bình luận vừa tạo
     */
    @Transactional
    public void createCommentNotification(UUID actorId, UUID recipientId, UUID videoId, UUID commentId) {
        createNotification(actorId, recipientId, videoId, commentId, NotificationType.comment);
    }

    /**
     * Tạo thông báo "reply" khi người dùng reply vào bình luận của người khác.
     *
     * @param actorId     ID người reply
     * @param recipientId ID chủ bình luận cha
     * @param videoId     ID video chứa bình luận
     * @param commentId   ID bình luận reply vừa tạo
     */
    @Transactional
    public void createReplyNotification(UUID actorId, UUID recipientId, UUID videoId, UUID commentId) {
        createNotification(actorId, recipientId, videoId, commentId, NotificationType.reply);
    }

    /**
     * Lấy danh sách thông báo của người dùng, phân trang, mới nhất trước.
     *
     * @param userId ID người dùng cần lấy thông báo
     * @param page   số trang (bắt đầu từ 0)
     * @param size   số thông báo mỗi trang
     * @return danh sách NotificationResponse
     */
    public List<NotificationResponse> getNotifications(UUID userId, int page, int size) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size)).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Đếm số thông báo chưa đọc của người dùng. Dùng để hiển thị badge trên icon.
     *
     * @param userId ID người dùng
     * @return số thông báo chưa đọc
     */
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    /**
     * Đánh dấu một thông báo cụ thể là đã đọc.
     * Kiểm tra người dùng là chủ thông báo trước khi cập nhật.
     *
     * @param userId         ID người dùng
     * @param notificationId ID thông báo cần đánh dấu
     * @throws RuntimeException nếu thông báo không tồn tại hoặc không phải của người dùng
     */
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

    /**
     * Đánh dấu tất cả thông báo chưa đọc của người dùng là đã đọc.
     *
     * @param userId ID người dùng
     */
    @Transactional
    public void markAllAsRead(UUID userId) {
        List<Notification> notifications = notificationRepository.findByRecipientIdAndIsReadFalse(userId);
        notifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(notifications);
    }

    /**
     * Tạo thông báo vào DB. Bỏ qua nếu actor hoặc recipient không tồn tại,
     * hoặc nếu actor == recipient (không tự thông báo cho bản thân).
     */
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

    /** Sinh nội dung thông báo tiếng Anh theo loại và tên người thực hiện hành động. */
    private String buildMessage(NotificationType type, String username) {
        return switch (type) {
            case like -> username + " liked your video";
            case comment -> username + " commented on your video";
            case follow -> username + " started following you";
            case reply -> username + " replied to your comment";
        };
    }

    /** Chuyển đổi Notification entity sang NotificationResponse DTO để trả về client. */
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
