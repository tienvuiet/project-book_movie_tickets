ALTER TABLE chat_conversations
    ADD COLUMN last_message_id BIGINT NULL,
    ADD COLUMN last_message_content VARCHAR(500) NULL,
    ADD COLUMN last_message_sender_role VARCHAR(20) NULL,
    ADD COLUMN customer_unread_count INT NOT NULL DEFAULT 0,
    ADD COLUMN staff_unread_count INT NOT NULL DEFAULT 0;

UPDATE chat_conversations c
JOIN chat_messages m ON m.id = (
    SELECT m2.id
    FROM chat_messages m2
    WHERE m2.conversation_id = c.id
      AND m2.message_type = 'TEXT'
    ORDER BY m2.id DESC
    LIMIT 1
)
LEFT JOIN users u ON u.id = m.sender_id
SET c.last_message_id = m.id,
    c.last_message_content = LEFT(m.content, 500),
    c.last_message_sender_role = CASE
        WHEN m.sender_id = c.customer_id THEN 'CUSTOMER'
        WHEN m.sender_id IS NULL THEN 'SYSTEM'
        ELSE 'STAFF'
    END;

CREATE INDEX idx_chat_customer_cursor
    ON chat_conversations(customer_id, last_message_at, id);

CREATE INDEX idx_chat_cinema_cursor
    ON chat_conversations(cinema_id, last_message_at, id);

CREATE INDEX idx_chat_staff_cursor
    ON chat_conversations(assigned_staff_id, last_message_at, id);

CREATE INDEX idx_chat_message_cursor
    ON chat_messages(conversation_id, id);
