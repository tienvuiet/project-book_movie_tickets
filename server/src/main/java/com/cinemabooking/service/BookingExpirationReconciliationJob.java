package com.cinemabooking.service;

import com.cinemabooking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingExpirationReconciliationJob {
    private final BookingRepository bookingRepository;

    @Scheduled(
            fixedDelayString = "${app.booking.expiration-reconciliation-delay-ms:30000}",
            initialDelayString = "${app.booking.expiration-reconciliation-initial-delay-ms:10000}")
    @Transactional
    public void expirePendingBookings() {
        var expiredCount = bookingRepository.expirePendingBookings(LocalDateTime.now());
        if (expiredCount > 0) {
            log.info("Reconciled {} expired PENDING booking(s)", expiredCount);
        }
    }
}
