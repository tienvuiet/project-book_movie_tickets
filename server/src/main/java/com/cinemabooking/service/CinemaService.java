package com.cinemabooking.service;

import com.cinemabooking.dto.request.BulkSeatRequest;
import com.cinemabooking.dto.request.CinemaRequest;
import com.cinemabooking.dto.request.CinemaRoomRequest;
import com.cinemabooking.dto.request.SeatRequest;

public interface CinemaService {
    Object getCinemas();
    Object createCinema(CinemaRequest request);
    Object updateCinema(Long id, CinemaRequest request);
    Object deleteCinema(Long id);
    Object getRooms(Long cinemaId);
    Object createRoom(Long cinemaId, CinemaRoomRequest request);
    Object updateRoom(Long cinemaId, Long roomId, CinemaRoomRequest request);
    Object deleteRoom(Long cinemaId, Long roomId);
    Object getSeats(Long roomId);
    Object createSeat(Long roomId, SeatRequest request);
    Object createSeatsBulk(Long roomId, BulkSeatRequest request);
    Object updateSeat(Long roomId, Long seatId, SeatRequest request);
    Object deleteSeat(Long roomId, Long seatId);
}


