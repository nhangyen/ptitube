package com.example.video.config;

import com.example.video.security.JwtAuthenticationFilter;
import com.example.video.service.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Cấu hình Spring Security cho toàn bộ ứng dụng.
 *
 * <p>Chính sách bảo mật:
 * <ul>
 *   <li>CSRF bị tắt (ứng dụng dùng JWT, không dùng session cookie).</li>
 *   <li>CORS cho phép tất cả origin (chỉ dùng khi phát triển; cần giới hạn khi lên production).</li>
 *   <li>Tất cả request đều được phép đi qua tầng Spring Security — kiểm tra quyền thực sự
 *       được thực hiện ở cấp Controller/Service bằng cách kiểm tra role người dùng.</li>
 *   <li>Session policy là STATELESS: server không lưu session, mỗi request phải mang JWT.</li>
 *   <li>{@link JwtAuthenticationFilter} được cài trước {@link UsernamePasswordAuthenticationFilter}
 *       để giải mã JWT và đặt Authentication vào SecurityContext.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    /**
     * Cấu hình chuỗi filter bảo mật: tắt CSRF, bật CORS, STATELESS session, thêm JWT filter.
     *
     * @param http đối tượng HttpSecurity do Spring inject
     * @return SecurityFilterChain đã được cấu hình
     * @throws Exception nếu cấu hình không hợp lệ
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll())
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        http.authenticationProvider(authenticationProvider());

        return http.build();
    }

    /**
     * Cấu hình CORS: cho phép tất cả origin, method GET/POST/PUT/DELETE/OPTIONS và header.
     * <p><b>Lưu ý production:</b> thay {@code "*"} bằng danh sách domain cụ thể.
     *
     * @return CorsConfigurationSource để Spring Security áp dụng
     */
    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.setAllowedOrigins(java.util.Arrays.asList("*"));
        configuration.setAllowedMethods(java.util.Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(java.util.Arrays.asList("*"));
        configuration.setAllowCredentials(false);

        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(customUserDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
