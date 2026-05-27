package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity ánh xạ bảng {@code moderation_rules} — quy tắc kiểm duyệt tự động.
 *
 * <p>Mục đích là cho phép admin định nghĩa các rule tự động (vd: "auto-reject
 * video chứa tag X với confidence ≥ 0.95") mà không cần can thiệp moderator.</p>
 *
 * <p><b>Lưu ý:</b> Phiên bản hiện tại đã có cấu trúc dữ liệu nhưng chưa hiện thực
 * rule engine ở tầng service. Đây là phần dành cho phát triển tương lai.</p>
 *
 * <p><b>Cấu trúc {@code conditions} (JSONB):</b><br>
 * {@code &#123;"tag":"violence","minConfidence":0.95&#125;}</p>
 *
 * <p><b>Cấu trúc {@code actions} (JSONB):</b><br>
 * {@code &#123;"action":"reject","priority":"high"&#125;}</p>
 */
@Entity
@Table(name = "moderation_rules")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ModerationRule {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** Tên hiển thị của rule (vd: "Auto-reject explicit content"). */
    @Column(nullable = false, length = 100)
    private String name;

    /** Loại rule: {@code tag_based}, {@code report_count}, v.v. */
    @Column(name = "rule_type", nullable = false, length = 20)
    private String ruleType;

    /** Điều kiện kích hoạt rule, dạng JSON. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String conditions;

    /** Hành động tương ứng khi rule khớp, dạng JSON. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String actions;

    /** Cờ bật/tắt rule (mặc định true). */
    @Column(name = "is_active")
    private Boolean isActive = true;

    /** Admin đã tạo rule. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
