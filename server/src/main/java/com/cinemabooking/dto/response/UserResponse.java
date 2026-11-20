package com.cinemabooking.dto.response;

import java.util.Set;

import com.cinemabooking.enums.UserStatus;

public record UserResponse(Long id, String email, String fullName, String phone, UserStatus status, Set<String> roles, Long cinemaId, String cinemaName) {
}

