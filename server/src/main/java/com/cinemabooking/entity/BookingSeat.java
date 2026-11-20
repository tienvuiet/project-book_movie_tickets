package com.cinemabooking.entity;

import java.math.BigDecimal;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "booking_seats", uniqueConstraints = @UniqueConstraint(columnNames = {"booking_id", "seat_id"}))
public class BookingSeat {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "booking_id", nullable = false) private Booking booking;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "seat_id", nullable = false) private Seat seat;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal price;
}

