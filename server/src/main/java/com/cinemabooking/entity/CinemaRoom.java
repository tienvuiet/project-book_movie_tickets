package com.cinemabooking.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "cinema_rooms", uniqueConstraints = @UniqueConstraint(columnNames = {"cinema_id", "name"}))
public class CinemaRoom {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "cinema_id", nullable = false) private Cinema cinema;
    @Column(nullable = false, length = 100) private String name;
    private Integer totalSeats;
    @Column(nullable = false) private Boolean active;
    @PrePersist void prePersist() { if (active == null) active = true; }
}

