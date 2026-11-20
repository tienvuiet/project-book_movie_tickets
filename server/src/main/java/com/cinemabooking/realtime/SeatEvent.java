package com.cinemabooking.realtime;

import java.util.List;

public record SeatEvent(
        SeatEventType type,
        Long showtimeId,
        List<Long> seatIds,
        String expiresAt,
        String reservationClientId
) {
    public SeatEvent(SeatEventType type, Long showtimeId, List<Long> seatIds, String expiresAt) {
        this(type, showtimeId, seatIds, expiresAt, null);
    }

    public SeatEvent {
        seatIds = List.copyOf(seatIds);
    }
}
