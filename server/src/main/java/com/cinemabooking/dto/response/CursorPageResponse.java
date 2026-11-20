package com.cinemabooking.dto.response;

import java.util.List;

public record CursorPageResponse<T>(List<T> items, String nextCursor, boolean hasMore, long totalUnread) {
}
