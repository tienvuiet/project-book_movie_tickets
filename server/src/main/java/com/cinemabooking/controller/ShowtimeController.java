package com.cinemabooking.controller;

import com.cinemabooking.dto.request.ShowtimeRequest;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.service.ShowtimeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/showtimes") @RequiredArgsConstructor
public class ShowtimeController {
    private final ShowtimeService service;
    @GetMapping public ApiResponse<Object> list(){ return ApiResponse.success(service.getShowtimes()); }
    @GetMapping("/staff") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> staffList(){ return ApiResponse.success(service.getStaffShowtimes()); }
    @PostMapping @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> create(@Valid @RequestBody ShowtimeRequest request){ return ApiResponse.success(service.createShowtime(request)); }
    @PutMapping("/{id}") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> update(@PathVariable Long id, @Valid @RequestBody ShowtimeRequest request){ return ApiResponse.success(service.updateShowtime(id, request)); }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> delete(@PathVariable Long id){ return ApiResponse.success(service.deleteShowtime(id)); }
    @GetMapping("/{id}/seats") public ApiResponse<Object> seats(@PathVariable Long id){ return ApiResponse.success(service.getSeats(id)); }
    @GetMapping("/by-movie/{movieId}") public ApiResponse<Object> byMovie(@PathVariable Long movieId){ return ApiResponse.success(service.getByMovie(movieId)); }
}

