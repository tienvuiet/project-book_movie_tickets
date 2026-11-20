package com.cinemabooking.dto.request;

import java.util.Set;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserRequest(@Email @NotBlank String email, @Size(min = 6, max = 100) String password, @NotBlank String fullName, String phone, Set<String> roles, Long cinemaId) {
}

