package com.example.video.repository;

import com.example.video.model.ModerationRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository cho entity {@link ModerationRule} (rule engine).
 *
 * <p>Phục vụ phát triển tương lai — rule engine sẽ load các rule active
 * khi service khởi động và đánh giá chúng cho mỗi video mới phân tích.</p>
 */
public interface ModerationRuleRepository extends JpaRepository<ModerationRule, UUID> {

    /** Lấy tất cả rule đang bật để rule engine sử dụng. */
    List<ModerationRule> findByIsActiveTrue();
}
