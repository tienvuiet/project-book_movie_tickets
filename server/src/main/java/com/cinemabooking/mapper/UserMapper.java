package com.cinemabooking.mapper;

import java.util.stream.Collectors;

import com.cinemabooking.dto.response.UserResponse;
import com.cinemabooking.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    default UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }
        var roles = user.getUserRoles() == null ? java.util.Set.<String>of() : user.getUserRoles().stream()
                .map(userRole -> userRole.getRole().getName())
                .collect(Collectors.toSet());
        var cinema = user.getCinema();
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(), user.getStatus(), roles,
                cinema == null ? null : cinema.getId(), cinema == null ? null : cinema.getName());
    }
}


