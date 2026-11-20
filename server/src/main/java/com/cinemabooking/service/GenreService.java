package com.cinemabooking.service;

import com.cinemabooking.dto.request.GenreRequest;

public interface GenreService {
    Object getGenres();
    Object createGenre(GenreRequest request);
    Object updateGenre(Long id, GenreRequest request);
    Object deleteGenre(Long id);
}


