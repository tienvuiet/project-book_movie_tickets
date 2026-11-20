package com.cinemabooking.dto.response;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public record ChatEventResponse(
        String eventId,
        String type,
        Long conversationId,
        Long conversationVersion,
        ChatConversationSummaryResponse summary,
        ChatMessageResponse message,
        int customerUnreadCount,
        int staffUnreadCount,
        int queueUnreadCount,
        long customerTotalUnread,
        long staffTotalUnread,
        Long readerId,
        String readerRole,
        Long lastReadMessageId,
        LocalDateTime readAt,
        Instant occurredAt
) {
    public static ChatEventResponse delta(String type, ChatConversationSummaryResponse summary,
                                          ChatMessageResponse message, int customerUnreadCount,
                                          int staffUnreadCount, int queueUnreadCount, long customerTotalUnread,
                                          long staffTotalUnread, Long readerId, String readerRole,
                                          Long lastReadMessageId, LocalDateTime readAt) {
        return new ChatEventResponse(UUID.randomUUID().toString(), type, summary.id(), summary.version(),
                summary, message, customerUnreadCount, staffUnreadCount, queueUnreadCount,
                customerTotalUnread, staffTotalUnread, readerId, readerRole,
                lastReadMessageId, readAt, Instant.now());
    }

    public ChatEventResponse withStaffTotalUnread(long totalUnread) {
        return new ChatEventResponse(eventId, type, conversationId, conversationVersion, summary, message,
                customerUnreadCount, staffUnreadCount, queueUnreadCount, customerTotalUnread, totalUnread,
                readerId, readerRole, lastReadMessageId, readAt, occurredAt);
    }
}
