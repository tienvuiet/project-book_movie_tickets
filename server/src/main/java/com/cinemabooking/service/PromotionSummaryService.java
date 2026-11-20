package com.cinemabooking.service;

import com.cinemabooking.dto.response.PromotionSummaryResponse;
import com.cinemabooking.repository.BookingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;

@Service
public class PromotionSummaryService {
    private static final long CACHE_TTL_NANOS = Duration.ofSeconds(30).toNanos();

    private final BookingRepository bookingRepository;
    private CachedSummary cachedSummary;

    public PromotionSummaryService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @Transactional(readOnly = true)
    public synchronized PromotionSummaryResponse getSummary() {
        var now = System.nanoTime();
        if (cachedSummary != null && now - cachedSummary.loadedAtNanos() < CACHE_TTL_NANOS) {
            return cachedSummary.value();
        }

        var aggregate = bookingRepository.summarizeSuccessfulPromotionUsage();
        var totalUsed = aggregate == null || aggregate.getTotalUsed() == null
                ? "0"
                : aggregate.getTotalUsed().toString();
        var totalDiscount = aggregate == null || aggregate.getTotalDiscount() == null
                ? BigDecimal.ZERO
                : aggregate.getTotalDiscount();
        var response = new PromotionSummaryResponse(totalUsed, totalDiscount.toPlainString());
        cachedSummary = new CachedSummary(response, now);
        return response;
    }

    private record CachedSummary(PromotionSummaryResponse value, long loadedAtNanos) {
    }
}
