package com.cinemabooking.dto.request;

import com.cinemabooking.enums.ChatSourcePage;
import com.cinemabooking.enums.ChatSubject;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateChatConversationRequest(
        Long cinemaId,
        Long bookingId,
        @NotNull ChatSubject subject,
        @NotNull ChatSourcePage sourcePage,
        @NotBlank @Size(max = 2000) String content
) {
}
