package com.example.video.service;

import com.example.video.model.User;
import com.example.video.model.Video;
import com.example.video.model.VideoStatus;
import com.example.video.repository.UserRepository;
import com.example.video.repository.VideoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@Service
public class VideoService {

    @Autowired
    private MinioService minioService;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private UserRepository userRepository;

    public Video uploadVideo(MultipartFile file, String title, String description, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        minioService.uploadFile(fileName, file);

        Video video = new Video();
        video.setTitle(title);
        video.setDescription(description);
        video.setVideoUrl(fileName);
        video.setFileSize(file.getSize());
        video.setFormat(file.getContentType());
        video.setUser(user);
        video.setStatus(VideoStatus.active); // Direct active for MVP

        return videoRepository.save(video);
    }

    public List<Video> getAllVideos() {
        return videoRepository.findAll();
    }

    public InputStream getVideoStream(String videoId) {
        Video video = videoRepository.findById(UUID.fromString(videoId))
                .orElseThrow(() -> new RuntimeException("Video not found"));
        return minioService.getFile(video.getVideoUrl());
    }
}
