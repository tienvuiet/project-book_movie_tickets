ALTER TABLE chat_messages
    ADD COLUMN client_message_id CHAR(36) NULL;

CREATE UNIQUE INDEX uk_chat_message_client_id
    ON chat_messages(conversation_id, client_message_id);
