package com.example.video.controller;

import com.example.video.service.MinioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

@RestController
@RequestMapping("/api/videos")
@CrossOrigin(origins = "*") // Allow all for testing
public class VideoController {

    @Autowired
    private MinioService minioService;

    @Autowired
    private com.example.video.repository.VideoRepository videoRepository;

    @PostMapping("/upload")
    public ResponseEntity<String> uploadVideo(@RequestParam("file") MultipartFile file) {
        try {
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            minioService.uploadFile(fileName, file);

            // Save Metadata
            com.example.video.model.VideoMetadata metadata = new com.example.video.model.VideoMetadata();
            metadata.setFilename(fileName);
            metadata.setTitle(file.getOriginalFilename());
            metadata.setContentType(file.getContentType());
            metadata.setSize(file.getSize());
            videoRepository.save(metadata);

            return ResponseEntity.ok(fileName);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    @GetMapping
    public java.util.List<com.example.video.model.VideoMetadata> listVideos() {
        return videoRepository.findAll();
    }

    @GetMapping(value = "/{filename}")
    public ResponseEntity<InputStreamResource> streamVideo(@PathVariable String filename) {
        try {
            InputStream stream = minioService.getFile(filename);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM) // Or specific video type
                    .body(new InputStreamResource(stream));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
