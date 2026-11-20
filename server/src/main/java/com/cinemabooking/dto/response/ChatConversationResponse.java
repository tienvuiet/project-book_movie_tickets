package com.cinemabooking.dto.response;

import com.cinemabooking.enums.ChatConversationStatus;
import com.cinemabooking.enums.ChatSourcePage;
import com.cinemabooking.enums.ChatSubject;

import java.time.LocalDateTime;
import java.util.List;

public record ChatConversationResponse(
        Long id,
        Long version,
        Long customerId,
        String customerName,
        String customerEmail,
        String customerPhone,
        Long cinemaId,
        String cinemaName,
        String cinemaAddress,
        String cinemaPhone,
        Long assignedStaffId,
        String assignedStaffName,
        ChatSubject subject,
        ChatSourcePage sourcePage,
        ChatConversationStatus status,
        LocalDateTime lastMessageAt,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt,
        LocalDateTime closedAt,
        ChatBookingResponse booking,
        List<ChatMessageResponse> messages,
        Long nextBeforeId,
        boolean messagesHasMore,
        long totalContacts,
        Long customerLastReadMessageId,
        Long staffLastReadMessageId,
        LocalDateTime customerReadAt,
        LocalDateTime staffReadAt
) {
}
