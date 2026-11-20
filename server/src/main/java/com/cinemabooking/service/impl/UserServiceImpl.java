package com.cinemabooking.service.impl;

import com.cinemabooking.dto.request.*;
import com.cinemabooking.entity.User;
import com.cinemabooking.entity.UserRole;
import com.cinemabooking.enums.UserStatus;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.exception.ErrorCode;
import com.cinemabooking.exception.ResourceNotFoundException;
import com.cinemabooking.mapper.UserMapper;
import com.cinemabooking.repository.UserRepository;
import com.cinemabooking.repository.RoleRepository;
import com.cinemabooking.repository.CinemaRepository;
import com.cinemabooking.security.CurrentUser;
import com.cinemabooking.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CinemaRepository cinemaRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override @Transactional(readOnly = true) public Object getMe() { return userMapper.toResponse(findByEmail(CurrentUser.email())); }
    @Override @Transactional(readOnly = true) public Object getAll() { return userRepository.findAll().stream().map(userMapper::toResponse).toList(); }
    @Override @Transactional(readOnly = true) public Object getById(Long id) { return userMapper.toResponse(find(id)); }
    @Override @Transactional public Object create(UserRequest request) {
        var email = request.email().trim().toLowerCase(java.util.Locale.ROOT);
        if (userRepository.existsByEmail(email)) throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        if (request.password() == null || request.password().isBlank())
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Mật khẩu là bắt buộc khi tạo tài khoản");
        var user = User.builder().email(email).password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName().trim()).phone(normalizePhone(request.phone())).status(UserStatus.ACTIVE).build();
        assignRoles(user, request.roles() == null || request.roles().isEmpty() ? java.util.Set.of("CUSTOMER") : request.roles());
        user.setCinema(resolveCinema(request.cinemaId()));
        return userMapper.toResponse(userRepository.save(user));
    }
    @Override @Transactional public Object update(Long id, UserRequest request) { return updateUser(find(id), request); }
    @Override @Transactional public Object updateMe(UserRequest request) {
        var user = findByEmail(CurrentUser.email());
        user.setFullName(request.fullName().trim());
        user.setPhone(normalizePhone(request.phone()));
        return userMapper.toResponse(userRepository.save(user));
    }
    @Override @Transactional public Object updateStatus(Long id, UserStatusRequest request) {
        var user = find(id);
        if (request.status() == UserStatus.LOCKED && hasRole(user, "ADMIN") && countActiveAdmins() <= 1)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể khóa quản trị viên hoạt động cuối cùng");
        user.setStatus(request.status());
        return userMapper.toResponse(userRepository.save(user));
    }
    @Override @Transactional public Object updateRoles(Long id, UserRolesRequest request) {
        var user = find(id);
        var normalizedRoles = normalizeRoles(request.roles());
        var currentlyAdmin = hasRole(user, "ADMIN");
        if (currentlyAdmin && !normalizedRoles.contains("ADMIN") && countAdmins() <= 1)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể xóa quyền của quản trị viên cuối cùng");
        assignRoles(user, normalizedRoles);
        return userMapper.toResponse(userRepository.save(user));
    }
    @Override @Transactional public void delete(Long id) {
        var user = find(id);
        boolean isAdmin = user.getUserRoles().stream()
                .anyMatch(userRole -> "ADMIN".equalsIgnoreCase(userRole.getRole().getName()));
        if (isAdmin) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể xóa tài khoản admin");
        }
        userRepository.delete(user);
    }

    private Object updateUser(User user, UserRequest request) {
        var email = request.email().trim().toLowerCase(java.util.Locale.ROOT);
        if (!user.getEmail().equalsIgnoreCase(email) && userRepository.existsByEmail(email))
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        user.setEmail(email);
        user.setFullName(request.fullName().trim());
        user.setPhone(normalizePhone(request.phone()));
        if (request.password() != null && !request.password().isBlank()) user.setPassword(passwordEncoder.encode(request.password()));
        if (request.roles() != null && !request.roles().isEmpty()) {
            var normalizedRoles = normalizeRoles(request.roles());
            if (hasRole(user, "ADMIN") && !normalizedRoles.contains("ADMIN") && countAdmins() <= 1)
                throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể xóa quyền của quản trị viên cuối cùng");
            assignRoles(user, normalizedRoles);
        }
        user.setCinema(resolveCinema(request.cinemaId()));
        return userMapper.toResponse(userRepository.save(user));
    }
    private void assignRoles(User user, java.util.Set<String> requestedRoles) {
        var normalizedRoles = normalizeRoles(requestedRoles);
        var rolesByName = normalizedRoles.stream().collect(java.util.stream.Collectors.toMap(
                name -> name,
                name -> roleRepository.findByName(name)
                        .orElseThrow(() -> new BusinessException(ErrorCode.BUSINESS_ERROR, "Vai trò không hợp lệ: " + name))));

        // Reconcile the collection instead of clearing and recreating it. Clearing can make
        // Hibernate insert the replacement before deleting the old row and violate uk_user_role.
        user.getUserRoles().removeIf(userRole ->
                !normalizedRoles.contains(userRole.getRole().getName().trim().toUpperCase(java.util.Locale.ROOT)));

        var existingRoles = user.getUserRoles().stream()
                .map(userRole -> userRole.getRole().getName().trim().toUpperCase(java.util.Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
        normalizedRoles.stream()
                .filter(roleName -> !existingRoles.contains(roleName))
                .forEach(roleName -> user.getUserRoles().add(
                        UserRole.builder().user(user).role(rolesByName.get(roleName)).build()));
    }
    private java.util.Set<String> normalizeRoles(java.util.Set<String> roles) {
        return roles.stream().filter(java.util.Objects::nonNull).map(String::trim)
                .map(value -> value.toUpperCase(java.util.Locale.ROOT)).collect(java.util.stream.Collectors.toSet());
    }
    private boolean hasRole(User user, String role) { return user.getUserRoles().stream().anyMatch(item -> role.equalsIgnoreCase(item.getRole().getName())); }
    private long countAdmins() { return userRepository.findAll().stream().filter(user -> hasRole(user, "ADMIN")).count(); }
    private long countActiveAdmins() { return userRepository.findAll().stream().filter(user -> user.getStatus() == UserStatus.ACTIVE && hasRole(user, "ADMIN")).count(); }
    private String normalizePhone(String phone) { return phone == null || phone.isBlank() ? null : phone.trim(); }
    private com.cinemabooking.entity.Cinema resolveCinema(Long cinemaId) {
        if (cinemaId == null) return null;
        return cinemaRepository.findById(cinemaId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy rạp id=" + cinemaId));
    }
    private User find(Long id) { return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy user id=" + id)); }
    private User findByEmail(String email) { return userRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED)); }
}

