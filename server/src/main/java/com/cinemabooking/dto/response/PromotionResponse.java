package com.cinemabooking.dto.response;

import com.cinemabooking.enums.PromotionDiscountType;
import com.cinemabooking.enums.PromotionScope;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

public record PromotionResponse(
        Long id,
        String code,
        String name,
        String description,
        String imageUrl,
        boolean active,
        String status,
        PromotionDiscountType discountType,
        BigDecimal discountValue,
        BigDecimal maxDiscount,
        BigDecimal minOrderValue,
        LocalDateTime startDate,
        LocalDateTime endDate,
        Set<Integer> weekdays,
        PromotionScope applyToMovies,
        PromotionScope applyCinemas,
        Set<Long> movieIds,
        Set<Long> cinemaIds,
        Long maxUsage,
        Long usedCount,
        Integer maxPerUser,
        boolean allowStack,
        boolean requireLogin,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        BigDecimal totalDiscount) {
}
