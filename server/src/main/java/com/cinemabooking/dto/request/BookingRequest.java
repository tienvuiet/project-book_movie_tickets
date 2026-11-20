package com.cinemabooking.dto.request;

import java.util.Set;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record BookingRequest(
        @NotNull Long showtimeId,
        @NotEmpty Set<Long> seatIds,
        String promoCode,
        String reservationClientId) {
    public BookingRequest(Long showtimeId, Set<Long> seatIds, String promoCode) {
        this(showtimeId, seatIds, promoCode, null);
    }
}

