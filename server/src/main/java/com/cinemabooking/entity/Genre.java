package com.cinemabooking.entity;

import com.cinemabooking.enums.GenreStatus;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "genres")
public class Genre {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 100) private String name;
    @Column(length = 500) private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private GenreStatus status;
    @PrePersist void prePersist() { if (status == null) status = GenreStatus.ACTIVE; }
}

