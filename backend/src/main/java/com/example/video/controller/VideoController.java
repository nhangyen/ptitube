package com.example.video.controller;

import com.example.video.model.Video;
import com.example.video.service.VideoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;

@RestController
@RequestMapping("/api/videos")
@CrossOrigin(origins = "*") // Allow all for testing
public class VideoController {

    @Autowired
    private VideoService videoService;

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

    @GetMapping(value = "/stream/{videoId}")
    public ResponseEntity<InputStreamResource> streamVideo(@PathVariable String videoId) {
        try {
            InputStream stream = videoService.getVideoStream(videoId);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(new InputStreamResource(stream));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
