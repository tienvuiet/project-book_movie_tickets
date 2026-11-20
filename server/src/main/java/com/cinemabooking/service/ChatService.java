package com.cinemabooking.service;

import com.cinemabooking.dto.request.AssignChatConversationRequest;
import com.cinemabooking.dto.request.ChatMessageRequest;
import com.cinemabooking.dto.request.CreateChatConversationRequest;
import com.cinemabooking.dto.request.MarkChatReadRequest;
import com.cinemabooking.dto.response.ChatContextResponse;
import com.cinemabooking.dto.response.ChatConversationResponse;
import com.cinemabooking.dto.response.SendChatMessageResponse;
import com.cinemabooking.enums.ChatConversationStatus;
import com.cinemabooking.enums.ChatSubject;

public interface ChatService {
    ChatContextResponse resolveContext(Long cinemaId, Long showtimeId, Long bookingId);
    com.cinemabooking.dto.response.ChatUnreadCountResponse getUnreadCount();
    ChatConversationResponse createConversation(CreateChatConversationRequest request);
    com.cinemabooking.dto.response.CursorPageResponse<com.cinemabooking.dto.response.ChatConversationSummaryResponse>
    getMyConversations(String cursor, int size);
    ChatConversationResponse getConversation(Long id);
    com.cinemabooking.dto.response.ChatMessagePageResponse getMessages(Long id, Long beforeId, int size);
    void markRead(Long id, MarkChatReadRequest request);
    SendChatMessageResponse sendMessage(Long id, ChatMessageRequest request);
    ChatConversationResponse closeConversation(Long id);
    ChatConversationResponse reopenConversation(Long id);
    com.cinemabooking.dto.response.CursorPageResponse<com.cinemabooking.dto.response.ChatConversationSummaryResponse>
    getStaffConversations(ChatConversationStatus status, Boolean mine, ChatSubject subject, Boolean hasBooking,
                          String cursor, int size);
    ChatConversationResponse acceptConversation(Long id);
    ChatConversationResponse resolveConversation(Long id);
    com.cinemabooking.dto.response.CursorPageResponse<com.cinemabooking.dto.response.ChatConversationSummaryResponse>
    getAdminConversations(ChatConversationStatus status, Long cinemaId, String cursor, int size);
    ChatConversationResponse assignConversation(Long id, AssignChatConversationRequest request);
}
