package com.example.video.service;

import com.example.video.dto.ModerationQueueResponse;
import com.example.video.dto.SceneDetailResponse;
import com.example.video.dto.TagResponse;
import com.example.video.model.*;
import com.example.video.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ModerationService {

    @Autowired
    private ModerationQueueRepository queueRepository;

    @Autowired
    private ModerationActionRepository actionRepository;

    @Autowired
    private VideoSceneRepository sceneRepository;

    @Autowired
    private SceneTagRepository sceneTagRepository;

    @Autowired
    private VideoTagRepository videoTagRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private UserRepository userRepository;

    public Map<String, Long> getQueueStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("pending", queueRepository.countByStatus("pending"));
        stats.put("in_review", queueRepository.countByStatus("in_review"));
        stats.put("reviewed", queueRepository.countByStatus("reviewed"));
        return stats;
    }

    public Page<ModerationQueueResponse> getQueue(String status, int page, int size) {
        Page<ModerationQueue> items;
        if (status != null && !status.isBlank()) {
            items = queueRepository.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, size));
        } else {
            items = queueRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        }
        return items.map(this::toQueueResponse);
    }

    public ModerationQueueResponse getQueueItem(UUID queueId) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        return toQueueResponse(queue);
    }

    public List<SceneDetailResponse> getVideoScenes(UUID queueId) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));

        List<VideoScene> scenes = sceneRepository.findByVideoIdOrderBySceneIndex(queue.getVideo().getId());
        return scenes.stream().map(this::toSceneDetail).collect(Collectors.toList());
    }

    @Transactional
    public void assignToModerator(UUID queueId, UUID moderatorId) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        User moderator = userRepository.findById(moderatorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        queue.setAssignedTo(moderator);
        queue.setStatus("in_review");
        queueRepository.save(queue);
    }

    @Transactional
    public void markReviewed(UUID queueId, UUID adminId, String notes) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        queue.setStatus("reviewed");
        queueRepository.save(queue);

        ModerationAction action = new ModerationAction();
        action.setQueue(queue);
        action.setAdmin(admin);
        action.setAction("reviewed");
        action.setScope("video");
        action.setReason(notes);
        actionRepository.save(action);
    }

    @Transactional
    public void approveVideo(UUID queueId, UUID adminId, String reason) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        queue.setStatus("reviewed");
        queueRepository.save(queue);

        Video video = queue.getVideo();
        video.setStatus(VideoStatus.active);
        videoRepository.save(video);

        ModerationAction action = new ModerationAction();
        action.setQueue(queue);
        action.setAdmin(admin);
        action.setAction("approve");
        action.setScope("video");
        action.setReason(reason);
        actionRepository.save(action);
    }

    @Transactional
    public void rejectVideo(UUID queueId, UUID adminId, String reason) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        queue.setStatus("reviewed");
        queueRepository.save(queue);

        Video video = queue.getVideo();
        video.setStatus(VideoStatus.banned);
        videoRepository.save(video);

        // Auto-resolve related open reports
        List<Report> openReports = reportRepository.findByVideoId(video.getId())
                .stream().filter(r -> "open".equals(r.getStatus())).collect(Collectors.toList());
        for (Report report : openReports) {
            report.setStatus("resolved");
            reportRepository.save(report);
        }

        ModerationAction action = new ModerationAction();
        action.setQueue(queue);
        action.setAdmin(admin);
        action.setAction("reject");
        action.setScope("video");
        action.setReason(reason);
        actionRepository.save(action);
    }

    @Transactional
    public void addTagToScene(UUID sceneId, UUID tagId, UUID adminId) {
        VideoScene scene = sceneRepository.findById(sceneId)
                .orElseThrow(() -> new RuntimeException("Scene not found"));
        tagRepository.findById(tagId)
                .orElseThrow(() -> new RuntimeException("Tag not found"));

        SceneTag sceneTag = new SceneTag();
        sceneTag.setSceneId(sceneId);
        sceneTag.setTagId(tagId);
        sceneTag.setSource("admin");
        sceneTag.setConfidence(1.0);
        sceneTag.setAssignedBy(adminId);
        sceneTagRepository.save(sceneTag);

        scene.setStatus("revised");
        sceneRepository.save(scene);
    }

    @Transactional
    public void removeTagFromScene(UUID sceneId, UUID tagId, UUID adminId) {
        sceneTagRepository.deleteBySceneIdAndTagId(sceneId, tagId);

        VideoScene scene = sceneRepository.findById(sceneId)
                .orElseThrow(() -> new RuntimeException("Scene not found"));
        scene.setStatus("revised");
        sceneRepository.save(scene);
    }

    private ModerationQueueResponse toQueueResponse(ModerationQueue queue) {
        ModerationQueueResponse resp = new ModerationQueueResponse();
        resp.setQueueId(queue.getId());
        resp.setVideoId(queue.getVideo().getId());
        resp.setVideoTitle(queue.getVideo().getTitle());
        resp.setVideoThumbnail(queue.getVideo().getThumbnailUrl());
        resp.setUploaderUsername(queue.getVideo().getUser().getUsername());
        resp.setUploaderId(queue.getVideo().getUser().getId());
        resp.setPriority(queue.getPriority());
        resp.setStatus(queue.getStatus());
        resp.setAssignedTo(queue.getAssignedTo() != null ? queue.getAssignedTo().getUsername() : null);
        resp.setAiJobStatus(queue.getAiJob() != null ? queue.getAiJob().getStatus() : null);
        resp.setSceneCount((int) sceneRepository.countByVideoId(queue.getVideo().getId()));
        resp.setReportCount(reportRepository.countByVideoId(queue.getVideo().getId()));
        resp.setVideoStatus(queue.getVideo().getStatus().name());
        resp.setAutoFlags(queue.getAutoFlags());
        resp.setCreatedAt(queue.getCreatedAt());
        return resp;
    }

    public List<Map<String, Object>> getVideoReports(UUID queueId) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        List<Report> reports = reportRepository.findByVideoId(queue.getVideo().getId());
        return reports.stream()
                .filter(r -> "open".equals(r.getStatus()))
                .map(r -> Map.<String, Object>of(
                        "id", r.getId(),
                        "reason", r.getReason(),
                        "reporterUsername", r.getReporter().getUsername(),
                        "createdAt", r.getCreatedAt().toString()
                ))
                .collect(Collectors.toList());
    }

    private SceneDetailResponse toSceneDetail(VideoScene scene) {
        SceneDetailResponse resp = new SceneDetailResponse();
        resp.setSceneId(scene.getId());
        resp.setSceneIndex(scene.getSceneIndex());
        resp.setStartTime(scene.getStartTime());
        resp.setEndTime(scene.getEndTime());
        resp.setThumbnailUrl(scene.getThumbnailUrl());
        resp.setAiSummary(scene.getAiSummary());
        resp.setStatus(scene.getStatus());

        List<SceneTag> sceneTags = sceneTagRepository.findBySceneId(scene.getId());
        List<TagResponse> tags = sceneTags.stream().map(st -> {
            TagResponse tr = new TagResponse();
            tr.setId(st.getTagId());
            if (st.getTag() != null) {
                tr.setName(st.getTag().getName());
                tr.setCategory(st.getTag().getCategory());
            }
            tr.setSource(st.getSource());
            tr.setConfidence(st.getConfidence());
            return tr;
        }).collect(Collectors.toList());
        resp.setTags(tags);

        return resp;
    }
}
