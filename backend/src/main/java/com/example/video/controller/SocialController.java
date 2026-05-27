package com.example.video.controller;

import com.example.video.dto.CommentRequest;
import com.example.video.dto.CommentResponse;
import com.example.video.model.User;
import com.example.video.repository.UserRepository;
import com.example.video.service.SocialService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller quản lý các tương tác xã hội: like, comment, follow, share và repost.
 *
 * <p>Danh sách endpoint (tất cả đều yêu cầu JWT trừ GET không có dấu *):
 * <ul>
 *   <li>{@code POST /api/social/like/{videoId}} — Toggle like/unlike video.</li>
 *   <li>{@code GET  /api/social/like/{videoId}/status} — Kiểm tra trạng thái like.</li>
 *   <li>{@code POST /api/social/comment} — Thêm bình luận (có thể reply vào comment khác).</li>
 *   <li>{@code GET  /api/social/comments/{videoId}} — Lấy danh sách bình luận.</li>
 *   <li>{@code DELETE /api/social/comment/{commentId}} — Xóa bình luận của chính mình.</li>
 *   <li>{@code POST /api/social/follow/{targetUserId}} — Toggle follow/unfollow người dùng.</li>
 *   <li>{@code GET  /api/social/follow/{targetUserId}/status} — Kiểm tra trạng thái follow.</li>
 *   <li>{@code POST /api/social/share/{videoId}} — Tạo deep link chia sẻ và tăng share count.</li>
 *   <li>{@code POST /api/social/reposts/{videoId}} — Repost video lên feed của mình.</li>
 *   <li>{@code DELETE /api/social/reposts/{videoId}} — Xóa repost.</li>
 * </ul>
 *
 * <p>Khi like hoặc comment, hệ thống tự động tạo thông báo (Notification) cho chủ video.
 */
@RestController
@RequestMapping("/api/social")
@CrossOrigin(origins = "*")
public class SocialController {

    @Autowired
    private SocialService socialService;

    @Autowired
    private UserRepository userRepository;

    // ==================== LIKE ====================

    /**
     * Toggle like/unlike cho video. Nếu đã like thì unlike và ngược lại.
     *
     * @param videoId        ID video cần toggle like
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return JSON {@code {success, liked, message}} — {@code liked=true} nếu vừa like
     */
    @PostMapping("/like/{videoId}")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable UUID videoId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        boolean isLiked = socialService.toggleLike(userId, videoId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("liked", isLiked);
        response.put("message", isLiked ? "Video liked" : "Video unliked");
        return ResponseEntity.ok(response);
    }

    /**
     * Kiểm tra người dùng hiện tại đã like video chưa.
     *
     * @param videoId        ID video cần kiểm tra
     * @param authentication thông tin người dùng (nếu null → liked=false)
     * @return JSON {@code {liked: boolean}}
     */
    @GetMapping("/like/{videoId}/status")
    public ResponseEntity<Map<String, Object>> getLikeStatus(
            @PathVariable UUID videoId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        boolean isLiked = userId != null && socialService.isLiked(userId, videoId);
        
        return ResponseEntity.ok(Map.of("liked", isLiked));
    }

    // ==================== COMMENT ====================

