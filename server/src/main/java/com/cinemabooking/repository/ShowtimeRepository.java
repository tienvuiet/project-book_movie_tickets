package com.cinemabooking.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.cinemabooking.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Showtime s where s.id = :id")
    java.util.Optional<Showtime> findByIdForUpdate(@Param("id") Long id);
    boolean existsByRoomIdAndStartTimeLessThanAndEndTimeGreaterThan(Long roomId, LocalDateTime endTime, LocalDateTime startTime);
    boolean existsByRoomIdAndStartTimeLessThanAndEndTimeGreaterThanAndIdNot(Long roomId, LocalDateTime endTime, LocalDateTime startTime, Long excludeId);
    List<Showtime> findByRoomId(Long roomId);
    boolean existsByMovieId(Long movieId);
    boolean existsByRoomId(Long roomId);
    @Query("select s from Showtime s where s.movie.id = :movieId " +
            "and s.startTime > :after and s.status <> com.cinemabooking.enums.ShowtimeStatus.CANCELLED " +
            "order by s.startTime asc")
    List<Showtime> findPublicByMovieId(
            @Param("movieId") Long movieId,
            @Param("after") LocalDateTime after);

    @Query("select s from Showtime s " +
            "join fetch s.movie movie " +
            "join fetch s.room room " +
            "join fetch room.cinema cinema " +
            "where s.startTime > :now " +
            "and s.status <> com.cinemabooking.enums.ShowtimeStatus.CANCELLED " +
            "and movie.status = com.cinemabooking.enums.MovieStatus.ACTIVE " +
            "and movie.releaseDate <= :today " +
            "and room.active = true " +
            "and cinema.status = com.cinemabooking.enums.CinemaStatus.ACTIVE " +
            "order by s.startTime asc")
    List<Showtime> findPublicSchedule(@Param("now") LocalDateTime now, @Param("today") LocalDate today);

    List<Showtime> findAllByOrderByStartTimeDesc();

    @Query("select count(distinct s.movie.id) from Showtime s " +
            "where s.status <> com.cinemabooking.enums.ShowtimeStatus.CANCELLED " +
            "and s.startTime <= :now and s.endTime > :now")
    long countCurrentlyShowingMovies(@Param("now") LocalDateTime now);
}

