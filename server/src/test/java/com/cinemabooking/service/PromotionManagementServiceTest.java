package com.cinemabooking.service;

import com.cinemabooking.entity.Promotion;
import com.cinemabooking.enums.PromotionDiscountType;
import com.cinemabooking.repository.PromotionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionManagementServiceTest {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-08-06T08:00:00Z"), BUSINESS_ZONE);
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 6, 15, 0);

    @Mock
    private PromotionRepository promotionRepository;

    private PromotionManagementService service;

    @BeforeEach
    void setUp() {
        service = new PromotionManagementService(promotionRepository, FIXED_CLOCK);
    }

    @ParameterizedTest
    @MethodSource("statusCases")
    void resolvesStatusUsingBusinessClock(boolean active, LocalDateTime startDate,
                                          LocalDateTime endDate, String expectedStatus) {
        var promotion = promotion(active, startDate, endDate);
        when(promotionRepository.findById(1L)).thenReturn(Optional.of(promotion));
        when(promotionRepository.summarizeUsageByCodes(anyCollection())).thenReturn(List.of());

        assertEquals(expectedStatus, service.getById(1L).status());
    }

    private static Stream<Arguments> statusCases() {
        return Stream.of(
                Arguments.of(false, NOW.minusDays(1), NOW.plusDays(20), "INACTIVE"),
                Arguments.of(true, NOW.plusHours(1), NOW.plusDays(20), "SCHEDULED"),
                Arguments.of(true, NOW.minusDays(1), NOW.minusSeconds(1), "EXPIRED"),
                Arguments.of(true, NOW.minusDays(1), NOW.plusDays(3), "EXPIRING_SOON"),
                Arguments.of(true, NOW.minusDays(1), NOW.plusDays(20), "ACTIVE")
        );
    }

    private static Promotion promotion(boolean active, LocalDateTime startDate, LocalDateTime endDate) {
        var promotion = new Promotion();
        promotion.setCode("PROMO_TEST");
        promotion.setName("Khuyến mãi kiểm thử");
        promotion.setImageUrl("https://example.com/promo.jpg");
        promotion.setActive(active);
        promotion.setDiscountType(PromotionDiscountType.PERCENT);
        promotion.setDiscountValue(BigDecimal.TEN);
        promotion.setMinOrderValue(BigDecimal.ZERO);
        promotion.setStartDate(startDate);
        promotion.setEndDate(endDate);
        promotion.setMaxUsage(100L);
        promotion.setMaxPerUser(1);
        return promotion;
    }
}
