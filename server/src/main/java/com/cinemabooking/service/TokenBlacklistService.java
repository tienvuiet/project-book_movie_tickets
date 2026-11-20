package com.cinemabooking.service;

import java.time.Duration;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {
    private static final String ACCESS_PREFIX = "revoked-access-token:";
    private static final String REFRESH_PREFIX = "revoked-refresh-token:";
    private static final String SESSION_VERSION_PREFIX = "auth:session-version:";

    private final StringRedisTemplate redisTemplate;

    public void revokeAccessToken(String jti, Duration ttl) {
        revoke(ACCESS_PREFIX, jti, ttl);
    }

    public void revokeRefreshToken(String jti, Duration ttl) {
        revoke(REFRESH_PREFIX, jti, ttl);
    }

    public boolean markRefreshTokenUsed(String jti, Duration ttl) {
        if (jti == null || jti.isBlank() || ttl.isZero() || ttl.isNegative()) {
            return false;
        }
        return Boolean.TRUE.equals(redisTemplate.opsForValue()
                .setIfAbsent(REFRESH_PREFIX + jti, "1", ttl));
    }

    public boolean isAccessTokenRevoked(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(ACCESS_PREFIX + jti));
    }

    public boolean isRefreshTokenRevoked(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(REFRESH_PREFIX + jti));
    }

    public long currentSessionVersion(String email) {
        var value = redisTemplate.opsForValue().get(sessionVersionKey(email));
        if (value == null) return 0L;
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            return 0L;
        }
    }

    public long revokeAllUserTokens(String email) {
        var version = redisTemplate.opsForValue().increment(sessionVersionKey(email));
        return version == null ? currentSessionVersion(email) : version;
    }

    public boolean isSessionVersionValid(String email, long tokenVersion) {
        return tokenVersion >= 0 && tokenVersion == currentSessionVersion(email);
    }

    private void revoke(String prefix, String jti, Duration ttl) {
        if (jti != null && !jti.isBlank() && !ttl.isZero() && !ttl.isNegative()) {
            redisTemplate.opsForValue().set(prefix + jti, "1", ttl);
        }
    }

    private String sessionVersionKey(String email) {
        return SESSION_VERSION_PREFIX + email.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
