CREATE TABLE chat_event_outbox (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id CHAR(36) NOT NULL,
    payload LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    claimed_by VARCHAR(80) NULL,
    claimed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_chat_event_outbox_event (event_id),
    INDEX idx_chat_event_outbox_pending (status, next_attempt_at, id),
    INDEX idx_chat_event_outbox_claim (claimed_by, status)
);
