package com.example.video.repository;

import com.example.video.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository truy vấn bảng {@code users}.
 * Spring Data JPA tự động sinh implementation từ tên method tại runtime.
 */
public interface UserRepository extends JpaRepository<User, UUID> {
    /** Tìm user theo username (dùng khi giải mã JWT). */
    Optional<User> findByUsername(String username);

    /** Tìm user theo email. */
    Optional<User> findByEmail(String email);

    /** Kiểm tra username đã tồn tại chưa (dùng khi đăng ký). */
    boolean existsByUsername(String username);

    /** Kiểm tra email đã tồn tại chưa (dùng khi đăng ký). */
    boolean existsByEmail(String email);

    /** Tìm kiếm user theo username (case-insensitive, tối đa 10 kết quả, sắp xếp A-Z). */
    List<User> findTop10ByUsernameContainingIgnoreCaseOrderByUsernameAsc(String username);
}
