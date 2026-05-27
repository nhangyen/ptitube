package com.example.video.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * Tiện ích tạo và xác minh JSON Web Token (JWT) cho xác thực người dùng.
 *
 * <p>JWT được ký bằng thuật toán HS512 với secret key cứng trong code (MVP).
 * Trong môi trường production, cần chuyển {@code jwtSecret} sang biến môi trường
 * hoặc secret manager để tránh lộ key khi commit code.
 *
 * <p>Thời hạn token mặc định là 7 ngày ({@code jwtExpirationMs = 604800000 ms}).
 */
@Component
public class JwtTokenProvider {

    // Should be in application.properties. Using a strong default for MVP.
    // Minimum 256-bit key for HS512
    private final String jwtSecret = "9a4f2c8d3b7a1e6f4c5d8e0s1u2i3o4p5l6k7j8h9g0f1q2w3e4r5t6y7u8i9o0p";

    // 7 days
    private final int jwtExpirationMs = 604800000;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    /**
     * Tạo JWT từ đối tượng Authentication đã xác thực thành công.
     *
     * <p>Subject của token là username. Token được ký bằng HS512 và có hiệu lực 7 ngày.
     *
     * @param authentication đối tượng Authentication sau khi đăng nhập thành công
     * @return chuỗi JWT compact (header.payload.signature)
     */
    public String generateToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();

        return Jwts.builder()
                .setSubject(userPrincipal.getUsername())
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS512)
                .compact();
    }

    /**
     * Giải mã JWT và lấy username (subject) từ claims.
     *
     * @param token chuỗi JWT cần giải mã
     * @return username của người dùng sở hữu token
     * @throws io.jsonwebtoken.JwtException nếu token không hợp lệ hoặc đã hết hạn
     */
    public String getUsernameFromJWT(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        return claims.getSubject();
    }

    /**
     * Kiểm tra tính hợp lệ của JWT (chữ ký đúng và chưa hết hạn).
     *
     * <p>Nuốt tất cả các ngoại lệ JWT và trả về {@code false} thay vì ném exception,
     * để filter có thể tiếp tục xử lý request mà không bị gián đoạn.
     *
     * @param authToken chuỗi JWT cần kiểm tra
     * @return {@code true} nếu token hợp lệ, {@code false} nếu không hợp lệ
     */
    public boolean validateToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(authToken);
            return true;
        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException ex) {
            // Invalid JWT signature or token
        } catch (ExpiredJwtException ex) {
            // Expired JWT token
        } catch (UnsupportedJwtException ex) {
            // Unsupported JWT token
        } catch (IllegalArgumentException ex) {
            // JWT claims string is empty
        }
        return false;
    }
}
