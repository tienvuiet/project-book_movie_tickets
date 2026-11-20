CREATE INDEX idx_payments_status_paid_at
    ON payments(status, paid_at);
