-- Cover the aggregate dashboard query without loading booking rows from the table.
CREATE INDEX idx_bookings_promotion_summary
    ON bookings(status, promo_code, discount_amount);
