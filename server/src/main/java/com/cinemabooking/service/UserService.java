package com.cinemabooking.service;

import com.cinemabooking.dto.request.*;

public interface UserService {
    Object getMe(); Object getAll(); Object getById(Long id); Object create(UserRequest request); Object update(Long id, UserRequest request); Object updateMe(UserRequest request); Object updateStatus(Long id, UserStatusRequest request); Object updateRoles(Long id, UserRolesRequest request); void delete(Long id);
}

