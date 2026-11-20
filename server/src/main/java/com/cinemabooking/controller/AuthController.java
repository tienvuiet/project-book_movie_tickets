package com.cinemabooking.controller;

import com.cinemabooking.dto.request.*;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.dto.response.AuthResponse;
import com.cinemabooking.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    @PostMapping("/register") public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) { return ApiResponse.success(authService.register(request)); }
    @PostMapping("/login") public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) { return ApiResponse.success(authService.login(request)); }
    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request, authorization.substring(7));
        return ApiResponse.success(null);
    }
    @PostMapping("/refresh-token") public ApiResponse<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) { return ApiResponse.success(authService.refreshToken(request)); }
    @PostMapping("/change-password") public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) { authService.changePassword(request); return ApiResponse.success(null); }
    @PostMapping("/forgot-password") public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) { authService.forgotPassword(request); return ApiResponse.success(null); }
    @PostMapping("/reset-password") public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) { authService.resetPassword(request); return ApiResponse.success(null); }
}

