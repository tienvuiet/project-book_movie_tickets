package com.cinemabooking.repository;

import com.cinemabooking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    interface PromotionUsageSummary {
        Long getTotalUsed();
        java.math.BigDecimal getTotalDiscount();
    }

    java.util.List<Booking> findAllByUserIdOrderByCreatedAtDesc(Long userId);
    java.util.List<Booking> findAllByUserIdAndShowtimeIdAndStatusOrderByCreatedAtDesc(
            Long userId,
            Long showtimeId,
            com.cinemabooking.enums.BookingStatus status);
    java.util.List<Booking> findAllByOrderByCreatedAtDesc();
    java.util.Optional<Booking> findByBookingCodeIgnoreCase(String bookingCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    java.util.Optional<Booking> findByIdForUpdate(@Param("id") Long id);
    boolean existsByShowtimeId(Long showtimeId);
    boolean existsByShowtimeIdAndStatusIn(Long showtimeId, java.util.Collection<com.cinemabooking.enums.BookingStatus> statuses);

    @Query(value = "select count(*) as totalUsed, coalesce(sum(discount_amount), 0) as totalDiscount " +
            "from bookings where promo_code is not null and promo_code <> '' " +
            "and status in ('PAID', 'COMPLETED')", nativeQuery = true)
    PromotionUsageSummary summarizeSuccessfulPromotionUsage();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Booking b set b.status = com.cinemabooking.enums.BookingStatus.EXPIRED " +
            "where b.status = com.cinemabooking.enums.BookingStatus.PENDING and b.expiresAt <= :now")
    int expirePendingBookings(@Param("now") java.time.LocalDateTime now);

    @Query("select count(b) > 0 from Booking b where b.showtime.room.id = :roomId and b.showtime.startTime > :now and b.status in :statuses and (b.status <> com.cinemabooking.enums.BookingStatus.PENDING or b.expiresAt > :now)")
    boolean existsFutureActiveBookingByRoomId(
            @Param("roomId") Long roomId,
            @Param("now") java.time.LocalDateTime now,
            @Param("statuses") java.util.Collection<com.cinemabooking.enums.BookingStatus> statuses);
}


