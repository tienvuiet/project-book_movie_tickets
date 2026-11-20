package com.cinemabooking.service;

import com.cinemabooking.dto.response.ChatConversationSummaryResponse;
import com.cinemabooking.dto.response.ChatEventResponse;
import com.cinemabooking.enums.ChatConversationStatus;
import com.cinemabooking.enums.ChatSourcePage;
import com.cinemabooking.enums.ChatSubject;

import java.time.Instant;
import java.time.LocalDateTime;

public final class ChatRealtimeTestData {
    private ChatRealtimeTestData() {
    }

    public static ChatEventResponse event() {
        var now = LocalDateTime.now();
        var summary = new ChatConversationSummaryResponse(
                100L, 3L, 10L, "Khách hàng", "customer@example.com", null,
                5L, "Rạp 1", null, null,
                20L, "Nhân viên", ChatSubject.BOOKING, ChatSourcePage.HOME,
                ChatConversationStatus.IN_PROGRESS, now, now, null, null,
                null, null, "Tin nhắn mới", "CUSTOMER", 1,
                null, null, null, null);
        return new ChatEventResponse("event-1", "MESSAGE_CREATED", 100L, 3L, summary, null,
                0, 1, 0, 0, 0, null, null, null, null, Instant.now());
    }
}
