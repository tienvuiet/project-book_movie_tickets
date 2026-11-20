ALTER TABLE chat_conversations
    ADD COLUMN customer_last_read_message_id BIGINT NULL,
    ADD COLUMN staff_last_read_message_id BIGINT NULL,
    ADD COLUMN customer_read_at DATETIME(6) NULL,
    ADD COLUMN staff_read_at DATETIME(6) NULL;

CREATE TABLE chat_conversation_reads (
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    last_read_message_id BIGINT NOT NULL,
    read_at DATETIME(6) NOT NULL,
    PRIMARY KEY (conversation_id, user_id),
    CONSTRAINT fk_chat_read_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id),
    CONSTRAINT fk_chat_read_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_chat_read_message FOREIGN KEY (last_read_message_id) REFERENCES chat_messages(id)
);

CREATE INDEX idx_chat_read_user_conversation
    ON chat_conversation_reads(user_id, conversation_id);
