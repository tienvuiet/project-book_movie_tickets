package com.cinemabooking.service.impl;

import com.cinemabooking.constant.AppConstants;
import com.cinemabooking.dto.request.*;
import com.cinemabooking.dto.response.AuthResponse;
import com.cinemabooking.entity.User;
import com.cinemabooking.entity.UserRole;
import com.cinemabooking.enums.UserStatus;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.exception.ErrorCode;
import com.cinemabooking.mapper.UserMapper;
import com.cinemabooking.repository.RoleRepository;
import com.cinemabooking.repository.UserRepository;
import com.cinemabooking.service.AuthService;
import com.cinemabooking.service.TokenBlacklistService;
import com.cinemabooking.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Collections;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final TokenBlacklistService tokenBlacklistService;
    private final UserMapper userMapper;
    private final JavaMailSender mailSender;
    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    private static final String RESET_OTP_PREFIX = "password-reset:otp:";
    private static final String RESET_ATTEMPTS_PREFIX = "password-reset:attempts:";
    private static final String RESET_RESEND_PREFIX = "password-reset:resend:";
    private static final int MAX_RESET_OTP_ATTEMPTS = 5;
    private static final DefaultRedisScript<Long> INCREMENT_ATTEMPTS_SCRIPT = new DefaultRedisScript<>("""
            local attempts = redis.call('INCR', KEYS[1])
            if attempts == 1 then
                redis.call('PEXPIRE', KEYS[1], ARGV[1])
            end
            return attempts
            """, Long.class);

    @Value("${spring.mail.username:}") private String mailFrom;
    @Value("${app.password-reset.otp-expiration-minutes:5}") private long otpExpirationMinutes;
    @Value("${app.password-reset.resend-delay-seconds:60}") private long resendDelaySeconds;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        var user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .phone(request.phone())
                .status(UserStatus.ACTIVE)
                .build();
        var role = roleRepository.findByName(AppConstants.ROLE_CUSTOMER)
                .orElseThrow(() -> new BusinessException(ErrorCode.BUSINESS_ERROR, "Role CUSTOMER chưa được seed"));
        user.getUserRoles().add(UserRole.builder().user(user).role(role).build());
        userRepository.save(user);
        return tokens(user.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        var user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED);
        }
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        return tokens(user.getEmail());
    }

    @Override
    public void logout(RefreshTokenRequest request, String accessToken) {
        var refreshToken = request.refreshToken();
        validateToken(accessToken, "access", "Access token không hợp lệ");
        validateToken(refreshToken, "refresh", "Refresh token không hợp lệ");
        if (!jwtUtil.extractSubject(accessToken).equals(jwtUtil.extractSubject(refreshToken))) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Hai token không thuộc cùng một tài khoản");
        }
        tokenBlacklistService.revokeAccessToken(jwtUtil.extractJti(accessToken), jwtUtil.remainingTtl(accessToken));
        tokenBlacklistService.revokeRefreshToken(jwtUtil.extractJti(refreshToken), jwtUtil.remainingTtl(refreshToken));
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        var refreshToken = request.refreshToken();
        validateToken(refreshToken, "refresh", "Refresh token không hợp lệ");
        var jti = jwtUtil.extractJti(refreshToken);
        if (!tokenBlacklistService.markRefreshTokenUsed(jti, jwtUtil.remainingTtl(refreshToken))) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Refresh token đã bị thu hồi hoặc tái sử dụng");
        }
        return tokens(jwtUtil.extractSubject(refreshToken));
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        var email = com.cinemabooking.security.CurrentUser.email();
        if (email == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Chưa đăng nhập");
        }

        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Không tìm thấy tài khoản"));

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.oldPassword()));
        } catch (org.springframework.security.core.AuthenticationException exception) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Mật khẩu hiện tại không đúng");
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        tokenBlacklistService.revokeAllUserTokens(email);
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        var email = normalizeEmail(request.email());
        var user = userRepository.findByEmail(email).orElse(null);
        // Always return success for unknown addresses to avoid account enumeration.
        if (user == null) return;

        var resendLockAcquired = redisTemplate.opsForValue().setIfAbsent(
                resetResendKey(email), "1", Duration.ofSeconds(resendDelaySeconds));
        if (!Boolean.TRUE.equals(resendLockAcquired)) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Vui lòng chờ trước khi yêu cầu OTP mới");
        }

        var otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        redisTemplate.opsForValue().set(resetOtpKey(email), passwordEncoder.encode(otp), Duration.ofMinutes(otpExpirationMinutes));
        redisTemplate.delete(resetAttemptsKey(email));

        var message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email);
        message.setSubject("Mã OTP đặt lại mật khẩu CGV Cinemas");
        message.setText("Mã OTP của bạn là: " + otp + "\n\nMã có hiệu lực trong "
                + otpExpirationMinutes + " phút. Không chia sẻ mã này với bất kỳ ai.");
        try {
            mailSender.send(message);
        } catch (RuntimeException exception) {
            clearResetOtp(email);
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể gửi OTP. Vui lòng kiểm tra cấu hình Gmail");
        }
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        var email = normalizeEmail(request.email());
        var otpHash = redisTemplate.opsForValue().get(resetOtpKey(email));
        if (otpHash == null) {
            clearResetOtp(email);
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "OTP không tồn tại hoặc đã hết hạn");
        }
        if (currentResetAttempts(email) >= MAX_RESET_OTP_ATTEMPTS) {
            clearResetOtp(email);
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Bạn đã nhập sai OTP quá nhiều lần");
        }
        if (!passwordEncoder.matches(request.otp(), otpHash)) {
            var attempts = increaseResetAttempts(email);
            if (attempts >= MAX_RESET_OTP_ATTEMPTS) {
                clearResetOtp(email);
                throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Bạn đã nhập sai OTP quá nhiều lần");
            }
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "OTP không chính xác");
        }
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.BUSINESS_ERROR, "OTP không hợp lệ"));
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        tokenBlacklistService.revokeAllUserTokens(email);
        clearResetOtp(email);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private int currentResetAttempts(String email) {
        var attempts = redisTemplate.opsForValue().get(resetAttemptsKey(email));
        if (attempts == null) return 0;
        try {
            return Integer.parseInt(attempts);
        } catch (NumberFormatException exception) {
            clearResetOtp(email);
            return 0;
        }
    }

    private long increaseResetAttempts(String email) {
        var ttl = Duration.ofMinutes(otpExpirationMinutes);
        var attempts = redisTemplate.execute(
                INCREMENT_ATTEMPTS_SCRIPT,
                Collections.singletonList(resetAttemptsKey(email)),
                Long.toString(ttl.toMillis()));
        return attempts == null ? 0 : attempts;
    }

    private void clearResetOtp(String email) {
        redisTemplate.delete(java.util.List.of(
                resetOtpKey(email),
                resetAttemptsKey(email),
                resetResendKey(email)));
    }

    private String resetOtpKey(String email) {
        return RESET_OTP_PREFIX + email;
    }

    private String resetAttemptsKey(String email) {
        return RESET_ATTEMPTS_PREFIX + email;
    }

    private String resetResendKey(String email) {
        return RESET_RESEND_PREFIX + email;
    }

    private AuthResponse tokens(String email) {
        var user = userRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        var sessionVersion = tokenBlacklistService.currentSessionVersion(email);
        return new AuthResponse(jwtUtil.generateAccessToken(email, sessionVersion),
                jwtUtil.generateRefreshToken(email, sessionVersion), userMapper.toResponse(user));
    }

    private void validateToken(String token, String type, String message) {
        if (!jwtUtil.isValid(token)
                || !jwtUtil.isTokenType(token, type)
                || !tokenBlacklistService.isSessionVersionValid(
                        jwtUtil.extractSubject(token), jwtUtil.extractSessionVersion(token))) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, message);
        }
    }
}

