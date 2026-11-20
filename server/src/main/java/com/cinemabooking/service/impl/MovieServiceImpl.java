package com.cinemabooking.service.impl;

import com.cinemabooking.dto.request.MovieRequest;
import com.cinemabooking.entity.Movie;
import com.cinemabooking.enums.MovieStatus;
import com.cinemabooking.exception.ResourceNotFoundException;
import com.cinemabooking.repository.MovieRepository;
import com.cinemabooking.repository.GenreRepository;
import com.cinemabooking.repository.ShowtimeRepository;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.exception.ErrorCode;
import com.cinemabooking.service.CloudinaryService;
import com.cinemabooking.service.MovieService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor @Transactional
public class MovieServiceImpl implements MovieService {
    private final MovieRepository repository;
    private final GenreRepository genreRepository;
    private final CloudinaryService cloudinaryService;
    private final ShowtimeRepository showtimeRepository;

    @Override public Object getMovies() { return repository.findAllByOrderByIdDesc(); }

    @Override public Object getMovie(Long id) { return find(id); }

    @Override public Object createMovie(MovieRequest request, org.springframework.web.multipart.MultipartFile poster,
                                         org.springframework.web.multipart.MultipartFile backdrop) {
        return create(request, poster, backdrop);
    }

    @Override public Object updateMovie(Long id, MovieRequest request, org.springframework.web.multipart.MultipartFile poster,
                                         org.springframework.web.multipart.MultipartFile backdrop) {
        return update(id, request, poster, backdrop);
    }

    @Override public Object deleteMovie(Long id) {
        if (showtimeRepository.existsByMovieId(id))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể xóa phim đã có suất chiếu");
        repository.delete(find(id));
        return null;
    }

    private Movie update(Long id, MovieRequest r, org.springframework.web.multipart.MultipartFile poster,
                         org.springframework.web.multipart.MultipartFile backdrop) {
        var movie = find(id);
        movie.setTitle(r.title()); movie.setDescription(r.description()); movie.setDurationMinutes(r.durationMinutes());
        movie.setReleaseDate(r.releaseDate()); movie.setTrailerUrl(r.trailerUrl()); movie.setGenres(loadGenres(r));
        if (r.status() != null) movie.setStatus(r.status());
        if (poster != null && !poster.isEmpty()) movie.setPosterUrl(cloudinaryService.uploadImage(poster, "cinema/movies/posters"));
        else if (r.posterUrl() != null) movie.setPosterUrl(r.posterUrl());
        if (backdrop != null && !backdrop.isEmpty()) movie.setBackdropUrl(cloudinaryService.uploadImage(backdrop, "cinema/movies/backdrops"));
        else if (r.backdropUrl() != null) movie.setBackdropUrl(r.backdropUrl());
        return movie;
    }
    private Movie create(MovieRequest r, org.springframework.web.multipart.MultipartFile poster,
                         org.springframework.web.multipart.MultipartFile backdrop) {
        var posterUrl = poster == null ? r.posterUrl() : cloudinaryService.uploadImage(poster, "cinema/movies/posters");
        var backdropUrl = backdrop == null ? r.backdropUrl() : cloudinaryService.uploadImage(backdrop, "cinema/movies/backdrops");
        return repository.save(Movie.builder().title(r.title()).description(r.description())
                .durationMinutes(r.durationMinutes()).releaseDate(r.releaseDate()).posterUrl(posterUrl)
                .backdropUrl(backdropUrl).trailerUrl(r.trailerUrl())
                .status(r.status()==null?MovieStatus.ACTIVE:r.status()).genres(loadGenres(r)).build());
    }
    private java.util.Set<com.cinemabooking.entity.Genre> loadGenres(MovieRequest r) {
        if (r.genreIds() == null || r.genreIds().isEmpty()) return new java.util.HashSet<>();
        var genres = genreRepository.findAllById(r.genreIds());
        if (genres.size() != r.genreIds().size()) throw new ResourceNotFoundException("Có thể loại phim không tồn tại");
        return new java.util.HashSet<>(genres);
    }
    private Movie find(Long id){ return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim id="+id)); }
}
