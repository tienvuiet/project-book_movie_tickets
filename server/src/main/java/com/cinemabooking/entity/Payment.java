package com.cinemabooking.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.cinemabooking.enums.PaymentMethod;
import com.cinemabooking.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "payments")
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "booking_id", nullable = false) private Booking booking;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private PaymentMethod method;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private PaymentStatus status;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(length = 120) private String transactionId;
    @Column(unique = true) private Long providerOrderCode;
    @Column(length = 120) private String paymentLinkId;
    @Column(length = 120) private String providerReference;
    @Column(length = 500) private String checkoutUrl;
    @Version private Long version;
    @Column(nullable = false, updatable = false) private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); if (status == null) status = PaymentStatus.PENDING; }
}

