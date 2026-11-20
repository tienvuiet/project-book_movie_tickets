package com.cinemabooking.entity;

import com.cinemabooking.enums.SeatType;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "seats", uniqueConstraints = @UniqueConstraint(columnNames = {"room_id", "seat_row", "seat_number"}))
public class Seat {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "room_id", nullable = false) private CinemaRoom room;
    @Column(name = "seat_row", nullable = false, length = 10) private String row;
    @Column(name = "seat_number", nullable = false) private Integer number;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private SeatType type;
    @Column(nullable = false) private Boolean active;
    @PrePersist void prePersist() { if (type == null) type = SeatType.NORMAL; if (active == null) active = true; }
}

