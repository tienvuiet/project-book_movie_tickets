package com.cinemabooking.controller;

import com.cinemabooking.dto.request.*;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.service.CinemaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
public class CinemaController {
    private final CinemaService service;
    @GetMapping("/api/cinemas") public ApiResponse<Object> cinemas(){ return ApiResponse.success(service.getCinemas()); }
    @PostMapping("/api/cinemas") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> createCinema(@Valid @RequestBody CinemaRequest r){ return ApiResponse.success(service.createCinema(r)); }
    @PutMapping("/api/cinemas/{id}") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> updateCinema(@PathVariable Long id,@Valid @RequestBody CinemaRequest r){ return ApiResponse.success(service.updateCinema(id, r)); }
    @DeleteMapping("/api/cinemas/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> deleteCinema(@PathVariable Long id){ return ApiResponse.success(service.deleteCinema(id)); }
    @GetMapping("/api/cinemas/{cinemaId}/rooms") public ApiResponse<Object> rooms(@PathVariable Long cinemaId){ return ApiResponse.success(service.getRooms(cinemaId)); }
    @PostMapping("/api/cinemas/{cinemaId}/rooms") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> createRoom(@PathVariable Long cinemaId,@Valid @RequestBody CinemaRoomRequest r){ return ApiResponse.success(service.createRoom(cinemaId, r)); }
    @PutMapping("/api/cinemas/{cinemaId}/rooms/{roomId}") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> updateRoom(@PathVariable Long cinemaId,@PathVariable Long roomId,@Valid @RequestBody CinemaRoomRequest r){ return ApiResponse.success(service.updateRoom(cinemaId, roomId, r)); }
    @DeleteMapping("/api/cinemas/{cinemaId}/rooms/{roomId}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> deleteRoom(@PathVariable Long cinemaId,@PathVariable Long roomId){ return ApiResponse.success(service.deleteRoom(cinemaId, roomId)); }
    @GetMapping("/api/rooms/{roomId}/seats") public ApiResponse<Object> seats(@PathVariable Long roomId){ return ApiResponse.success(service.getSeats(roomId)); }
    @PostMapping("/api/rooms/{roomId}/seats") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> createSeat(@PathVariable Long roomId,@Valid @RequestBody SeatRequest r){ return ApiResponse.success(service.createSeat(roomId, r)); }
    @PostMapping("/api/rooms/{roomId}/seats/bulk") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> createSeatsBulk(@PathVariable Long roomId,@Valid @RequestBody BulkSeatRequest r){ return ApiResponse.success(service.createSeatsBulk(roomId, r)); }
    @PutMapping("/api/rooms/{roomId}/seats/{seatId}") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> updateSeat(@PathVariable Long roomId,@PathVariable Long seatId,@Valid @RequestBody SeatRequest r){ return ApiResponse.success(service.updateSeat(roomId, seatId, r)); }
    @DeleteMapping("/api/rooms/{roomId}/seats/{seatId}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> deleteSeat(@PathVariable Long roomId,@PathVariable Long seatId){ return ApiResponse.success(service.deleteSeat(roomId, seatId)); }
}

