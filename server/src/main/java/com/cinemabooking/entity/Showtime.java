package com.cinemabooking.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.cinemabooking.enums.ShowtimeStatus;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "showtimes")
public class Showtime {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "movie_id", nullable = false) private Movie movie;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "room_id", nullable = false) private CinemaRoom room;
    @Column(nullable = false) private LocalDateTime startTime;
    @Column(nullable = false) private LocalDateTime endTime;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal basePrice;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ShowtimeStatus status;
    @PrePersist void prePersist() { if (status == null) status = ShowtimeStatus.SCHEDULED; }
}

