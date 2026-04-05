package com.example.video.service;

import org.springframework.stereotype.Service;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class InteractionLoggerService {

    private static final String CSV_DIR = "/app/data/data_raw";
    private static final String CSV_FILE = CSV_DIR + "/big_matrix_processed.csv";
    private static final String HEADER = "user_id,item_id,timestamp,duration_normed,watch_ratio_normed";

    public InteractionLoggerService() {
        initCsv();
    }

    private void initCsv() {
        try {
            Path dir = Paths.get(CSV_DIR);
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }
            if (!Files.exists(Paths.get(CSV_FILE))) {
                try (PrintWriter writer = new PrintWriter(new FileWriter(CSV_FILE))) {
                    writer.println(HEADER);
                }
            }
        } catch (IOException e) {
            System.err.println("Error initializing interactions.csv: " + e.getMessage());
        }
    }

    public synchronized void logInteraction(Integer userId, Integer itemId, long timestamp, Float duration, Float watchRatio) {
        try (PrintWriter writer = new PrintWriter(new FileWriter(CSV_FILE, true))) {
            writer.printf("%d,%d,%d,%.2f,%.4f%n", userId, itemId, timestamp, duration, watchRatio);
        } catch (IOException e) {
            System.err.println("Error logging interaction to CSV: " + e.getMessage());
        }
    }
}
