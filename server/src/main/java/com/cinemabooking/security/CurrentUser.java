package com.cinemabooking.security;

public final class CurrentUser {
    private CurrentUser() {
    }

    public static String email() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? null : authentication.getName();
    }
}

