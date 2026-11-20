package com.cinemabooking.controller;

import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.exception.ErrorCode;
import com.cinemabooking.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController @RequestMapping("/api/reports") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class ReportController {
    private final ReportService service;
    @GetMapping("/dashboard")
    public ApiResponse<Object> dashboard() {
        return ApiResponse.success(service.getDashboard());
    }

    @GetMapping("/revenue")
    public ApiResponse<Object> revenue(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        if (start.isAfter(end)) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        }
        if (start.plusYears(1).isBefore(end)) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Khoảng báo cáo không được vượt quá 1 năm");
        }
        return ApiResponse.success(service.getRevenue(start, end));
    }
}

