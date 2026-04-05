package com.example.video.controller;

import com.example.video.service.AiDataExportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/ai")
public class AiDataExportController {

    @Autowired
    private AiDataExportService aiDataExportService;

    @GetMapping("/force-export")
    public ResponseEntity<Map<String, String>> forceExport() {
        // Run the export manually on demand
        aiDataExportService.exportDataForAiTraining();
        
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "AI features exported successfully to /app/data/data_raw/");
        return ResponseEntity.ok(response);
    }
}
