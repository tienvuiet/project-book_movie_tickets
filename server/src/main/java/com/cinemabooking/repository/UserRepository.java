package com.cinemabooking.repository;

import java.util.Collection;
import java.util.Optional;
import java.util.List;

import com.cinemabooking.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
    @EntityGraph(attributePaths = {"userRoles", "userRoles.role"})
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role"})
    @org.springframework.data.jpa.repository.Query("select distinct u from User u join u.userRoles ur join ur.role r " +
            "where u.cinema.id = :cinemaId and upper(r.name) = 'STAFF' and u.status = com.cinemabooking.enums.UserStatus.ACTIVE")
    List<User> findActiveStaffByCinemaId(@org.springframework.data.repository.query.Param("cinemaId") Long cinemaId);

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role", "cinema"})
    @org.springframework.data.jpa.repository.Query("select distinct u from User u join u.userRoles ur join ur.role r " +
            "where u.email in :emails and upper(r.name) in ('STAFF', 'ADMIN') " +
            "and u.status = com.cinemabooking.enums.UserStatus.ACTIVE")
    List<User> findActiveChatRecipientsByEmailIn(
            @org.springframework.data.repository.query.Param("emails") Collection<String> emails);
}

