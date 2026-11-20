package com.cinemabooking.controller;

import com.cinemabooking.dto.request.MovieRequest;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.service.MovieService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

@RestController @RequestMapping("/api/movies") @RequiredArgsConstructor
public class MovieController {
    private final MovieService service;
    @GetMapping public ApiResponse<Object> list(){ return ApiResponse.success(service.getMovies()); }
    @GetMapping("/{id}") public ApiResponse<Object> get(@PathVariable Long id){ return ApiResponse.success(service.getMovie(id)); }
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE) @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> create(@Valid @RequestBody MovieRequest request){ return ApiResponse.success(service.createMovie(request, null, null)); }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE) @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ApiResponse<Object> createWithImages(@Valid @RequestPart("movie") MovieRequest request,
            @RequestPart("poster") MultipartFile poster, @RequestPart("backdrop") MultipartFile backdrop) {
        return ApiResponse.success(service.createMovie(request, poster, backdrop));
    }
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE) @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> update(@PathVariable Long id, @Valid @RequestBody MovieRequest request){ return ApiResponse.success(service.updateMovie(id, request, null, null)); }
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE) @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ApiResponse<Object> updateWithImages(@PathVariable Long id, @Valid @RequestPart("movie") MovieRequest request,
            @RequestPart(value = "poster", required = false) MultipartFile poster,
            @RequestPart(value = "backdrop", required = false) MultipartFile backdrop) {
        return ApiResponse.success(service.updateMovie(id, request, poster, backdrop));
    }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> delete(@PathVariable Long id){ return ApiResponse.success(service.deleteMovie(id)); }
}

