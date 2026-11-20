package com.cinemabooking.controller;

import com.cinemabooking.dto.request.ChatMessageRequest;
import com.cinemabooking.dto.request.CreateChatConversationRequest;
import com.cinemabooking.dto.request.MarkChatReadRequest;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {
    private final ChatService service;

    @GetMapping("/unread-count")
    public ApiResponse<Object> unreadCount() {
        return ApiResponse.success(service.getUnreadCount());
    }

    @GetMapping("/context")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<Object> context(@RequestParam(required = false) Long cinemaId,
                                       @RequestParam(required = false) Long showtimeId,
                                       @RequestParam(required = false) Long bookingId) {
        return ApiResponse.success(service.resolveContext(cinemaId, showtimeId, bookingId));
    }

    @PostMapping("/conversations")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<Object> create(@Valid @RequestBody CreateChatConversationRequest request) {
        return ApiResponse.success("Đã gửi yêu cầu hỗ trợ đến rạp", service.createConversation(request));
    }

    @GetMapping("/conversations/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<Object> mine(@RequestParam(required = false) String cursor,
                                    @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.getMyConversations(cursor, size));
    }

    @GetMapping("/conversations/{id}")
    public ApiResponse<Object> get(@PathVariable Long id) {
        return ApiResponse.success(service.getConversation(id));
    }

    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<Object> messages(@PathVariable Long id,
                                        @RequestParam(required = false) Long beforeId,
                                        @RequestParam(defaultValue = "30") int size) {
        return ApiResponse.success(service.getMessages(id, beforeId, size));
    }

    @PutMapping("/conversations/{id}/read")
    public ApiResponse<Object> markRead(@PathVariable Long id, @Valid @RequestBody MarkChatReadRequest request) {
        service.markRead(id, request);
        return ApiResponse.success("Đã đánh dấu cuộc trò chuyện là đã đọc", null);
    }

    @PostMapping("/conversations/{id}/messages")
    public ApiResponse<Object> send(@PathVariable Long id, @Valid @RequestBody ChatMessageRequest request) {
        return ApiResponse.success(service.sendMessage(id, request));
    }

    @PutMapping("/conversations/{id}/close")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<Object> close(@PathVariable Long id) {
        return ApiResponse.success(service.closeConversation(id));
    }

    @PutMapping("/conversations/{id}/reopen")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<Object> reopen(@PathVariable Long id) {
        return ApiResponse.success(service.reopenConversation(id));
    }
}
