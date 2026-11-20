ALTER TABLE payments ADD CONSTRAINT uk_payments_booking UNIQUE (booking_id);
