package com.cinemabooking.controller;

import com.cinemabooking.dto.request.PromotionActiveRequest;
import com.cinemabooking.dto.request.PromotionRequest;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.service.PromotionManagementService;
import com.cinemabooking.enums.PromotionDiscountType;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/promotions")
public class PromotionController {
    private final PromotionManagementService promotionService;

    public PromotionController(PromotionManagementService promotionService) {
        this.promotionService = promotionService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) PromotionDiscountType discountType) {
        return ApiResponse.success(promotionService.getAll(page, size, search, status, discountType));
    }

    @GetMapping("/available")
    public ApiResponse<Object> available(
            @RequestParam(required = false) BigDecimal orderAmount,
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long cinemaId) {
        return ApiResponse.success(promotionService.getAvailable(orderAmount, movieId, cinemaId));
    }

    @GetMapping("/validate")
    public ApiResponse<Object> validate(
            @RequestParam String code,
            @RequestParam(defaultValue = "0") BigDecimal orderAmount,
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long cinemaId) {
        return ApiResponse.success(promotionService.validateCode(code, orderAmount, movieId, cinemaId));
    }

    @GetMapping("/{id}")
    public ApiResponse<Object> get(@PathVariable Long id) {
        return ApiResponse.success(promotionService.getById(id));
    }

    @GetMapping("/{id}/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Object> stats(@PathVariable Long id) {
        return ApiResponse.success(promotionService.getStats(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Object> create(@Valid @RequestBody PromotionRequest request) {
        return ApiResponse.success("Tạo khuyến mãi thành công", promotionService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Object> update(@PathVariable Long id, @Valid @RequestBody PromotionRequest request) {
        return ApiResponse.success("Cập nhật khuyến mãi thành công", promotionService.update(id, request));
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Object> toggle(@PathVariable Long id, @RequestBody PromotionActiveRequest request) {
        return ApiResponse.success(promotionService.toggleActive(id, request.active()));
    }
}
