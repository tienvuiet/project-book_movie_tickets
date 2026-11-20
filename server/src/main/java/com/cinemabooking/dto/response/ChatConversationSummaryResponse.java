package com.cinemabooking.dto.response;

import com.cinemabooking.enums.ChatConversationStatus;
import com.cinemabooking.enums.ChatSourcePage;
import com.cinemabooking.enums.ChatSubject;

import java.time.LocalDateTime;

public record ChatConversationSummaryResponse(
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
        Long bookingId,
        String bookingCode,
        String lastMessageContent,
        String lastMessageSenderRole,
        int unreadCount,
        Long customerLastReadMessageId,
        Long staffLastReadMessageId,
        LocalDateTime customerReadAt,
        LocalDateTime staffReadAt
) {
}
