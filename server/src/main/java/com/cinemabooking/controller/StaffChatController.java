package com.cinemabooking.controller;

import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.enums.ChatConversationStatus;
import com.cinemabooking.enums.ChatSubject;
import com.cinemabooking.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/chat/conversations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STAFF')")
public class StaffChatController {
    private final ChatService service;

    @GetMapping
    public ApiResponse<Object> list(@RequestParam(required = false) ChatConversationStatus status,
                                    @RequestParam(required = false) Boolean mine,
                                    @RequestParam(required = false) ChatSubject subject,
                                    @RequestParam(required = false) Boolean hasBooking,
                                    @RequestParam(required = false) String cursor,
                                    @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.getStaffConversations(status, mine, subject, hasBooking, cursor, size));
    }

    @PutMapping("/{id}/accept")
    public ApiResponse<Object> accept(@PathVariable Long id) {
        return ApiResponse.success("Đã tiếp nhận cuộc trò chuyện", service.acceptConversation(id));
    }

    @PutMapping("/{id}/resolve")
    public ApiResponse<Object> resolve(@PathVariable Long id) {
        return ApiResponse.success("Đã đánh dấu yêu cầu được giải quyết", service.resolveConversation(id));
    }
}
