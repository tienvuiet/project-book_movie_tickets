package com.cinemabooking.dto.request;

import com.cinemabooking.enums.CinemaStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record CinemaRequest(
        @NotBlank String name,
        @NotBlank String address,
        String phone,
        CinemaStatus status,
        @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude
) {
}

