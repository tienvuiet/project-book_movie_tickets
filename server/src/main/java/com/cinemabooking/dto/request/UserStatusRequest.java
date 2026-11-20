package com.cinemabooking.dto.request;

import com.cinemabooking.enums.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UserStatusRequest(@NotNull UserStatus status) {
}

