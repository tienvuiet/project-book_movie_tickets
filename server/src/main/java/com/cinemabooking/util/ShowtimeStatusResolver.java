package com.cinemabooking.util;

import com.cinemabooking.entity.Showtime;
import com.cinemabooking.enums.ShowtimeStatus;

import java.time.LocalDateTime;

public final class ShowtimeStatusResolver {
    private ShowtimeStatusResolver() {
    }

    public static ShowtimeStatus resolve(Showtime showtime) {
        if (showtime.getStatus() == ShowtimeStatus.CANCELLED) return ShowtimeStatus.CANCELLED;
        var now = LocalDateTime.now();
        if (now.isBefore(showtime.getStartTime())) return ShowtimeStatus.SCHEDULED;
        if (now.isBefore(showtime.getEndTime())) return ShowtimeStatus.ONGOING;
        return ShowtimeStatus.FINISHED;
    }
}
