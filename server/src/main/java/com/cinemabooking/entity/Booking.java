package com.cinemabooking.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import com.cinemabooking.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "bookings")
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 40) private String bookingCode;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "showtime_id", nullable = false) private Showtime showtime;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private BookingStatus status;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal totalAmount;
    @Column(length = 30) private String promoCode;
    @Column(nullable = false, precision = 12, scale = 2) @Builder.Default private BigDecimal discountAmount = BigDecimal.ZERO;
    @Column(nullable = false) private LocalDateTime expiresAt;
    private LocalDateTime checkedInAt;
    @Column(nullable = false, updatable = false) private LocalDateTime createdAt;
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default private Set<BookingSeat> bookingSeats = new HashSet<>();
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); if (status == null) status = BookingStatus.PENDING; }
}

