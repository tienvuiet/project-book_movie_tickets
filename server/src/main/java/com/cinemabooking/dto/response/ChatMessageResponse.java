package com.cinemabooking.dto.response;

import com.cinemabooking.enums.ChatMessageType;

import java.time.LocalDateTime;

public record ChatMessageResponse(
        Long id,
        Long senderId,
        String senderName,
        String senderRole,
        String content,
        ChatMessageType messageType,
        LocalDateTime createdAt
) {
}
