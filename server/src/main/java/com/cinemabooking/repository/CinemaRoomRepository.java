package com.cinemabooking.repository;

import com.cinemabooking.entity.CinemaRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CinemaRoomRepository extends JpaRepository<CinemaRoom, Long> {
    java.util.List<CinemaRoom> findAllByCinemaIdOrderByNameAsc(Long cinemaId);
    boolean existsByCinemaIdAndNameIgnoreCase(Long cinemaId, String name);
}


