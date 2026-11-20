package com.cinemabooking.dto.request;

import com.cinemabooking.enums.SeatType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record SeatRequest(@NotBlank String row, @NotNull @Positive Integer number, SeatType type, Boolean active) {
}

