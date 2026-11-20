package com.cinemabooking.entity;

import com.cinemabooking.enums.CinemaStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "cinemas")
public class Cinema {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 150) private String name;
    @Column(nullable = false, length = 255) private String address;
    @Column(length = 20) private String phone;
    @Column(precision = 10, scale = 7) private BigDecimal latitude;
    @Column(precision = 10, scale = 7) private BigDecimal longitude;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private CinemaStatus status;
    @PrePersist void prePersist() { if (status == null) status = CinemaStatus.ACTIVE; }
}

