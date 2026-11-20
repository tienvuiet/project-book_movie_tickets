package com.cinemabooking.service;

import com.cinemabooking.dto.request.BookingRequest;
import com.cinemabooking.dto.request.PromoCodeRequest;

public interface BookingService {
    Object createBooking(BookingRequest request);
    Object getBooking(Long id);
    Object getBookingByCode(String bookingCode);
    Object getMyBookings();
    Object getAllBookings();
    Object getStaffBookings();
    Object cancelBooking(Long id);
    Object adminCancelBooking(Long id);
    Object checkinBooking(Long id);
    Object applyPromoCode(Long id, PromoCodeRequest request);
    Object removePromoCode(Long id);
}


