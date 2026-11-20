package com.cinemabooking.dto.request;

import com.cinemabooking.enums.PaymentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PaymentConfirmRequest(@NotNull Long paymentId, @NotNull PaymentStatus status, @NotBlank String transactionId) {
}

