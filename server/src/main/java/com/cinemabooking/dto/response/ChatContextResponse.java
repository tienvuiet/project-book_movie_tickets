package com.cinemabooking.dto.response;

public record ChatContextResponse(
        Long cinemaId,
        String cinemaName,
        String cinemaAddress,
        String cinemaPhone,
        boolean staffOnline,
        Long bookingId,
        ChatBookingResponse booking
) {
}
