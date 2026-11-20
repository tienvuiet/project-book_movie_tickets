package com.cinemabooking.service.impl;

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
public class CinemaServiceImpl implements CinemaService {
    @Override
    public Object getCinemas() { return cinemaRepository.findAll().stream().map(this::cinemaResponse).toList(); }

    @Override
    public Object getRooms(Long cinemaId) { return roomRepository.findAllByCinemaIdOrderByNameAsc(cinemaId).stream().map(this::roomResponse).toList(); }

    @Override
    public Object getSeats(Long roomId) { return seatRepository.findAllByRoomIdOrderByRowAscNumberAsc(roomId).stream().map(this::seatResponse).toList(); }

    private final CinemaRepository cinemaRepository;
    private final CinemaRoomRepository roomRepository;
    private final SeatRepository seatRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final GeocodingService geocodingService;

    @Override
    public Object createCinema(CinemaRequest r) {
        requireAdmin();
        var coordinates = geocodingService.resolve(r.address());
        return cinemaResponse(cinemaRepository.save(Cinema.builder().name(r.name().trim()).address(r.address().trim())
                .phone(r.phone()).latitude(coordinates.latitude()).longitude(coordinates.longitude())
                .status(r.status() == null ? CinemaStatus.ACTIVE : r.status()).build()));
    }

    @Override
    public Object updateCinema(Long id, CinemaRequest r) {
        var cinema = cinema(id);
        requireAssignedCinema(cinema.getId());
        var addressChanged = !cinema.getAddress().trim().equalsIgnoreCase(r.address().trim());
        if (addressChanged || cinema.getLatitude() == null || cinema.getLongitude() == null) {
            var coordinates = geocodingService.resolve(r.address());
            cinema.setLatitude(coordinates.latitude()); cinema.setLongitude(coordinates.longitude());
        }
        cinema.setName(r.name().trim()); cinema.setAddress(r.address().trim()); cinema.setPhone(r.phone());
        if (r.status() != null) cinema.setStatus(r.status());
        return cinemaResponse(cinemaRepository.save(cinema));
    }

    @Override
    public Object deleteCinema(Long id) {
        requireAdmin();
        var cinema = cinema(id);
        if (!roomRepository.findAllByCinemaIdOrderByNameAsc(id).isEmpty())
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể xóa rạp đang có phòng chiếu. Hãy chuyển rạp sang trạng thái ngừng hoạt động để giữ lịch sử.");
        cinemaRepository.delete(cinema); return java.util.Map.of("id", id);
    }

    @Override
    public Object createRoom(Long cinemaId, CinemaRoomRequest r) {
        var cinema = cinema(cinemaId);
        requireAssignedCinema(cinema.getId());
        if (roomRepository.existsByCinemaIdAndNameIgnoreCase(cinemaId, r.name().trim())) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Tên phòng đã tồn tại trong rạp");
        var room = CinemaRoom.builder().cinema(cinema).name(r.name().trim()).totalSeats(0).active(r.active() == null || r.active()).build();
        return roomResponse(roomRepository.save(room));
    }

