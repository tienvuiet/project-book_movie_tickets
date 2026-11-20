package com.cinemabooking.dto.response;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(boolean success, String message, T data, String errorCode, Object details, Instant timestamp) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Thao tác thành công", data, null, null, Instant.now());
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, null, null, Instant.now());
    }

    public static ApiResponse<Void> error(String errorCode, String message, Object details) {
        return new ApiResponse<>(false, message, null, errorCode, details, Instant.now());
    }
}

