package com.cinemabooking.service.impl;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import com.cinemabooking.constant.AppConstants;
import com.cinemabooking.dto.request.BookingRequest;
import com.cinemabooking.dto.request.ShowtimeRequest;
import com.cinemabooking.dto.request.CinemaRequest;
import com.cinemabooking.dto.request.CinemaRoomRequest;
import com.cinemabooking.dto.request.SeatRequest;
import com.cinemabooking.dto.request.BulkSeatRequest;
import com.cinemabooking.entity.Cinema;
import com.cinemabooking.entity.CinemaRoom;
import com.cinemabooking.entity.Seat;
import com.cinemabooking.enums.CinemaStatus;
import com.cinemabooking.enums.SeatType;
import com.cinemabooking.enums.BookingStatus;
import com.cinemabooking.enums.MovieStatus;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.exception.ErrorCode;
import com.cinemabooking.exception.ResourceNotFoundException;
import com.cinemabooking.repository.*;
import com.cinemabooking.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ShowtimeServiceImpl implements ShowtimeService {
    @Override
    public Object getShowtimes() {
        var now = LocalDateTime.now(businessClock);
        return showtimeRepository.findPublicSchedule(now, LocalDate.now(businessClock)).stream()
                .map(this::showtimeResponse).toList();
    }

    private final Clock businessClock;
    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;
    private final CinemaRoomRepository roomRepository;
    private final SeatRepository seatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatLockService seatLockService;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    @Override
    public Object getStaffShowtimes() {
        var user = userRepository.findByEmail(com.cinemabooking.security.CurrentUser.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        var isAdmin = user.getUserRoles().stream().anyMatch(item -> "ADMIN".equalsIgnoreCase(item.getRole().getName()));
        var cinemaId = user.getCinema() == null ? null : user.getCinema().getId();
        if (!isAdmin && cinemaId == null) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Nhân viên chưa được phân công rạp");
        return showtimeRepository.findAllByOrderByStartTimeDesc().stream()
                .filter(showtime -> isAdmin || showtime.getRoom().getCinema().getId().equals(cinemaId))
                .map(this::showtimeResponse).toList();
    }

    @Override
    public Object createShowtime(ShowtimeRequest r) {
        var movie = movieRepository.findById(r.movieId()).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim id=" + r.movieId()));
        if (movie.getStatus() == MovieStatus.INACTIVE) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Phim đang ngừng hoạt động, không thể tạo suất chiếu");
        var room = roomRepository.findById(r.roomId()).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng id=" + r.roomId()));
        requireAssignedCinema(room.getCinema().getId());
        if (!room.getActive()) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Phòng chiếu đang ngừng hoạt động");
        if (room.getCinema().getStatus() == CinemaStatus.INACTIVE) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Rạp đang ngừng hoạt động");
        validateTimes(r.startTime(), r.endTime());
        validateMovieReleaseDate(movie, r.startTime());
        if (showtimeRepository.existsByRoomIdAndStartTimeLessThanAndEndTimeGreaterThan(r.roomId(), r.endTime(), r.startTime()))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Phòng đã có suất chiếu trùng thời gian");
        var st = com.cinemabooking.entity.Showtime.builder()
                .movie(movie).room(room).startTime(r.startTime()).endTime(r.endTime()).basePrice(r.basePrice())
                .status(r.status() == com.cinemabooking.enums.ShowtimeStatus.CANCELLED
                        ? com.cinemabooking.enums.ShowtimeStatus.CANCELLED
                        : com.cinemabooking.enums.ShowtimeStatus.SCHEDULED).build();
        return showtimeResponse(showtimeRepository.save(st));
    }

    @Override
    public Object updateShowtime(Long id, ShowtimeRequest r) {
        var st = showtimeRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy suất chiếu id=" + id));
        requireAssignedCinema(st.getRoom().getCinema().getId());
        var movie = movieRepository.findById(r.movieId()).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim id=" + r.movieId()));
        if (movie.getStatus() == MovieStatus.INACTIVE) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Phim đang ngừng hoạt động");
        var room = roomRepository.findById(r.roomId()).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng id=" + r.roomId()));
        requireAssignedCinema(room.getCinema().getId());
        if (!room.getActive()) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Phòng chiếu đang ngừng hoạt động");
        if (room.getCinema().getStatus() == CinemaStatus.INACTIVE) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Rạp đang ngừng hoạt động");
        validateTimes(r.startTime(), r.endTime());
        validateMovieReleaseDate(movie, r.startTime());
        if (showtimeRepository.existsByRoomIdAndStartTimeLessThanAndEndTimeGreaterThanAndIdNot(r.roomId(), r.endTime(), r.startTime(), id))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Phòng đã có suất chiếu trùng thời gian");
        st.setMovie(movie); st.setRoom(room); st.setStartTime(r.startTime()); st.setEndTime(r.endTime()); st.setBasePrice(r.basePrice());
        st.setStatus(r.status() == com.cinemabooking.enums.ShowtimeStatus.CANCELLED
                ? com.cinemabooking.enums.ShowtimeStatus.CANCELLED
                : com.cinemabooking.enums.ShowtimeStatus.SCHEDULED);
        return showtimeResponse(showtimeRepository.save(st));
    }

    @Override
    public Object deleteShowtime(Long id) {
        requireAdmin();
        var st = showtimeRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy suất chiếu id=" + id));
        if (bookingRepository.existsByShowtimeIdAndStatusIn(id, Set.of(BookingStatus.PENDING, BookingStatus.PAID))) {
            st.setStatus(com.cinemabooking.enums.ShowtimeStatus.CANCELLED);
            showtimeRepository.save(st);
            return java.util.Map.of("id", id, "cancelled", true, "message", "Suất chiếu đã có booking, chuyển sang CANCELLED");
        }
        showtimeRepository.delete(st);
        return java.util.Map.of("id", id, "deleted", true);
    }

    @Override
    public Object getSeats(Long showtimeId) {
        var st = showtimeRepository.findById(showtimeId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy suất chiếu id=" + showtimeId));
        var movie = st.getMovie();
        var room = st.getRoom();
        var cinema = room.getCinema();
        var reservedIds = new java.util.HashSet<>(bookingSeatRepository.findReservedSeatIdsByShowtimeId(showtimeId, Set.of(BookingStatus.PENDING, BookingStatus.PAID)));
        var roomSeats = seatRepository.findAllByRoomIdOrderByRowAscNumberAsc(room.getId());
        reservedIds.addAll(seatLockService.findLockedSeatIds(showtimeId, roomSeats.stream().map(Seat::getId).toList()));
        var seats = roomSeats.stream().map(s -> {
            String status;
            if (!s.getActive()) status = "INACTIVE";
            else if (reservedIds.contains(s.getId())) status = "BOOKED";
            else status = "AVAILABLE";
            return java.util.Map.of("id", s.getId(), "row", s.getRow(), "number", s.getNumber(), "type", s.getType().name(), "active", s.getActive(), "status", status);
        }).toList();
        return java.util.Map.of(
            "showtime", java.util.Map.of("id", st.getId(), "startTime", st.getStartTime().toString(), "endTime", st.getEndTime().toString(), "basePrice", st.getBasePrice(), "status", com.cinemabooking.util.ShowtimeStatusResolver.resolve(st).name()),
            "movie", java.util.Map.of("id", movie.getId(), "title", movie.getTitle(), "posterUrl", movie.getPosterUrl() == null ? "" : movie.getPosterUrl(), "durationMinutes", movie.getDurationMinutes() == null ? 0 : movie.getDurationMinutes()),
            "cinema", java.util.Map.of("id", cinema.getId(), "name", cinema.getName(), "address", cinema.getAddress()),
            "room", java.util.Map.of("id", room.getId(), "name", room.getName()),
            "seats", seats
        );
    }

    @Override
    public Object getByMovie(Long movieId) {
        var movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim id=" + movieId));
        var today = LocalDate.now(businessClock);
        if (movie.getStatus() != MovieStatus.ACTIVE || movie.getReleaseDate() == null
                || movie.getReleaseDate().isAfter(today)) return java.util.List.of();
        var showtimes = showtimeRepository.findPublicByMovieId(movieId, LocalDateTime.now(businessClock));
        return showtimes.stream().map(this::showtimeResponse).toList();
    }

    private void validateTimes(LocalDateTime start, LocalDateTime end) {
        if (!start.isAfter(LocalDateTime.now(businessClock))) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Thời gian bắt đầu phải nằm trong tương lai");
        if (!end.isAfter(start)) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Thời gian kết thúc phải sau thời gian bắt đầu");
    }

    private void validateMovieReleaseDate(com.cinemabooking.entity.Movie movie, LocalDateTime start) {
        if (movie.getReleaseDate() == null)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Phim chưa có ngày khởi chiếu");
        if (start.toLocalDate().isBefore(movie.getReleaseDate()))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Suất chiếu không được bắt đầu trước ngày khởi chiếu của phim");
    }

    private com.cinemabooking.entity.User currentUser() {
        var email = com.cinemabooking.security.CurrentUser.email();
        if (email == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        return userRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private boolean isAdmin(com.cinemabooking.entity.User user) {
        return user.getUserRoles().stream().anyMatch(item -> "ADMIN".equalsIgnoreCase(item.getRole().getName()));
    }

    private void requireAdmin() {
        if (!isAdmin(currentUser())) throw new BusinessException(ErrorCode.ACCESS_DENIED, "Chỉ quản trị viên được thực hiện thao tác này");
    }

    private void requireAssignedCinema(Long cinemaId) {
        var user = currentUser();
        if (isAdmin(user)) return;
        if (user.getCinema() == null)
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Nhân viên chưa được phân công rạp");
        if (!user.getCinema().getId().equals(cinemaId))
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không có quyền quản lý rạp này");
    }

    private Object showtimeResponse(com.cinemabooking.entity.Showtime st) {
        var movie = st.getMovie();
        var room = st.getRoom();
        var cinema = room.getCinema();
        var map = new java.util.LinkedHashMap<String, Object>();
        map.put("id", st.getId());
        map.put("movieId", movie.getId()); map.put("movieTitle", movie.getTitle());
        map.put("moviePosterUrl", movie.getPosterUrl() == null ? "" : movie.getPosterUrl());
        map.put("durationMinutes", movie.getDurationMinutes() == null ? 0 : movie.getDurationMinutes());
        map.put("cinemaId", cinema.getId()); map.put("cinemaName", cinema.getName()); map.put("cinemaAddress", cinema.getAddress());
        map.put("roomId", room.getId()); map.put("roomName", room.getName());
        map.put("totalSeats", room.getTotalSeats() == null ? 0 : room.getTotalSeats());
        map.put("startTime", st.getStartTime().toString()); map.put("endTime", st.getEndTime().toString());
        map.put("basePrice", st.getBasePrice()); map.put("status", com.cinemabooking.util.ShowtimeStatusResolver.resolve(st).name());
        return map;
    }
}
