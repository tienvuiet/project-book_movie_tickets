package com.cinemabooking.controller;

import com.cinemabooking.dto.request.AssignChatConversationRequest;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.enums.ChatConversationStatus;
import com.cinemabooking.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/chat/conversations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminChatController {
    private final ChatService service;

    @GetMapping
    public ApiResponse<Object> list(@RequestParam(required = false) ChatConversationStatus status,
                                    @RequestParam(required = false) Long cinemaId,
                                    @RequestParam(required = false) String cursor,
                                    @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.getAdminConversations(status, cinemaId, cursor, size));
    }

    @PutMapping("/{id}/assign")
    public ApiResponse<Object> assign(@PathVariable Long id,
                                      @Valid @RequestBody AssignChatConversationRequest request) {
        return ApiResponse.success(service.assignConversation(id, request));
    }

    @PutMapping("/{id}/resolve")
    public ApiResponse<Object> resolve(@PathVariable Long id) {
        return ApiResponse.success(service.resolveConversation(id));
    }
}