    /**
     * Thêm bình luận vào video. Có thể reply vào comment cha bằng cách đặt {@code parentId}.
     * Sau khi tạo, tự động tạo thông báo cho chủ video (và chủ comment cha nếu là reply).
     *
     * @param request        thông tin bình luận (videoId, content, parentId tùy chọn)
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return CommentResponse với thông tin bình luận vừa tạo
     */
    @PostMapping("/comment")
    public ResponseEntity<CommentResponse> addComment(
            @RequestBody CommentRequest request,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        CommentResponse response = socialService.addComment(userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy danh sách bình luận của video.
     *
     * @param videoId ID video cần lấy bình luận
     * @param nested  {@code true} → trả về cấu trúc phân cấp (comment + replies); {@code false} → flat list
     * @return danh sách CommentResponse
     */
    @GetMapping("/comments/{videoId}")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable UUID videoId,
            @RequestParam(defaultValue = "false") boolean nested) {
        
        List<CommentResponse> comments = socialService.getComments(videoId, nested);
        return ResponseEntity.ok(comments);
    }

    /**
     * Xóa bình luận. Chỉ chủ sở hữu bình luận mới được xóa.
     * Khi xóa, toàn bộ cây reply con cũng bị xóa theo.
     *
     * @param commentId      ID bình luận cần xóa
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return JSON {@code {success, message}}
     */
    @DeleteMapping("/comment/{commentId}")
    public ResponseEntity<Map<String, Object>> deleteComment(
            @PathVariable UUID commentId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        socialService.deleteComment(commentId, userId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Comment deleted"));
    }

    // ==================== FOLLOW ====================

    /**
     * Toggle follow/unfollow người dùng. Không thể tự follow bản thân.
     * Khi follow mới, tạo thông báo cho người được follow.
     *
     * @param targetUserId   ID người dùng cần follow/unfollow
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return JSON {@code {success, following, message}}
     */
    @PostMapping("/follow/{targetUserId}")
    public ResponseEntity<Map<String, Object>> toggleFollow(
            @PathVariable UUID targetUserId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        boolean isFollowing = socialService.toggleFollow(userId, targetUserId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("following", isFollowing);
        response.put("message", isFollowing ? "Now following" : "Unfollowed");
        return ResponseEntity.ok(response);
    }

    /**
     * Kiểm tra trạng thái follow và lấy số người theo dõi của người dùng mục tiêu.
     *
     * @param targetUserId   ID người dùng cần kiểm tra
     * @param authentication thông tin người dùng hiện tại (nếu null → following=false)
     * @return JSON {@code {following: boolean, followerCount: long}}
     */
    @GetMapping("/follow/{targetUserId}/status")
    public ResponseEntity<Map<String, Object>> getFollowStatus(
            @PathVariable UUID targetUserId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        boolean isFollowing = userId != null && socialService.isFollowing(userId, targetUserId);
        long followerCount = socialService.getFollowerCount(targetUserId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("following", isFollowing);
        response.put("followerCount", followerCount);
        return ResponseEntity.ok(response);
    }

    // ==================== SHARE ====================

    /**
     * Chia sẻ video: tăng share count và trả về deep link để mở video trong app.
     *
     * @param videoId ID video cần chia sẻ
     * @return JSON {@code {success, shareLink, deepLink}} — deep link format "videoapp://video/{id}"
     */
    @PostMapping("/share/{videoId}")
    public ResponseEntity<Map<String, Object>> shareVideo(@PathVariable UUID videoId) {
        String shareLink = socialService.generateShareLink(videoId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("shareLink", shareLink);
        response.put("deepLink", shareLink);
        return ResponseEntity.ok(response);
    }

    /**
     * Repost video lên feed của người dùng hiện tại. Idempotent: repost lại không bị lỗi.
     * Chỉ video có status {@code active} mới được phép repost.
     *
     * @param videoId        ID video cần repost
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return JSON {@code {success, reposted, repostCount, message}}
     */
    @PostMapping("/reposts/{videoId}")
    public ResponseEntity<Map<String, Object>> createRepost(
            @PathVariable UUID videoId,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        try {
            long repostCount = socialService.createRepost(userId, videoId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "reposted", true,
                    "repostCount", repostCount,
                    "message", "Video reposted"
            ));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }

    /**
     * Xóa repost của người dùng hiện tại khỏi video.
     *
     * @param videoId        ID video cần hủy repost
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return JSON {@code {success, reposted: false, repostCount, message}}
     */
    @DeleteMapping("/reposts/{videoId}")
    public ResponseEntity<Map<String, Object>> removeRepost(
            @PathVariable UUID videoId,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        try {
            long repostCount = socialService.removeRepost(userId, videoId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "reposted", false,
                    "repostCount", repostCount,
                    "message", "Repost removed"
            ));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }

    /** Lấy UUID của người dùng hiện tại từ JWT, trả về null nếu chưa đăng nhập. */
    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }
}
