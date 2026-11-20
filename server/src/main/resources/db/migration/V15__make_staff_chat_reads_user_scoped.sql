ALTER TABLE chat_conversations
    ADD COLUMN queue_unread_count INT NOT NULL DEFAULT 0,
    ADD COLUMN read_state_updated_at DATETIME(6) NULL;

ALTER TABLE chat_conversation_reads
    MODIFY COLUMN last_read_message_id BIGINT NULL,
    ADD COLUMN unread_count INT NOT NULL DEFAULT 0,
    ADD COLUMN updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);

UPDATE chat_conversations
SET queue_unread_count = staff_unread_count
WHERE assigned_staff_id IS NULL;

INSERT INTO chat_conversation_reads (
    conversation_id, user_id, last_read_message_id, unread_count, read_at, updated_at
)
SELECT
    id, assigned_staff_id, staff_last_read_message_id, staff_unread_count,
    staff_read_at, CURRENT_TIMESTAMP(6)
FROM chat_conversations
WHERE assigned_staff_id IS NOT NULL
ON DUPLICATE KEY UPDATE
    last_read_message_id = COALESCE(chat_conversation_reads.last_read_message_id, VALUES(last_read_message_id)),
    unread_count = GREATEST(chat_conversation_reads.unread_count, VALUES(unread_count)),
    read_at = COALESCE(chat_conversation_reads.read_at, VALUES(read_at)),
    updated_at = CURRENT_TIMESTAMP(6);

CREATE INDEX idx_chat_read_user_unread
    ON chat_conversation_reads(user_id, unread_count);
