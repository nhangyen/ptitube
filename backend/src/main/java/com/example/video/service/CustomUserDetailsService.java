package com.example.video.service;

import com.example.video.model.User;
import com.example.video.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

/**
 * Triển khai {@link UserDetailsService} để Spring Security tải thông tin user từ database.
 *
 * <p>Được sử dụng bởi {@code AuthenticationManager} trong quá trình xác thực tên đăng nhập/mật khẩu,
 * và bởi {@link com.example.video.security.JwtAuthenticationFilter} khi giải mã JWT để set
 * {@code SecurityContext}.
 *
 * <p>Authorities được để rỗng (empty list) — phân quyền dựa trên {@code UserRole} được xử lý
 * riêng ở tầng service/controller bằng cách load user từ DB và kiểm tra {@code role}.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Tải thông tin user theo username từ database.
     * Ném {@link UsernameNotFoundException} nếu không tìm thấy user — Spring Security
     * sẽ bắt exception này và trả về HTTP 401.
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                new ArrayList<>() // Authorities can be mapped from UserRole if needed
        );
    }
}
