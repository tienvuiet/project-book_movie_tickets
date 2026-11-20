package com.cinemabooking.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PromoCodeRequest(@NotBlank String promoCode) {
}
