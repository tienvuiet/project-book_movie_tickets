package com.cinemabooking.dto.request;

import com.cinemabooking.enums.PromotionDiscountType;
import com.cinemabooking.enums.PromotionScope;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

public record PromotionRequest(
        @NotBlank
        @Pattern(regexp = "^[A-Z0-9_]{3,30}$", message = "Mã chỉ gồm chữ hoa, số, dấu _ (3-30 ký tự)")
        String code,
        @NotBlank @Size(max = 160) String name,
        @Size(max = 2000) String description,
        @NotBlank @Size(max = 500) String imageUrl,
        boolean active,
        @NotNull PromotionDiscountType discountType,
        @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal discountValue,
        @DecimalMin("0") BigDecimal maxDiscount,
        @DecimalMin("0") BigDecimal minOrderValue,
        @NotNull LocalDateTime startDate,
        @NotNull LocalDateTime endDate,
        Set<@Min(0) @Max(6) Integer> weekdays,
        PromotionScope applyToMovies,
        PromotionScope applyCinemas,
        Set<Long> movieIds,
        Set<Long> cinemaIds,
        @NotNull @Positive Long maxUsage,
        @NotNull @Positive Integer maxPerUser,
        boolean allowStack,
        boolean requireLogin) {

    @AssertTrue(message = "Ngày kết thúc phải sau ngày bắt đầu")
    public boolean isDateRangeValid() {
        return startDate == null || endDate == null || endDate.isAfter(startDate);
    }
}
