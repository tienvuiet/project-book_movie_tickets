package com.cinemabooking.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @Email @NotBlank String email,
        @Pattern(regexp = "\\d{6}", message = "OTP phải gồm 6 chữ số") String otp,
        @NotBlank @Size(min = 6, max = 100) String newPassword) {}
