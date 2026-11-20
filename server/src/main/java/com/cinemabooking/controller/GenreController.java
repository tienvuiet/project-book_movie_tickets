package com.cinemabooking.controller;

import com.cinemabooking.dto.request.GenreRequest;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.service.GenreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/genres") @RequiredArgsConstructor
public class GenreController {
    private final GenreService service;
    @GetMapping public ApiResponse<Object> list(){ return ApiResponse.success(service.getGenres()); }
    @PostMapping @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> create(@Valid @RequestBody GenreRequest request){ return ApiResponse.success(service.createGenre(request)); }
    @PutMapping("/{id}") @PreAuthorize("hasAnyRole('ADMIN','STAFF')") public ApiResponse<Object> update(@PathVariable Long id, @Valid @RequestBody GenreRequest request){ return ApiResponse.success(service.updateGenre(id, request)); }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> delete(@PathVariable Long id){ return ApiResponse.success(service.deleteGenre(id)); }
}

