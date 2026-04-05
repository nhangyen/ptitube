package com.example.video.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class AiPredictionResponse {

    private String status;

    private List<Prediction> predictions;

    @Data
    public static class Prediction {
        @JsonProperty("candidate_id")
        private int candidateId;

        @JsonProperty("predicted_watch_time")
        private float predictedWatchTime;
    }
}
