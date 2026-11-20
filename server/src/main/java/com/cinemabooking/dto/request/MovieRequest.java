package com.cinemabooking.dto.request;

import java.time.LocalDate;
import java.util.Set;

import com.cinemabooking.enums.MovieStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public record MovieRequest(@NotBlank String title, String description, @Positive Integer durationMinutes,
                           LocalDate releaseDate, String posterUrl, String backdropUrl,
                           @NotBlank @Pattern(regexp = "^(https?://)?(www\\.)?(youtube\\.com/(watch\\?v=|embed/|shorts/)|youtu\\.be/)[\\w-]{6,}.*$",
                                   message = "Trailer phải là link YouTube hợp lệ") String trailerUrl,
                           MovieStatus status, @NotEmpty Set<Long> genreIds) {
}

