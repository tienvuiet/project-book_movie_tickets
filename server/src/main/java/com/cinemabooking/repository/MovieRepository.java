package com.cinemabooking.repository;

import com.cinemabooking.entity.Movie;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {
    @Override
    @EntityGraph(attributePaths = "genres")
    List<Movie> findAll();

    @Override
    @EntityGraph(attributePaths = "genres")
    Optional<Movie> findById(Long id);

    @EntityGraph(attributePaths = "genres")
    List<Movie> findAllByOrderByIdDesc();
}


