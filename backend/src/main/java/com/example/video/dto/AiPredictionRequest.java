package com.example.video.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class AiPredictionRequest {

    @JsonProperty("user_profile")
    private UserProfile userProfile;

    @JsonProperty("video_candidates")
    private List<VideoCandidate> videoCandidates;

    @Data
    public static class UserProfile {
        @JsonProperty("user_id")
        private int userId;

        @JsonProperty("active_degree")
        private int activeDegree;

        @JsonProperty("is_live_streamer")
        private int isLiveStreamer;

        @JsonProperty("is_video_author")
        private int isVideoAuthor;

        @JsonProperty("follow_user_num_range")
        private int followUserNumRange;

        @JsonProperty("fans_user_num_range")
        private int fansUserNumRange;

        @JsonProperty("register_days_range")
        private int registerDaysRange;
    }

    @Data
    public static class VideoCandidate {
        @JsonProperty("candidate_id")
        private int candidateId;

        @JsonProperty("item_id")
        private int itemId;

        @JsonProperty("duration_seconds")
        private float durationSeconds;

        private int feat0;
        private int feat1;
        private int feat2;
        private int feat3;
    }
}
