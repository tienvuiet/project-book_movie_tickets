package com.cinemabooking.controller;

import com.cinemabooking.dto.request.BookingRequest;
import com.cinemabooking.dto.request.PromoCodeRequest;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/bookings") @RequiredArgsConstructor
public class BookingController {
    private final BookingService service;
    @PostMapping @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','STAFF')") public ApiResponse<Object> create(@Valid @RequestBody BookingRequest request){ return ApiResponse.success(service.createBooking(request)); }
    @GetMapping("/me") public ApiResponse<Object> me(){ return ApiResponse.success(service.getMyBookings()); }
    @GetMapping @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> all(){ return ApiResponse.success(service.getAllBookings()); }
    @GetMapping("/staff") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> staffAll(){ return ApiResponse.success(service.getStaffBookings()); }
    @GetMapping("/code/{bookingCode}") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> getByCode(@PathVariable String bookingCode){ return ApiResponse.success(service.getBookingByCode(bookingCode)); }
    @GetMapping("/{id}") public ApiResponse<Object> get(@PathVariable Long id){ return ApiResponse.success(service.getBooking(id)); }
    @PutMapping("/{id}/cancel") public ApiResponse<Object> cancel(@PathVariable Long id){ return ApiResponse.success(service.cancelBooking(id)); }
    @PutMapping("/{id}/admin-cancel") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> adminCancel(@PathVariable Long id){ return ApiResponse.success(service.adminCancelBooking(id)); }
    @PutMapping("/{id}/checkin") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> checkin(@PathVariable Long id){ return ApiResponse.success(service.checkinBooking(id)); }
    @PutMapping("/{id}/promo") public ApiResponse<Object> applyPromo(@PathVariable Long id, @Valid @RequestBody PromoCodeRequest request){ return ApiResponse.success(service.applyPromoCode(id, request)); }
    @DeleteMapping("/{id}/promo") public ApiResponse<Object> removePromo(@PathVariable Long id){ return ApiResponse.success(service.removePromoCode(id)); }
}

