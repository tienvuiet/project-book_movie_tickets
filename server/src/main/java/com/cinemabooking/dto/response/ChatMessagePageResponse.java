package com.cinemabooking.dto.response;

import java.util.List;

public record ChatMessagePageResponse(
        List<ChatMessageResponse> items,
        Long nextBeforeId,
        boolean hasMore
) {
}
