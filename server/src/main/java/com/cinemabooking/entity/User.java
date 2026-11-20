package com.cinemabooking.entity;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import com.cinemabooking.enums.UserStatus;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 120)
    private String email;
    @Column(nullable = false)
    private String password;
    @Column(nullable = false, length = 120)
    private String fullName;
    @Column(length = 20)
    private String phone;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cinema_id")
    private Cinema cinema;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<UserRole> userRoles = new HashSet<>();

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = createdAt; if (status == null) status = UserStatus.ACTIVE; }
    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }
}

