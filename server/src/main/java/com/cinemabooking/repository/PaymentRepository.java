package com.cinemabooking.repository;

import com.cinemabooking.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    java.util.Optional<Payment> findByBookingId(Long bookingId);
    java.util.Optional<Payment> findByTransactionId(String transactionId);
    java.util.Optional<Payment> findByProviderOrderCode(Long providerOrderCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.booking.id = :bookingId")
    java.util.Optional<Payment> findByBookingIdForUpdate(@Param("bookingId") Long bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.providerOrderCode = :orderCode")
    java.util.Optional<Payment> findByProviderOrderCodeForUpdate(@Param("orderCode") Long orderCode);

    @Query("select coalesce(sum(p.amount), 0) from Payment p " +
            "where p.status = com.cinemabooking.enums.PaymentStatus.SUCCESS " +
            "and p.paidAt >= :from and p.paidAt < :to")
    BigDecimal sumSuccessfulRevenue(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("select count(bs.id) from BookingSeat bs join Payment p on p.booking = bs.booking " +
            "where p.status = com.cinemabooking.enums.PaymentStatus.SUCCESS " +
            "and p.paidAt >= :from and p.paidAt < :to")
    long countSoldTickets(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("select function('date', p.paidAt), coalesce(sum(p.amount), 0) from Payment p " +
            "where p.status = com.cinemabooking.enums.PaymentStatus.SUCCESS " +
            "and p.paidAt >= :from and p.paidAt < :to " +
            "group by function('date', p.paidAt) order by function('date', p.paidAt)")
    List<Object[]> sumRevenueByDay(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("select m.id, m.title, count(bs.id), coalesce(sum(bs.price), 0) " +
            "from BookingSeat bs join bs.booking b join b.showtime s join s.movie m " +
            "join Payment p on p.booking = b " +
            "where p.status = com.cinemabooking.enums.PaymentStatus.SUCCESS " +
            "and p.paidAt >= :from and p.paidAt < :to " +
            "group by m.id, m.title order by count(bs.id) desc")
    List<Object[]> findMovieSales(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("select c.id, c.name, coalesce(sum(p.amount), 0) " +
            "from Payment p join p.booking b join b.showtime s join s.room r join r.cinema c " +
            "where p.status = com.cinemabooking.enums.PaymentStatus.SUCCESS " +
            "and p.paidAt >= :from and p.paidAt < :to " +
            "group by c.id, c.name order by sum(p.amount) desc")
    List<Object[]> findRevenueBycinema(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("select p.id, b.bookingCode, u.fullName, c.name, p.amount, p.status, p.paidAt " +
            "from Payment p join p.booking b join b.showtime s join s.room r join r.cinema c join b.user u " +
            "where p.createdAt >= :from and p.createdAt < :to " +
            "order by p.createdAt desc")
    List<Object[]> findRecentTransactions(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            org.springframework.data.domain.Pageable pageable);
}


