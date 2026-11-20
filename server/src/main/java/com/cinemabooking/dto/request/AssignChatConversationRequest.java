package com.cinemabooking.dto.request;

import jakarta.validation.constraints.NotNull;

public record AssignChatConversationRequest(@NotNull Long staffId) {
}
