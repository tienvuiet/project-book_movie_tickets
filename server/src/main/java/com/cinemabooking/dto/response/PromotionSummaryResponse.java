package com.cinemabooking.dto.response;

/**
 * Chuỗi số được dùng để không mất chính xác khi tổng vượt giới hạn số an toàn của JavaScript.
 */
public record PromotionSummaryResponse(String totalUsed, String totalDiscount) {
}
