package com.example.video.security;

import com.example.video.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter Spring Security chạy một lần mỗi request, chịu trách nhiệm xác thực JWT.
 *
 * <p>Luồng xử lý:
 * <ol>
 *   <li>Đọc header {@code Authorization: Bearer <token>} từ request.</li>
 *   <li>Nếu token tồn tại và hợp lệ, giải mã lấy username.</li>
 *   <li>Tải thông tin người dùng từ DB qua {@link CustomUserDetailsService}.</li>
 *   <li>Đặt {@link UsernamePasswordAuthenticationToken} vào {@link SecurityContextHolder}
 *       để các component downstream (Controller, Service) có thể đọc thông tin người dùng.</li>
 * </ol>
 *
 * <p>Nếu không có token hoặc token không hợp lệ, filter vẫn cho request đi tiếp
 * (không trả lỗi ngay) — việc kiểm tra quyền thực sự do Controller/Service đảm nhận.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    /**
     * Logic chính của filter: giải mã JWT (nếu có) và thiết lập Authentication trong SecurityContext.
     *
     * @param request     HTTP request đến
     * @param response    HTTP response
     * @param filterChain chuỗi filter tiếp theo
     * @throws ServletException nếu xảy ra lỗi servlet
     * @throws IOException      nếu xảy ra lỗi I/O
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromJWT(jwt);

                UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Đọc và trích xuất JWT từ header Authorization của request.
     *
     * @param request HTTP request cần đọc header
     * @return chuỗi JWT (không có prefix "Bearer "), hoặc {@code null} nếu không có token
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
