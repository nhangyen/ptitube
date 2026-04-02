package com.example.video.controller;

import com.example.video.dto.DiscoverResponse;
import com.example.video.dto.HashtagDetailResponse;
import com.example.video.dto.SearchResponse;
import com.example.video.model.User;
import com.example.video.repository.UserRepository;
import com.example.video.service.DiscoverService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/discover")
@CrossOrigin(origins = "*")
public class DiscoverController {

    @Autowired
    private DiscoverService discoverService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<DiscoverResponse> getDiscover(Authentication authentication) {
        return ResponseEntity.ok(discoverService.getDiscover(getCurrentUserId(authentication)));
    }

    @GetMapping("/search")
    public ResponseEntity<SearchResponse> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            Authentication authentication) {
        return ResponseEntity.ok(discoverService.search(q, getCurrentUserId(authentication), page, size));
    }

    @GetMapping("/hashtags/{tagName}")
    public ResponseEntity<HashtagDetailResponse> getHashtagDetail(
            @PathVariable String tagName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            Authentication authentication) {
        return ResponseEntity.ok(discoverService.getHashtagDetail(tagName, getCurrentUserId(authentication), page, size));
    }

    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }
}
