package com.example.video.service;

import com.example.video.dto.AuthResponse;
import com.example.video.dto.LoginRequest;
import com.example.video.dto.RegisterRequest;
import com.example.video.model.User;
import com.example.video.repository.UserRepository;
import com.example.video.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Service xử lý đăng ký và đăng nhập tài khoản.
 *
 * <p>Quy trình đăng ký:
 * <ol>
 *   <li>Kiểm tra username và email chưa tồn tại trong DB.</li>
 *   <li>Mã hóa password bằng BCrypt rồi lưu User vào DB.</li>
 *   <li>Tự động gọi {@link #authenticate} để trả về JWT ngay sau khi đăng ký.</li>
 * </ol>
 *
 * <p>Quy trình đăng nhập:
 * <ol>
 *   <li>Xác thực qua {@link org.springframework.security.authentication.AuthenticationManager}.</li>
 *   <li>Đặt Authentication vào SecurityContext.</li>
 *   <li>Tạo JWT bằng {@link com.example.video.security.JwtTokenProvider} và trả về {@link com.example.video.dto.AuthResponse}.</li>
 * </ol>
 */
@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider tokenProvider;

    /**
     * Đăng ký tài khoản mới và trả về JWT (tự động đăng nhập).
     *
     * @param request thông tin đăng ký (username, email, password)
     * @return AuthResponse chứa JWT và thông tin người dùng
     * @throws RuntimeException nếu username hoặc email đã tồn tại
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username is already taken!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already in use!");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        int count =(int) userRepository.count();
        user.setNumericId(count + 1);
        userRepository.save(user);

        // Auto-login after register
        return authenticate(new LoginRequest() {
            {
                setUsername(request.getUsername());
                setPassword(request.getPassword());
            }
        });
    }

    /**
     * Xác thực đăng nhập và tạo JWT.
     *
     * @param request thông tin đăng nhập (username, password)
     * @return AuthResponse chứa JWT, userId, username, email, avatarUrl, role
     * @throws org.springframework.security.core.AuthenticationException nếu thông tin sai
     */
    public AuthResponse authenticate(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new AuthResponse(
                user.getId().toString(),
                jwt,
                user.getUsername(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getRole().name());
    }
}
