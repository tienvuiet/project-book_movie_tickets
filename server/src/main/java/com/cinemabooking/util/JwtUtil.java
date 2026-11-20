package com.cinemabooking.util;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import javax.crypto.SecretKey;

import com.cinemabooking.security.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {
    private final JwtProperties properties;
    private final SecretKey key;

    public JwtUtil(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(String subject) {
        return generateAccessToken(subject, 0L);
    }

    public String generateRefreshToken(String subject) {
        return generateRefreshToken(subject, 0L);
    }

    public String generateAccessToken(String subject, long sessionVersion) {
        return generateToken(subject, properties.accessTokenExpirationMs(),
                Map.of("type", "access", "sessionVersion", sessionVersion));
    }

    public String generateRefreshToken(String subject, long sessionVersion) {
        return generateToken(subject, properties.refreshTokenExpirationMs(),
                Map.of("type", "refresh", "sessionVersion", sessionVersion));
    }

    public String extractSubject(String token) {
        return claims(token).getSubject();
    }

    public String extractJti(String token) {
        return claims(token).getId();
    }

    public long extractSessionVersion(String token) {
        try {
            var value = claims(token).get("sessionVersion", Number.class);
            return value == null ? 0L : value.longValue();
        } catch (RuntimeException exception) {
            return -1L;
        }
    }

    public Duration remainingTtl(String token) {
        var remaining = Duration.between(Instant.now(), claims(token).getExpiration().toInstant());
        return remaining.isNegative() ? Duration.ZERO : remaining;
    }

    public boolean isTokenType(String token, String expectedType) {
        try {
            return expectedType.equals(claims(token).get("type", String.class));
        } catch (RuntimeException ex) {
            return false;
        }
    }

    public boolean isValid(String token) {
        try {
            var parsed = claims(token);
            return parsed.getId() != null && !parsed.getId().isBlank();
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private String generateToken(String subject, long ttlMs, Map<String, Object> claims) {
        var now = new Date();
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttlMs))
                .signWith(key)
                .compact();
    }

    private Claims claims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}

