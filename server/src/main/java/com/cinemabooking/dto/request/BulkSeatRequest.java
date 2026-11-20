package com.cinemabooking.dto.request;

import com.cinemabooking.enums.SeatType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record BulkSeatRequest(
        @NotBlank String startRow,
        @NotBlank String endRow,
        @Min(1) @Max(30) int seatsPerRow,
        SeatType type,
        Boolean active
) {}
