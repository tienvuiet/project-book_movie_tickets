CREATE TABLE chat_conversations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    cinema_id BIGINT NOT NULL,
    booking_id BIGINT NULL,
    assigned_staff_id BIGINT NULL,
    subject VARCHAR(30) NOT NULL,
    source_page VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_message_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    resolved_at DATETIME(6) NULL,
    closed_at DATETIME(6) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_chat_conversation_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_chat_conversation_cinema FOREIGN KEY (cinema_id) REFERENCES cinemas(id),
    CONSTRAINT fk_chat_conversation_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT fk_chat_conversation_staff FOREIGN KEY (assigned_staff_id) REFERENCES users(id)
);

CREATE INDEX idx_chat_customer_last_message ON chat_conversations(customer_id, last_message_at);
CREATE INDEX idx_chat_cinema_status_last_message ON chat_conversations(cinema_id, status, last_message_at);
CREATE INDEX idx_chat_assigned_staff_status ON chat_conversations(assigned_staff_id, status);
CREATE INDEX idx_chat_booking ON chat_conversations(booking_id);

CREATE TABLE chat_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NULL,
    content VARCHAR(2000) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_chat_message_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id),
    CONSTRAINT fk_chat_message_sender FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE INDEX idx_chat_message_conversation_created ON chat_messages(conversation_id, created_at, id);
