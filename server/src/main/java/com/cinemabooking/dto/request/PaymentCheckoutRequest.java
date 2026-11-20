package com.cinemabooking.dto.request;

import com.cinemabooking.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record PaymentCheckoutRequest(@NotNull Long bookingId, @NotNull PaymentMethod method) {
}

