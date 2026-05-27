package com.example.video.service;

import com.example.video.model.User;
import com.example.video.model.Video;
import com.example.video.model.VideoStatus;
import com.example.video.repository.UserRepository;
import com.example.video.repository.VideoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Locale;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Service quản lý vòng đời video: upload, truy vấn và streaming.
 *
 * <p>Quy trình upload video:
 * <ol>
 *   <li>Validate file (không rỗng, kích thước ≤ maxUploadSize, content-type bắt đầu với "video/").</li>
 *   <li>Upload file lên MinIO với tên UUID + extension.</li>
 *   <li>Lưu bản ghi Video vào PostgreSQL với status {@code active}.</li>
 *   <li>Gán hashtag từ tiêu đề và mô tả ({@link TagService#assignHashtagsToVideo}).</li>
 *   <li>Kích hoạt phân tích AI bất đồng bộ ({@link AiAnalysisService#analyzeVideo}).</li>
 * </ol>
 *
 * <p>Streaming hỗ trợ HTTP Range Request: {@link #getVideoStreamResource} chấp nhận
 * offset và length tùy ý, trả về {@link VideoStreamResource} bao gồm InputStream
 * và metadata cần thiết để xây dựng response 206 Partial Content.
 */
@Service
public class VideoService {

    private static final Set<String> SUPPORTED_VIDEO_TYPE_PREFIXES = Set.of("video/");

    @Autowired
    private MinioService minioService;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AiAnalysisService aiAnalysisService;

    @Autowired
    private TagService tagService;

    @Value("${app.video.max-upload-size:250MB}")
    private DataSize maxUploadSize;

    /**
     * Upload video lên MinIO, lưu vào DB, gán hashtag và kích hoạt phân tích AI.
     *
     * @param file        file video (multipart, bắt buộc)
     * @param title       tiêu đề video (bắt buộc, không rỗng)
     * @param description mô tả video (tùy chọn, có thể chứa hashtag)
     * @param username    username của người upload
     * @return Video entity đã được lưu vào DB
     * @throws RuntimeException nếu file không hợp lệ, user không tồn tại hoặc upload MinIO thất bại
     */
    public Video uploadVideo(MultipartFile file, String title, String description, String username) {
        validateUpload(file, title);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String fileName = buildObjectName(file);
        minioService.uploadFile(fileName, file);

        Video video = new Video();
        video.setTitle(title.trim());
        video.setDescription(description == null ? null : description.trim());
        video.setVideoUrl(fileName);
        video.setThumbnailUrl(null);
        video.setFileSize(file.getSize());
        video.setFormat(normalizeContentType(file.getContentType()));
        video.setUser(user);
        video.setStatus(VideoStatus.active);
        int count = (int) videoRepository.count();
        video.setNumericId(count + 1);

        Video saved = videoRepository.save(video);
        tagService.assignHashtagsToVideo(saved, saved.getTitle(), saved.getDescription(), user.getId());
        aiAnalysisService.analyzeVideo(saved.getId());
        return saved;
    }

    /**
     * Lấy tất cả video có trạng thái {@code active}, sắp xếp mới nhất trước.
     *
     * @return danh sách Video entity
     */
    public List<Video> getAllVideos() {
        return videoRepository.findByStatusOrderByCreatedAtDesc(VideoStatus.active);
    }

    /**
     * Tạo resource stream video với hỗ trợ partial content.
     *
     * <p>Clamp offset vào phạm vi [0, totalLength-1] và tính contentLength thực tế
     * để tránh đọc ngoài vùng dữ liệu.
     *
     * @param videoId         ID video cần stream
     * @param offset          byte bắt đầu đọc (0 = từ đầu)
     * @param requestedLength số byte cần đọc (-1 = đọc đến cuối)
     * @return VideoStreamResource chứa InputStream và metadata phản hồi
     * @throws RuntimeException nếu video không tìm thấy hoặc MinIO lỗi
     */
    public VideoStreamResource getVideoStreamResource(UUID videoId, long offset, long requestedLength) {
        Video video = getVideo(videoId);
        VideoStreamMetadata metadata = buildStreamMetadata(video);

        long totalLength = metadata.size();
        long safeOffset = Math.min(Math.max(offset, 0), Math.max(totalLength - 1, 0));
        long contentLength = requestedLength > 0
                ? Math.min(requestedLength, totalLength - safeOffset)
                : totalLength - safeOffset;

        InputStream stream = minioService.getFile(video.getVideoUrl(), safeOffset, contentLength);
        String contentType = normalizeContentType(
                StringUtils.hasText(metadata.contentType()) ? metadata.contentType() : video.getFormat());

        return new VideoStreamResource(
                stream,
                safeOffset,
                contentLength,
                totalLength,
                contentType,
                metadata.objectName());
    }

    /**
     * Lấy metadata stream của video (kích thước, content-type, object name trong MinIO).
     * Dùng để tính Range trước khi stream.
     *
     * @param videoId ID video cần lấy metadata
     * @return VideoStreamMetadata
     */
    public VideoStreamMetadata getVideoStreamMetadata(UUID videoId) {
        return buildStreamMetadata(getVideo(videoId));
    }

    /**
     * Lấy Video theo ID. Ném RuntimeException nếu không tìm thấy.
     *
     * @param videoId ID video cần truy vấn
     * @return Video entity
     */
    public Video getVideo(UUID videoId) {
        return videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));
    }

    /**
     * Kiểm tra tính hợp lệ của file và tiêu đề upload.
     * Ném RuntimeException với thông báo rõ ràng nếu vi phạm bất kỳ điều kiện nào.
     */
    private void validateUpload(MultipartFile file, String title) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Video file is required");
        }
        if (!StringUtils.hasText(title)) {
            throw new RuntimeException("Video title is required");
        }
        if (file.getSize() > maxUploadSize.toBytes()) {
            throw new RuntimeException("Video file exceeds the allowed upload size");
        }

        String contentType = normalizeContentType(file.getContentType());
        boolean supportedType = SUPPORTED_VIDEO_TYPE_PREFIXES.stream().anyMatch(contentType::startsWith);
        if (!supportedType) {
            throw new RuntimeException("Unsupported video format");
        }
    }

    /**
     * Tạo tên object MinIO an toàn: UUID + extension của file gốc.
     * Loại bỏ ký tự path traversal (backslash, slash) để tránh lỗ hổng bảo mật.
     */
    private String buildObjectName(MultipartFile file) {
        String originalName = Optional.ofNullable(file.getOriginalFilename()).orElse("upload.mp4");
        String cleanName = StringUtils.cleanPath(originalName).replace("\\", "_").replace("/", "_");
        String extension = "";
        int extensionIndex = cleanName.lastIndexOf('.');
        if (extensionIndex >= 0) {
            extension = cleanName.substring(extensionIndex).toLowerCase(Locale.ROOT);
        }
        if (!StringUtils.hasText(extension)) {
            extension = ".mp4";
        }
        return UUID.randomUUID() + extension;
    }

    private String normalizeContentType(String contentType) {
        return StringUtils.hasText(contentType) ? contentType.toLowerCase(Locale.ROOT) : "application/octet-stream";
    }

    private VideoStreamMetadata buildStreamMetadata(Video video) {
        MinioService.StoredObjectInfo metadata = minioService.statObject(video.getVideoUrl());
        String contentType = normalizeContentType(
                StringUtils.hasText(metadata.contentType()) ? metadata.contentType() : video.getFormat());
        return new VideoStreamMetadata(metadata.size(), contentType, metadata.objectName());
    }

    public static class VideoStreamResource {
        private final InputStream stream;
        private final long offset;
        private final long contentLength;
        private final long totalLength;
        private final String contentType;
        private final String objectName;

        public VideoStreamResource(InputStream stream,
                                   long offset,
                                   long contentLength,
                                   long totalLength,
                                   String contentType,
                                   String objectName) {
            this.stream = stream;
            this.offset = offset;
            this.contentLength = contentLength;
            this.totalLength = totalLength;
            this.contentType = contentType;
            this.objectName = objectName;
        }

        public InputStream getStream() {
            return stream;
        }

        public long getOffset() {
            return offset;
        }

        public long getContentLength() {
            return contentLength;
        }

        public long getTotalLength() {
            return totalLength;
        }

        public String getContentType() {
            return contentType;
        }

        public String getObjectName() {
            return objectName;
        }
    }

    public record VideoStreamMetadata(long size, String contentType, String objectName) {
    }
}
