package com.cinemabooking.service.impl;

import com.cinemabooking.dto.request.RefreshTokenRequest;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.mapper.UserMapper;
import com.cinemabooking.repository.RoleRepository;
import com.cinemabooking.repository.UserRepository;
import com.cinemabooking.service.TokenBlacklistService;
import com.cinemabooking.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {
    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuthenticationManager authenticationManager;
    @Mock JwtUtil jwtUtil;
    @Mock TokenBlacklistService tokenBlacklistService;
    @Mock UserMapper userMapper;
    @Mock JavaMailSender mailSender;
    @Mock StringRedisTemplate redisTemplate;
    @InjectMocks AuthServiceImpl service;

    @Test
    void reusedRefreshTokenIsRejected() {
        var token = "already-used-refresh-token";
        when(jwtUtil.isValid(token)).thenReturn(true);
        when(jwtUtil.isTokenType(token, "refresh")).thenReturn(true);
        when(jwtUtil.extractSubject(token)).thenReturn("customer@example.com");
        when(jwtUtil.extractSessionVersion(token)).thenReturn(0L);
        when(tokenBlacklistService.isSessionVersionValid("customer@example.com", 0L)).thenReturn(true);
        when(jwtUtil.extractJti(token)).thenReturn("refresh-jti");
        when(jwtUtil.remainingTtl(token)).thenReturn(Duration.ofMinutes(10));
        when(tokenBlacklistService.markRefreshTokenUsed("refresh-jti", Duration.ofMinutes(10))).thenReturn(false);

        assertThrows(BusinessException.class, () -> service.refreshToken(new RefreshTokenRequest(token)));
    }
}
