package com.example.video.controller;

import com.example.video.dto.VideoFeedItem;
import com.example.video.model.User;
import com.example.video.model.Video;
import com.example.video.repository.UserRepository;
import com.example.video.service.DiscoverService;
import com.example.video.service.VideoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Controller quản lý video: upload, lấy danh sách, xem chi tiết và streaming.
 *
 * <p>Danh sách endpoint:
 * <ul>
 *   <li>{@code POST /api/videos/upload} — Upload video mới (multipart/form-data).</li>
 *   <li>{@code GET  /api/videos} — Lấy toàn bộ video có status {@code active}.</li>
 *   <li>{@code GET  /api/videos/{videoId}} — Lấy chi tiết video dưới dạng VideoFeedItem.</li>
 *   <li>{@code GET  /api/videos/stream/{videoId}} — Stream video hỗ trợ HTTP Range (partial content).</li>
 * </ul>
 *
 * <p>Streaming hỗ trợ HTTP Range Request (RFC 7233): client (video player) có thể yêu cầu
 * đoạn video cụ thể qua header {@code Range: bytes=start-end}, server trả về
 * {@code 206 Partial Content} với header {@code Content-Range}.
 */
@RestController
@RequestMapping("/api/videos")
@CrossOrigin(origins = "*") // Allow all for testing
public class VideoController {

    @Autowired
    private VideoService videoService;

    @Autowired
    private DiscoverService discoverService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Upload video lên hệ thống.
     *
     * <p>Sau khi lưu video vào MinIO và DB, tự động kích hoạt phân tích AI bất đồng bộ
     * ({@link com.example.video.service.AiAnalysisService#analyzeVideo}) và gán hashtag từ tiêu đề/mô tả.
     *
     * @param file           file video (multipart)
     * @param title          tiêu đề video (bắt buộc)
     * @param description    mô tả video (tùy chọn, có thể chứa hashtag)
     * @param authentication thông tin người dùng đang đăng nhập
     * @return Video entity đã được lưu vào DB
     */
    @PostMapping("/upload")
    public ResponseEntity<Video> uploadVideo(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            Authentication authentication) {

        // Fallback to default user if not authenticated (for testing)
        String username = (authentication != null) ? authentication.getName() : "testuser";
        Video video = videoService.uploadVideo(file, title, description, username);
        return ResponseEntity.ok(video);
    }

    /**
     * Lấy danh sách tất cả video có trạng thái {@code active}, sắp xếp mới nhất trước.
     *
     * @return danh sách Video entity
     */
    @GetMapping
    public List<Video> listVideos() {
        return videoService.getAllVideos();
    }

    /**
     * Lấy chi tiết một video theo ID, kèm thông tin like/comment/follow của người dùng hiện tại.
     *
     * @param videoId           ID của video cần xem
     * @param repostedByUserId  (tùy chọn) ID user đã repost — nếu cung cấp, hiển thị context repost
     * @param authentication    thông tin người dùng đang đăng nhập (có thể null nếu chưa login)
     * @return VideoFeedItem với đầy đủ thông tin hiển thị feed
     */
    @GetMapping("/{videoId}")
    public ResponseEntity<VideoFeedItem> getVideoDetail(
            @PathVariable UUID videoId,
            @RequestParam(required = false) UUID repostedByUserId,
            Authentication authentication) {
        return ResponseEntity.ok(discoverService.getVideoDetail(
                videoId,
                getCurrentUserId(authentication),
                repostedByUserId
        ));
    }

    /**
     * Stream video với hỗ trợ HTTP Range Request (RFC 7233) cho phép tua video.
     *
     * <p>Nếu header {@code Range} hợp lệ, trả về {@code 206 Partial Content}.
     * Nếu không có Range, trả về toàn bộ file với {@code 200 OK}.
     * Content-Type được tự động phát hiện từ metadata MinIO.
     *
     * @param videoId     ID video cần stream
     * @param rangeHeader giá trị header Range (vd: "bytes=0-1048576"), có thể null
     * @return stream audio/video cho video player
     */
    @GetMapping(value = "/stream/{videoId}")
    public ResponseEntity<InputStreamResource> streamVideo(
            @PathVariable UUID videoId,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader) {
        try {
            VideoService.VideoStreamResource streamResource;
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");

            HttpStatus status = HttpStatus.OK;
            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                long totalLength = videoService.getVideoStreamMetadata(videoId).size();
                ByteRange range = parseRange(rangeHeader, totalLength);
                streamResource = videoService.getVideoStreamResource(videoId, range.start(), range.length());
                status = HttpStatus.PARTIAL_CONTENT;
                headers.set(HttpHeaders.CONTENT_RANGE,
                        "bytes " + streamResource.getOffset()
                                + "-" + (streamResource.getOffset() + streamResource.getContentLength() - 1)
                                + "/" + streamResource.getTotalLength());
            } else {
                streamResource = videoService.getVideoStreamResource(videoId, 0, -1);
            }

            MediaType mediaType = safeMediaType(streamResource.getContentType());
            headers.setContentLength(streamResource.getContentLength());
            return ResponseEntity.status(status)
                    .headers(headers)
                    .contentType(mediaType)
                    .body(new InputStreamResource(streamResource.getStream()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Parse MediaType an toàn, fallback về application/octet-stream nếu content-type không hợp lệ. */
    private MediaType safeMediaType(String contentType) {
        try {
            return MediaType.parseMediaType(contentType);
        } catch (Exception ignored) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    /**
     * Phân tích header Range thành cặp (start, length).
     * Hỗ trợ: "bytes=start-end", "bytes=start-", "bytes=-suffixLength".
     *
     * @param rangeHeader  chuỗi Range header (vd: "bytes=0-1023")
     * @param totalLength  tổng kích thước file (byte)
     * @return ByteRange chứa offset bắt đầu và độ dài đoạn cần đọc
     * @throws IllegalArgumentException nếu format Range không hợp lệ
     */
    private ByteRange parseRange(String rangeHeader, long totalLength) {
        String value = rangeHeader.substring("bytes=".length()).trim();
        if (value.contains(",")) {
            throw new IllegalArgumentException("Multiple ranges are not supported");
        }

        String[] parts = value.split("-", 2);
        long start;
        long end;

        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid range");
        }

        if (parts[0].isBlank()) {
            long suffixLength = Long.parseLong(parts[1]);
            if (suffixLength <= 0) {
                throw new IllegalArgumentException("Invalid suffix length");
            }
            start = Math.max(totalLength - suffixLength, 0);
            end = totalLength - 1;
        } else {
            start = Long.parseLong(parts[0]);
            end = parts[1].isBlank() ? totalLength - 1 : Long.parseLong(parts[1]);
        }

        if (start < 0 || start >= totalLength) {
            throw new IllegalArgumentException("Range start is out of bounds");
        }

        end = Math.min(end, totalLength - 1);
        if (end < start) {
            throw new IllegalArgumentException("Invalid range end");
        }

        return new ByteRange(start, end - start + 1);
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

    /** Record đại diện cho byte range: vị trí bắt đầu và số byte cần đọc. */
    private record ByteRange(long start, long length) {
    }
}
