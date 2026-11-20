package com.cinemabooking.service.impl;

import com.cinemabooking.dto.request.BookingRequest;
import com.cinemabooking.entity.*;
import com.cinemabooking.enums.*;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.realtime.SeatEventPublisher;
import com.cinemabooking.repository.*;
import com.cinemabooking.service.SeatLockService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceImplTest {
    @Mock ShowtimeRepository showtimeRepository;
    @Mock BookingSeatRepository bookingSeatRepository;
    @Mock BookingRepository bookingRepository;
    @Mock SeatRepository seatRepository;
    @Mock UserRepository userRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock SeatLockService seatLockService;
    @Mock SeatEventPublisher seatEventPublisher;
    @InjectMocks BookingServiceImpl service;

    @AfterEach void clearAuthentication() { SecurityContextHolder.clearContext(); }

    @Test
    void concurrentSeatReservationIsRejectedBeforeCreatingBooking() {
        authenticate("customer@example.com");
        var customer = User.builder().id(1L).email("customer@example.com").build();
        var showtime = showtime(10L, cinema(1L));
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(showtimeRepository.findById(10L)).thenReturn(Optional.of(showtime));
        when(bookingSeatRepository.existsReservedSeats(10L, Set.of(5L), Set.of(BookingStatus.PENDING, BookingStatus.PAID)))
                .thenReturn(true);

        assertThrows(BusinessException.class, () -> service.createBooking(new BookingRequest(10L, Set.of(5L), null)));
        verify(bookingRepository, never()).save(any());
        verify(seatLockService, never()).acquire(anyLong(), anyCollection(), anyLong());
    }

    @Test
    void staffCannotReadBookingFromAnotherCinemaByGuessingId() {
        authenticate("staff@example.com");
        var assignedCinema = cinema(1L);
        var otherCinema = cinema(2L);
        var staff = staff("staff@example.com", assignedCinema);
        var booking = booking(20L, BookingStatus.PAID, showtime(20L, otherCinema), "customer@example.com");
        when(bookingRepository.findById(20L)).thenReturn(Optional.of(booking));
        when(userRepository.findByEmail("staff@example.com")).thenReturn(Optional.of(staff));

        assertThrows(BusinessException.class, () -> service.getBooking(20L));
    }

    @Test
    void secondCheckinIsRejected() {
        authenticate("staff@example.com");
        var cinema = cinema(1L);
        var staff = staff("staff@example.com", cinema);
        var booking = booking(30L, BookingStatus.COMPLETED, showtime(30L, cinema), "customer@example.com");
        booking.setCheckedInAt(LocalDateTime.now());
        when(bookingRepository.findById(30L)).thenReturn(Optional.of(booking));
        when(userRepository.findByEmail("staff@example.com")).thenReturn(Optional.of(staff));

        assertThrows(BusinessException.class, () -> service.checkinBooking(30L));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void paidTicketCannotBeCancelledLessThanTwoHoursBeforeShowtime() {
        authenticate("customer@example.com");
        var showtime = showtime(40L, cinema(1L));
        showtime.setStartTime(LocalDateTime.now().plusHours(1));
        var booking = booking(40L, BookingStatus.PAID, showtime, "customer@example.com");
        when(bookingRepository.findById(40L)).thenReturn(Optional.of(booking));

        assertThrows(BusinessException.class, () -> service.cancelBooking(40L));
        verify(bookingRepository, never()).save(any());
    }

    private void authenticate(String email) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(email, null));
    }

    private Cinema cinema(Long id) { return Cinema.builder().id(id).name("Cinema " + id).status(CinemaStatus.ACTIVE).build(); }

    private Showtime showtime(Long id, Cinema cinema) {
        var room = CinemaRoom.builder().id(id).cinema(cinema).active(true).build();
        return Showtime.builder().id(id).room(room).status(ShowtimeStatus.SCHEDULED)
                .startTime(LocalDateTime.now().plusHours(5)).endTime(LocalDateTime.now().plusHours(7))
                .basePrice(new BigDecimal("100000")).build();
    }

    private User staff(String email, Cinema cinema) {
        var user = User.builder().id(2L).email(email).cinema(cinema).build();
        var role = Role.builder().id(2L).name("STAFF").build();
        user.getUserRoles().add(UserRole.builder().user(user).role(role).build());
        return user;
    }

    private Booking booking(Long id, BookingStatus status, Showtime showtime, String ownerEmail) {
        return Booking.builder().id(id).bookingCode("BK" + id).user(User.builder().id(3L).email(ownerEmail).build())
                .showtime(showtime).status(status).totalAmount(new BigDecimal("100000"))
                .expiresAt(LocalDateTime.now().plusMinutes(10)).bookingSeats(new HashSet<>()).build();
    }
}
