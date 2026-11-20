package com.cinemabooking.repository;

import java.util.Collection;

import com.cinemabooking.entity.BookingSeat;
import com.cinemabooking.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {
    @Query("select count(bs) > 0 from BookingSeat bs where bs.booking.showtime.id = :showtimeId and bs.seat.id in :seatIds and bs.booking.status in :statuses and (bs.booking.status <> com.cinemabooking.enums.BookingStatus.PENDING or bs.booking.expiresAt > CURRENT_TIMESTAMP)")
    boolean existsReservedSeats(@Param("showtimeId") Long showtimeId, @Param("seatIds") Collection<Long> seatIds, @Param("statuses") Collection<BookingStatus> statuses);

    @Query("select bs.seat.id from BookingSeat bs where bs.booking.showtime.id = :showtimeId and bs.booking.status in :statuses and (bs.booking.status <> com.cinemabooking.enums.BookingStatus.PENDING or bs.booking.expiresAt > CURRENT_TIMESTAMP)")
    java.util.Set<Long> findReservedSeatIdsByShowtimeId(@Param("showtimeId") Long showtimeId, @Param("statuses") Collection<BookingStatus> statuses);

    @Query("select count(bs) > 0 from BookingSeat bs where bs.seat.id = :seatId and bs.booking.showtime.startTime > :now and bs.booking.status in :statuses and (bs.booking.status <> com.cinemabooking.enums.BookingStatus.PENDING or bs.booking.expiresAt > :now)")
    boolean existsFutureActiveBookingBySeatId(
            @Param("seatId") Long seatId,
            @Param("now") java.time.LocalDateTime now,
            @Param("statuses") Collection<BookingStatus> statuses);
}
