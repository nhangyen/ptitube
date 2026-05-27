package com.example.video.controller;

import com.example.video.dto.DiscoverResponse;
import com.example.video.dto.HashtagDetailResponse;
import com.example.video.dto.SearchResponse;
import com.example.video.model.User;
import com.example.video.repository.UserRepository;
import com.example.video.service.DiscoverService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller cung cấp chức năng khám phá nội dung: trang Discover, tìm kiếm và chi tiết hashtag.
 *
 * <p>Danh sách endpoint:
 * <ul>
 *   <li>{@code GET /api/discover} — Lấy trang Discover gồm: video nổi bật, hashtag trending,
 *       creator được gợi ý (xếp hạng theo follower × 3 + video count).</li>
 *   <li>{@code GET /api/discover/search?q=...} — Tìm kiếm video, user và hashtag theo từ khóa.
 *       Hỗ trợ full-text search PostgreSQL với fallback ILIKE.</li>
 *   <li>{@code GET /api/discover/hashtags/{tagName}} — Lấy danh sách video theo hashtag cụ thể.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/discover")
@CrossOrigin(origins = "*")
public class DiscoverController {

    @Autowired
    private DiscoverService discoverService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Lấy nội dung trang Discover: video nổi bật, hashtag trending, creator gợi ý.
     *
     * @param authentication thông tin người dùng hiện tại (có thể null nếu chưa login)
     * @return DiscoverResponse với ba danh sách: featuredVideos, trendingHashtags, suggestedCreators
     */
    @GetMapping
    public ResponseEntity<DiscoverResponse> getDiscover(Authentication authentication) {
        return ResponseEntity.ok(discoverService.getDiscover(getCurrentUserId(authentication)));
    }

    /**
     * Tìm kiếm đa chiều theo từ khóa: video (full-text + ILIKE fallback), user (username ILIKE),
     * hashtag (name ILIKE). Kết quả phân trang.
     *
     * @param q              từ khóa tìm kiếm
     * @param page           số trang (bắt đầu từ 0)
     * @param size           số kết quả mỗi trang (mặc định 12)
     * @param authentication thông tin người dùng hiện tại
     * @return SearchResponse chứa ba danh sách: videos, users, hashtags
     */
    @GetMapping("/search")
    public ResponseEntity<SearchResponse> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            Authentication authentication) {
        return ResponseEntity.ok(discoverService.search(q, getCurrentUserId(authentication), page, size));
    }

    /**
     * Lấy chi tiết hashtag và danh sách video có sử dụng hashtag đó.
     *
     * @param tagName        tên hashtag (không cần dấu #)
     * @param page           số trang (bắt đầu từ 0)
     * @param size           số video mỗi trang (mặc định 12)
     * @param authentication thông tin người dùng hiện tại
     * @return HashtagDetailResponse gồm thông tin hashtag và danh sách VideoFeedItem
     */
    @GetMapping("/hashtags/{tagName}")
    public ResponseEntity<HashtagDetailResponse> getHashtagDetail(
            @PathVariable String tagName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            Authentication authentication) {
        return ResponseEntity.ok(discoverService.getHashtagDetail(tagName, getCurrentUserId(authentication), page, size));
    }

    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }
}
