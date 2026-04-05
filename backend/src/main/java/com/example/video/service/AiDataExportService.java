package com.example.video.service;

import com.example.video.model.User;
import com.example.video.model.Video;
import com.example.video.model.VideoCategory;
import com.example.video.repository.FollowRepository;
import com.example.video.repository.UserRepository;
import com.example.video.repository.VideoRepository;
import com.example.video.repository.VideoViewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class AiDataExportService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private VideoViewRepository videoViewRepository;

    @Autowired
    private FollowRepository followRepository;

    private static final String CSV_DIR = "/app/data/data_raw";
    private static final String USER_FEATURES_FILE = CSV_DIR + "/user_features.csv";
    private static final String ITEM_CATEGORIES_FILE = CSV_DIR + "/item_categories.csv";

    public AiDataExportService() {
        try {
            Path dir = Paths.get(CSV_DIR);
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }
        } catch (IOException e) {
            System.err.println("Failed to create data_raw directory: " + e.getMessage());
        }
    }

    // Cron job runs every day at 2:00 AM server time
    @Scheduled(cron = "0 0 2 * * ?")
    public void exportDataForAiTraining() {
        System.out.println("Starting AI Nightly Export Process...");
        exportUserFeatures();
        exportItemCategories();
        System.out.println("AI Nightly Export Completed.");
    }

    public void exportItemCategories() {
        try (PrintWriter writer = new PrintWriter(new FileWriter(ITEM_CATEGORIES_FILE))) {
            writer.println("item_id,feat");
            
            List<Video> videos = videoRepository.findAll();
            for (Video video : videos) {
                if (video.getNumericId() == null) continue;
                
                // Original category value for CSV: shiftedValue - 1
                // E.g., Unknown (0) -> -1, Daily Life (1) -> 0
                int shiftedValue = video.getCategoryId() != null ? video.getCategoryId() : 0;
                int originalValue = shiftedValue - 1;
                
                // Format: item_id,"[feat0, feat1, feat2, feat3]" where others are -1
                String featList = String.format("[%d, -1, -1, -1]", originalValue);
                
                writer.printf("%d,\"%s\"%n", video.getNumericId(), featList);
            }
        } catch (IOException e) {
            System.err.println("Error exporting item_categories.csv: " + e.getMessage());
        }
    }

    public void exportUserFeatures() {
        try (PrintWriter writer = new PrintWriter(new FileWriter(USER_FEATURES_FILE))) {
            // Build header
            StringBuilder header = new StringBuilder();
            header.append("user_id,user_active_degree,is_live_streamer,is_video_author,")
                  .append("follow_user_num_range,fans_user_num_range,friend_user_num_range,register_days_range");
            for (int i = 0; i < 18; i++) {
                header.append(",onehot_feat").append(i);
            }
            writer.println(header.toString());

            List<User> users = userRepository.findAll();
            for (User user : users) {
                if (user.getNumericId() == null) continue;

                long totalViews = videoViewRepository.countByUserId(user.getId());
                int activeDegree = 0;
                if (totalViews >= 200) activeDegree = 3;
                else if (totalViews >= 50) activeDegree = 2;
                else if (totalViews >= 10) activeDegree = 1;

                long videoCount = videoRepository.countByUserId(user.getId());
                int isVideoAuthor = videoCount > 0 ? 1 : 0;

                long followingCount = followRepository.countByFollowerId(user.getId());
                int followRange = calculateRange(followingCount, new long[]{0, 10, 50, 100, 500});

                long followerCount = followRepository.countByFollowingId(user.getId());
                int fansRange = calculateRange(followerCount, new long[]{0, 10, 50, 100, 500});

                long daysSinceReg = user.getCreatedAt() != null
                        ? ChronoUnit.DAYS.between(user.getCreatedAt(), LocalDateTime.now())
                        : 0;
                int regRange = calculateRange(daysSinceReg, new long[]{0, 7, 30, 90, 365});

                StringBuilder row = new StringBuilder();
                row.append(user.getNumericId()).append(",")
                   .append(activeDegree).append(",")
                   .append(0).append(",") // is_live_streamer
                   .append(isVideoAuthor).append(",")
                   .append(followRange).append(",")
                   .append(fansRange).append(",")
                   .append(0).append(",") // friend_user_num_range
                   .append(regRange);
                   
                for (int i = 0; i < 18; i++) {
                    row.append(",UNKNOWN"); // onehot_feat
                }
                
                writer.println(row.toString());
            }
        } catch (IOException e) {
            System.err.println("Error exporting user_features.csv: " + e.getMessage());
        }
    }

    private int calculateRange(long value, long[] thresholds) {
        for (int i = thresholds.length - 1; i >= 0; i--) {
            if (value >= thresholds[i]) return i;
        }
        return 0;
    }
}
