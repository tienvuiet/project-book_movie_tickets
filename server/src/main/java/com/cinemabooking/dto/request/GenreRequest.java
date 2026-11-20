package com.cinemabooking.dto.request;

import com.cinemabooking.enums.GenreStatus;
import jakarta.validation.constraints.NotBlank;

public record GenreRequest(@NotBlank String name, String description, GenreStatus status) {
}

