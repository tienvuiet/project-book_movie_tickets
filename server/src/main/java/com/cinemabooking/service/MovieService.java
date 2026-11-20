package com.cinemabooking.service;

import com.cinemabooking.dto.request.MovieRequest;
import org.springframework.web.multipart.MultipartFile;

public interface MovieService {
    Object getMovies();
    Object getMovie(Long id);
    Object createMovie(MovieRequest request, MultipartFile poster, MultipartFile backdrop);
    Object updateMovie(Long id, MovieRequest request, MultipartFile poster, MultipartFile backdrop);
    Object deleteMovie(Long id);
}


