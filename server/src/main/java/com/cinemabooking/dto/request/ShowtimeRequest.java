package com.cinemabooking.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.cinemabooking.enums.ShowtimeStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ShowtimeRequest(@NotNull Long movieId, @NotNull Long roomId, @NotNull LocalDateTime startTime, @NotNull LocalDateTime endTime, @NotNull @Positive BigDecimal basePrice, ShowtimeStatus status) {
}

