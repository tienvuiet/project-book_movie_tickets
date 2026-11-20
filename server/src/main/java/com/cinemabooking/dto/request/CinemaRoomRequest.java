package com.cinemabooking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record CinemaRoomRequest(@NotBlank String name, @PositiveOrZero Integer totalSeats, Boolean active) {
}

