ALTER TABLE payments
    ADD COLUMN provider_order_code BIGINT NULL,
    ADD COLUMN payment_link_id VARCHAR(120) NULL,
    ADD COLUMN provider_reference VARCHAR(120) NULL,
    ADD COLUMN checkout_url VARCHAR(500) NULL,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX uk_payments_provider_order_code
    ON payments(provider_order_code);
