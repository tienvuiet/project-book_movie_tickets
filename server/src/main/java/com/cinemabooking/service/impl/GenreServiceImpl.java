package com.cinemabooking.service.impl;

import com.cinemabooking.dto.request.GenreRequest;
import com.cinemabooking.entity.Genre;
import com.cinemabooking.enums.GenreStatus;
import com.cinemabooking.exception.ResourceNotFoundException;
import com.cinemabooking.repository.GenreRepository;
import com.cinemabooking.service.GenreService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor @Transactional
public class GenreServiceImpl implements GenreService {
    private final GenreRepository repository;

    @Override public Object getGenres() { return repository.findAll(); }

    @Override public Object createGenre(GenreRequest request) {
        return repository.save(Genre.builder().name(request.name()).description(request.description())
                .status(request.status() == null ? GenreStatus.ACTIVE : request.status()).build());
    }

    @Override public Object updateGenre(Long id, GenreRequest request) {
        var genre = find(id);
        genre.setName(request.name()); genre.setDescription(request.description());
        if (request.status() != null) genre.setStatus(request.status());
        return genre;
    }

    @Override public Object deleteGenre(Long id) { repository.delete(find(id)); return null; }

    private Genre find(Long id){ return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thể loại id="+id)); }
}
