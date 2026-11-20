package com.cinemabooking.dto.response;

import com.cinemabooking.enums.BookingStatus;
import com.cinemabooking.enums.PaymentMethod;
import com.cinemabooking.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ChatBookingResponse(
        Long id,
        String bookingCode,
        String movieTitle,
        String moviePoster,
        String cinemaName,
        String roomName,
        LocalDateTime showtime,
        List<String> seats,
        BigDecimal totalAmount,
        BookingStatus bookingStatus,
        PaymentMethod paymentMethod,
        PaymentStatus paymentStatus
) {
}
