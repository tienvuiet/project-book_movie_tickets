package com.cinemabooking.entity;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import com.cinemabooking.enums.MovieStatus;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "movies")
public class Movie {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 200) private String title;
    @Column(length = 2000) private String description;
    private Integer durationMinutes;
    private LocalDate releaseDate;
    private String posterUrl;
    private String backdropUrl;
    private String trailerUrl;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private MovieStatus status;
    @ManyToMany
    @JoinTable(name = "movie_genres", joinColumns = @JoinColumn(name = "movie_id"), inverseJoinColumns = @JoinColumn(name = "genre_id"))
    @Builder.Default private Set<Genre> genres = new HashSet<>();
    @PrePersist void prePersist() { if (status == null) status = MovieStatus.ACTIVE; }
}

