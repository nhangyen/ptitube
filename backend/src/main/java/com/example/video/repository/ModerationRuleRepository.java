package com.example.video.repository;

import com.example.video.model.ModerationRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModerationRuleRepository extends JpaRepository<ModerationRule, UUID> {
    List<ModerationRule> findByIsActiveTrue();
}
