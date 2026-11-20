package com.cinemabooking.controller;

import com.cinemabooking.dto.request.*;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/users") @RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    @GetMapping("/me") public ApiResponse<Object> me() { return ApiResponse.success(userService.getMe()); }
    @GetMapping @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> all() { return ApiResponse.success(userService.getAll()); }
    @GetMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> get(@PathVariable Long id) { return ApiResponse.success(userService.getById(id)); }
    @PostMapping @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> create(@Valid @RequestBody UserRequest request) { return ApiResponse.success(userService.create(request)); }
    @PutMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> update(@PathVariable Long id, @Valid @RequestBody UserRequest request) { return ApiResponse.success(userService.update(id, request)); }
    @PutMapping("/me") public ApiResponse<Object> updateMe(@Valid @RequestBody UserRequest request) { return ApiResponse.success(userService.updateMe(request)); }
    @PutMapping("/{id}/status") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> status(@PathVariable Long id, @Valid @RequestBody UserStatusRequest request) { return ApiResponse.success(userService.updateStatus(id, request)); }
    @PutMapping("/{id}/roles") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> roles(@PathVariable Long id, @Valid @RequestBody UserRolesRequest request) { return ApiResponse.success(userService.updateRoles(id, request)); }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Object> delete(@PathVariable Long id) { userService.delete(id); return ApiResponse.success(null); }
}

