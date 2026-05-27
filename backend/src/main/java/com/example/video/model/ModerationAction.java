package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity ánh xạ bảng {@code moderation_actions} — nhật ký hành động kiểm duyệt
 * (Audit Trail).
 *
 * <p>Mỗi bản ghi là một hành động bất biến (immutable) ghi lại quyết định của
 * moderator. Bảng này KHÔNG được phép UPDATE hay DELETE để đảm bảo tính minh bạch
 * và truy vết — chỉ insert thêm.</p>
 *
 * <p><b>Các loại {@code action}:</b></p>
 * <ul>
 *   <li>{@code approve} – phê duyệt video.</li>
 *   <li>{@code reject} – từ chối (ban) video.</li>
 *   <li>{@code reviewed} – chỉ review tag không kèm phán quyết video.</li>
 *   <li>{@code retag} – chỉnh sửa tag ở mức cảnh (chưa hiện thực ở phiên bản hiện tại).</li>
 * </ul>
 *
 * <p><b>{@code scope}:</b> {@code video} (toàn bộ video) hoặc {@code scene} (mức cảnh).</p>
 */
@Entity
@Table(name = "moderation_actions")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ModerationAction {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** Bản ghi hàng chờ mà hành động này áp dụng cho. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "queue_id", nullable = false)
    private ModerationQueue queue;

    /** Moderator/admin thực hiện hành động. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private User admin;

    /** Loại hành động: {@code approve}, {@code reject}, {@code reviewed}, {@code retag}. */
    @Column(nullable = false, length = 20)
    private String action;

    /** Phạm vi tác dụng: {@code video} hoặc {@code scene}. */
    @Column(length = 20)
    private String scope;

    /** Cảnh cụ thể bị tác động khi {@code scope='scene'} (null khi scope='video'). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_scene_id")
    private VideoScene targetScene;

    /** Lý do/ghi chú của moderator. Bắt buộc cho hành động {@code reject}. */
    @Column(columnDefinition = "TEXT")
    private String reason;

    /** Mảng UUID các tag được thêm (nếu là hành động sửa tag). */
    @Column(name = "tags_added", columnDefinition = "uuid[]")
    private UUID[] tagsAdded;

    /** Mảng UUID các tag bị xoá (nếu là hành động sửa tag). */
    @Column(name = "tags_removed", columnDefinition = "uuid[]")
    private UUID[] tagsRemoved;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