    @Override
    public Object updateRoom(Long cinemaId, Long roomId, CinemaRoomRequest r) {
        var room = room(cinemaId, roomId);
        requireAssignedCinema(room.getCinema().getId());
        if (Boolean.FALSE.equals(r.active()) && bookingRepository.existsFutureActiveBookingByRoomId(
                roomId, LocalDateTime.now(), Set.of(BookingStatus.PENDING, BookingStatus.PAID, BookingStatus.COMPLETED)))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR,
                    "Không thể ngừng hoạt động phòng vì đang có suất chiếu tương lai đã phát sinh đặt vé. Vui lòng xử lý vé và hoàn tiền trước.");
        if (!room.getName().equalsIgnoreCase(r.name().trim()) && roomRepository.existsByCinemaIdAndNameIgnoreCase(cinemaId, r.name().trim())) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Tên phòng đã tồn tại trong rạp");
        room.setName(r.name().trim()); if (r.active() != null) room.setActive(r.active());
        room.setTotalSeats((int) seatRepository.countByRoomId(roomId));
        return roomResponse(roomRepository.save(room));
    }

    @Override
    public Object deleteRoom(Long cinemaId, Long roomId) {
        requireAdmin();
        room(cinemaId, roomId);
        throw new BusinessException(ErrorCode.BUSINESS_ERROR,
                "Không hỗ trợ xóa phòng chiếu để bảo toàn lịch sử. Hãy chuyển phòng sang trạng thái ngừng hoạt động.");
    }

    @Override
    public Object createSeat(Long roomId, SeatRequest r) {
        var room = room(roomId);
        requireAssignedCinema(room.getCinema().getId());
        var row = r.row().trim().toUpperCase();
        if (seatRepository.existsByRoomIdAndRowIgnoreCaseAndNumber(roomId, row, r.number())) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Ghế " + row + r.number() + " đã tồn tại");
        var seat = seatRepository.save(Seat.builder().room(room).row(row).number(r.number()).type(r.type() == null ? SeatType.NORMAL : r.type()).active(r.active() == null || r.active()).build());
        syncSeatCount(room); return seatResponse(seat);
    }

    @Override
    public Object createSeatsBulk(Long roomId, BulkSeatRequest r) {
        var room = room(roomId);
        requireAssignedCinema(room.getCinema().getId());
        var start = normalizedRow(r.startRow());
        var end = normalizedRow(r.endRow());
        if (start.charAt(0) > end.charAt(0)) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Hàng bắt đầu phải đứng trước hàng kết thúc");
        var type = r.type() == null ? SeatType.NORMAL : r.type();
        var active = r.active() == null || r.active();
        var seats = new java.util.ArrayList<Seat>();
        var skipped = 0;
        for (char rowCode = start.charAt(0); rowCode <= end.charAt(0); rowCode++) {
            var row = String.valueOf(rowCode);
            for (int number = 1; number <= r.seatsPerRow(); number++) {
                if (seatRepository.existsByRoomIdAndRowIgnoreCaseAndNumber(roomId, row, number)) { skipped++; continue; }
                seats.add(Seat.builder().room(room).row(row).number(number).type(type).active(active).build());
            }
        }
        var saved = seatRepository.saveAll(seats);
        seatRepository.flush();
        syncSeatCount(room);
        return java.util.Map.of("created", saved.size(), "skipped", skipped, "totalSeats", room.getTotalSeats());
    }

    private String normalizedRow(String value) {
        var row = value == null ? "" : value.trim().toUpperCase();
        if (!row.matches("[A-Z]")) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Hàng ghế phải là một ký tự từ A đến Z");
        return row;
    }

    @Override
    public Object updateSeat(Long roomId, Long seatId, SeatRequest r) {
        var seat = seat(roomId, seatId);
        requireAssignedCinema(seat.getRoom().getCinema().getId());
        if (Boolean.FALSE.equals(r.active()) && bookingSeatRepository.existsFutureActiveBookingBySeatId(
                seatId, LocalDateTime.now(), Set.of(BookingStatus.PENDING, BookingStatus.PAID, BookingStatus.COMPLETED)))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR,
                    "Không thể ngừng hoạt động ghế đã có vé cho suất chiếu tương lai. Vui lòng xử lý vé và hoàn tiền trước.");
        var row = r.row().trim().toUpperCase();
        if ((!seat.getRow().equalsIgnoreCase(row) || !seat.getNumber().equals(r.number())) && seatRepository.existsByRoomIdAndRowIgnoreCaseAndNumber(roomId, row, r.number())) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Ghế " + row + r.number() + " đã tồn tại");
        seat.setRow(row); seat.setNumber(r.number()); if (r.type() != null) seat.setType(r.type()); if (r.active() != null) seat.setActive(r.active());
        return seatResponse(seatRepository.save(seat));
    }

    @Override
    public Object deleteSeat(Long roomId, Long seatId) {
        requireAdmin();
        var seat = seat(roomId, seatId); var room = seat.getRoom(); seatRepository.delete(seat); seatRepository.flush(); syncSeatCount(room); return java.util.Map.of("id", seatId);
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

    private Cinema cinema(Long id) { return cinemaRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy rạp id=" + id)); }
    private CinemaRoom room(Long id) { return roomRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng id=" + id)); }
    private CinemaRoom room(Long cinemaId, Long roomId) { var room = room(roomId); if (!room.getCinema().getId().equals(cinemaId)) throw new ResourceNotFoundException("Phòng không thuộc rạp đã chọn"); return room; }
    private Seat seat(Long roomId, Long seatId) { var seat = seatRepository.findById(seatId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ghế id=" + seatId)); if (!seat.getRoom().getId().equals(roomId)) throw new ResourceNotFoundException("Ghế không thuộc phòng đã chọn"); return seat; }
    private void syncSeatCount(CinemaRoom room) { room.setTotalSeats((int) seatRepository.countByRoomId(room.getId())); roomRepository.save(room); }
    private Object cinemaResponse(Cinema c) {
        var response = new java.util.LinkedHashMap<String, Object>();
        response.put("id", c.getId()); response.put("name", c.getName()); response.put("address", c.getAddress());
        response.put("phone", c.getPhone() == null ? "" : c.getPhone()); response.put("status", c.getStatus());
        response.put("latitude", c.getLatitude()); response.put("longitude", c.getLongitude());
        return response;
    }
    private Object roomResponse(CinemaRoom r) { return java.util.Map.of("id", r.getId(), "cinemaId", r.getCinema().getId(), "name", r.getName(), "totalSeats", r.getTotalSeats() == null ? 0 : r.getTotalSeats(), "active", r.getActive()); }
    private Object seatResponse(Seat s) { return java.util.Map.of("id", s.getId(), "roomId", s.getRoom().getId(), "row", s.getRow(), "number", s.getNumber(), "type", s.getType(), "active", s.getActive()); }
}
