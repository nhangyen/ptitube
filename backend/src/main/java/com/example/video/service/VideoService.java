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
        video.setFileSize(file.getSize());
        video.setFormat(normalizeContentType(file.getContentType()));
        video.setUser(user);
        video.setStatus(VideoStatus.pending);

        Video saved = videoRepository.save(video);
        tagService.assignHashtagsToVideo(saved, saved.getTitle(), saved.getDescription(), user.getId());
        aiAnalysisService.analyzeVideo(saved.getId());
        return saved;
    }

    public List<Video> getAllVideos() {
        return videoRepository.findByStatusOrderByCreatedAtDesc(VideoStatus.active);
    }

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

    public VideoStreamMetadata getVideoStreamMetadata(UUID videoId) {
        return buildStreamMetadata(getVideo(videoId));
    }

    public Video getVideo(UUID videoId) {
        return videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));
    }

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
