package com.cinemabooking.dto.response;

import java.time.LocalDateTime;

public record SendChatMessageResponse(
        Long conversationId,
        Long conversationVersion,
        Long lastMessageId,
        LocalDateTime lastMessageAt,
        String lastMessageContent,
        ChatMessageResponse message
) {
}
