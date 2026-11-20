package com.cinemabooking.dto.request;

import java.util.Set;

import jakarta.validation.constraints.NotEmpty;

public record UserRolesRequest(@NotEmpty Set<String> roles) {
}

