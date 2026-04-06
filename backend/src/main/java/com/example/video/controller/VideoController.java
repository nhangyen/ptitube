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

    @GetMapping
    public List<Video> listVideos() {
        return videoService.getAllVideos();
    }

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

    private MediaType safeMediaType(String contentType) {
        try {
            return MediaType.parseMediaType(contentType);
        } catch (Exception ignored) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

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

    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }

    private record ByteRange(long start, long length) {
    }
}
