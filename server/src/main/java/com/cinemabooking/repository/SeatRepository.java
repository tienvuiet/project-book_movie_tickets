package com.cinemabooking.repository;

import com.cinemabooking.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    java.util.List<Seat> findAllByRoomIdOrderByRowAscNumberAsc(Long roomId);
    long countByRoomId(Long roomId);
    boolean existsByRoomIdAndRowIgnoreCaseAndNumber(Long roomId, String row, Integer number);
    void deleteAllByRoomId(Long roomId);
}


