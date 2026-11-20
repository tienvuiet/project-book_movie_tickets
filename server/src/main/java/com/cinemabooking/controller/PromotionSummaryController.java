package com.cinemabooking.controller;

import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.dto.response.PromotionSummaryResponse;
import com.cinemabooking.service.PromotionSummaryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/promotions")
public class PromotionSummaryController {
    private final PromotionSummaryService promotionSummaryService;

    public PromotionSummaryController(PromotionSummaryService promotionSummaryService) {
        this.promotionSummaryService = promotionSummaryService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PromotionSummaryResponse> getSummary() {
        return ApiResponse.success(promotionSummaryService.getSummary());
    }
}
