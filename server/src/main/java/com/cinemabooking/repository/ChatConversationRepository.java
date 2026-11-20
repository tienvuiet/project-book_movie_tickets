package com.cinemabooking.repository;

import com.cinemabooking.entity.ChatConversation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChatConversationRepository extends JpaRepository<ChatConversation, Long> {
    @Query("""
            select c from ChatConversation c
            join fetch c.customer
            join fetch c.cinema
            left join fetch c.assignedStaff
            left join fetch c.booking
            where c.customer.id = :customerId
              and (:cursorTime is null or c.lastMessageAt < :cursorTime
                   or (c.lastMessageAt = :cursorTime and c.id < :cursorId))
            order by c.lastMessageAt desc, c.id desc
            """)
    Slice<ChatConversation> findCustomerPage(@Param("customerId") Long customerId,
                                              @Param("cursorTime") java.time.LocalDateTime cursorTime,
                                              @Param("cursorId") Long cursorId,
                                              Pageable pageable);

    @Query("""
            select c from ChatConversation c
            join fetch c.customer
            join fetch c.cinema
            left join fetch c.assignedStaff
            left join fetch c.booking
            where c.cinema.id = :cinemaId
              and (:status is null or c.status = :status)
              and (:mine = false or c.assignedStaff.id = :staffId)
              and (:subject is null or c.subject = :subject)
              and (:hasBooking is null
                   or (:hasBooking = true and c.booking is not null)
                   or (:hasBooking = false and c.booking is null))
              and (:cursorTime is null or c.lastMessageAt < :cursorTime
                   or (c.lastMessageAt = :cursorTime and c.id < :cursorId))
            order by c.lastMessageAt desc, c.id desc
            """)
    Slice<ChatConversation> findStaffPage(@Param("cinemaId") Long cinemaId,
                                           @Param("staffId") Long staffId,
                                           @Param("status") com.cinemabooking.enums.ChatConversationStatus status,
                                           @Param("mine") boolean mine,
                                           @Param("subject") com.cinemabooking.enums.ChatSubject subject,
                                           @Param("hasBooking") Boolean hasBooking,
                                           @Param("cursorTime") java.time.LocalDateTime cursorTime,
                                           @Param("cursorId") Long cursorId,
                                           Pageable pageable);

    @Query("""
            select c from ChatConversation c
            join fetch c.customer
            join fetch c.cinema
            left join fetch c.assignedStaff
            left join fetch c.booking
            where (:status is null or c.status = :status)
              and (:cinemaId is null or c.cinema.id = :cinemaId)
              and (:cursorTime is null or c.lastMessageAt < :cursorTime
                   or (c.lastMessageAt = :cursorTime and c.id < :cursorId))
            order by c.lastMessageAt desc, c.id desc
            """)
    Slice<ChatConversation> findAdminPage(@Param("status") com.cinemabooking.enums.ChatConversationStatus status,
                                           @Param("cinemaId") Long cinemaId,
                                           @Param("cursorTime") java.time.LocalDateTime cursorTime,
                                           @Param("cursorId") Long cursorId,
                                           Pageable pageable);

    long countByCustomerIdAndCinemaId(Long customerId, Long cinemaId);

    @Query("select coalesce(sum(c.customerUnreadCount), 0) from ChatConversation c where c.customer.id = :customerId")
    long sumCustomerUnread(@Param("customerId") Long customerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ChatConversation c where c.id = :id")
    Optional<ChatConversation> findByIdForUpdate(@Param("id") Long id);
}
