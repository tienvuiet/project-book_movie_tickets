package com.cinemabooking.service;

import com.cinemabooking.dto.request.ShowtimeRequest;

public interface ShowtimeService {
    Object getShowtimes();
    Object getStaffShowtimes();
    Object createShowtime(ShowtimeRequest request);
    Object updateShowtime(Long id, ShowtimeRequest request);
    Object deleteShowtime(Long id);
    Object getSeats(Long showtimeId);
    Object getByMovie(Long movieId);
}


