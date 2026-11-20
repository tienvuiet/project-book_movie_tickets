CREATE INDEX idx_bookings_status_expires_at
    ON bookings(status, expires_at);

CREATE INDEX idx_bookings_showtime_status_expires_at
    ON bookings(showtime_id, status, expires_at);

CREATE INDEX idx_booking_seats_seat_id
    ON booking_seats(seat_id);
