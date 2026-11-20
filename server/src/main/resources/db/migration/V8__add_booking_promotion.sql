ALTER TABLE bookings
    ADD COLUMN promo_code VARCHAR(30) NULL AFTER total_amount,
    ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER promo_code;
