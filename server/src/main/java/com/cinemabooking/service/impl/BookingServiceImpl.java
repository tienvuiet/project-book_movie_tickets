package com.cinemabooking.service.impl;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Set;

import com.cinemabooking.constant.AppConstants;
import com.cinemabooking.dto.request.BookingRequest;
import com.cinemabooking.dto.request.PromoCodeRequest;
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
import com.cinemabooking.realtime.SeatEvent;
import com.cinemabooking.realtime.SeatEventPublisher;
import com.cinemabooking.realtime.SeatEventType;
import com.cinemabooking.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingServiceImpl implements BookingService {
    private final ShowtimeRepository showtimeRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingRepository bookingRepository;
    private final SeatRepository seatRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final SeatLockService seatLockService;
    private final SeatEventPublisher seatEventPublisher;
    private final PromotionManagementService promotionManagementService;

    private static final java.math.BigDecimal VIP_MULTIPLIER = new java.math.BigDecimal("1.2");
    private static final java.math.BigDecimal COUPLE_MULTIPLIER = new java.math.BigDecimal("2.0");

    @Override
    public Object createBooking(BookingRequest r) {
        var email = com.cinemabooking.security.CurrentUser.email();
        var user = userRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Chưa đăng nhập"));
        var showtime = showtimeRepository.findById(r.showtimeId()).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy suất chiếu"));
        if (!showtime.getStartTime().isAfter(LocalDateTime.now()))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể đặt vé cho suất chiếu đã bắt đầu");
        var showtimeStatus = com.cinemabooking.util.ShowtimeStatusResolver.resolve(showtime);
        if (showtimeStatus == com.cinemabooking.enums.ShowtimeStatus.CANCELLED)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Suất chiếu đã bị hủy, không thể đặt vé");
        if (showtimeStatus != com.cinemabooking.enums.ShowtimeStatus.SCHEDULED)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Suất chiếu đã bắt đầu hoặc kết thúc, không thể đặt vé");
        if (!showtime.getRoom().getActive())
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Phòng chiếu đã ngừng hoạt động, không thể đặt vé");
        var seats = seatRepository.findAllById(r.seatIds());
        if (seats.size() != r.seatIds().size())
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Một hoặc nhiều ghế không tồn tại");
        for (var seat : seats) {
            if (!seat.getRoom().getId().equals(showtime.getRoom().getId()))
                throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Ghế " + seat.getRow() + seat.getNumber() + " không thuộc phòng chiếu này");
            if (!seat.getActive())
                throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Ghế " + seat.getRow() + seat.getNumber() + " đang ngừng hoạt động");
        }

        var requestedSeatIds = new java.util.HashSet<>(r.seatIds());
        var pendingBookings = bookingRepository
                .findAllByUserIdAndShowtimeIdAndStatusOrderByCreatedAtDesc(
                        user.getId(), r.showtimeId(), BookingStatus.PENDING);
        for (var pendingBooking : pendingBookings) {
            expireIfNeeded(pendingBooking);
            if (pendingBooking.getStatus() != BookingStatus.PENDING) continue;

            var pendingSeatIds = pendingBooking.getBookingSeats().stream()
                    .map(item -> item.getSeat().getId())
                    .collect(java.util.stream.Collectors.toSet());
            if (pendingSeatIds.equals(requestedSeatIds)) {
                return bookingResponse(pendingBooking);
            }

            pendingBooking.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(pendingBooking);
            releaseSeatLocks(pendingBooking);
            publishBookingEvent(pendingBooking, SeatEventType.SEAT_RELEASED);
        }

        if (!seatLockService.acquire(r.showtimeId(), r.seatIds(), user.getId()))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Một hoặc nhiều ghế đang được người khác giữ");
        registerSeatLockRollbackRelease(r.showtimeId(), r.seatIds(), user.getId());

        // Redis handles the fast distributed lock; MySQL remains the final protection layer.
        showtime = showtimeRepository.findByIdForUpdate(r.showtimeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy suất chiếu"));
        if (bookingSeatRepository.existsReservedSeats(r.showtimeId(), r.seatIds(), Set.of(BookingStatus.PENDING, BookingStatus.PAID))) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Một hoặc nhiều ghế đã được giữ hoặc thanh toán");
        }

        var basePrice = showtime.getBasePrice();
        var totalAmount = java.math.BigDecimal.ZERO;
        var booking = com.cinemabooking.entity.Booking.builder()
                .bookingCode(generateBookingCode())
                .user(user).showtime(showtime)
                .status(BookingStatus.PENDING)
                .totalAmount(java.math.BigDecimal.ZERO)
                .expiresAt(LocalDateTime.now().plus(seatLockService.lockDuration()))
                .build();
        booking = bookingRepository.save(booking);

        for (var seat : seats) {
            var price = switch (seat.getType()) {
                case VIP -> basePrice.multiply(VIP_MULTIPLIER);
                case COUPLE -> basePrice.multiply(COUPLE_MULTIPLIER);
                default -> basePrice;
            };
            totalAmount = totalAmount.add(price);
            var bs = com.cinemabooking.entity.BookingSeat.builder().booking(booking).seat(seat).price(price).build();
            bookingSeatRepository.save(bs);
        }
        var promoCode = r.promoCode() == null ? "" : r.promoCode().trim().toUpperCase(java.util.Locale.ROOT);
        var discountAmount = java.math.BigDecimal.ZERO;
        if (!promoCode.isBlank()) {
            discountAmount = promotionManagementService.calculateDiscount(
                    promoCode,
                    totalAmount,
                    user.getId(),
                    showtime.getMovie().getId(),
                    showtime.getRoom().getCinema().getId());
            booking.setPromoCode(promoCode);
        }
        booking.setDiscountAmount(discountAmount);
        booking.setTotalAmount(totalAmount.subtract(discountAmount));
        booking = bookingRepository.save(booking);
        seatEventPublisher.publishAfterCommit(new SeatEvent(
                SeatEventType.SEAT_HELD,
                booking.getShowtime().getId(),
                r.seatIds().stream().sorted().toList(),
                booking.getExpiresAt().toString(),
                r.reservationClientId()));
        return bookingResponse(booking);
    }

    @Override
    public Object applyPromoCode(Long id, PromoCodeRequest request) {
        var booking = bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking id=" + id));
        var email = com.cinemabooking.security.CurrentUser.email();
        if (email == null || !booking.getUser().getEmail().equals(email))
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không có quyền áp mã cho booking này");
        expireIfNeeded(booking);
        if (booking.getStatus() != BookingStatus.PENDING)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Chỉ có thể áp mã cho đơn đang chờ thanh toán");
        if (!booking.getExpiresAt().isAfter(LocalDateTime.now()))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Đã hết thời gian giữ ghế");

        var payment = paymentRepository.findByBookingId(id).orElse(null);
        if (payment != null && payment.getCheckoutUrl() != null)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Liên kết thanh toán đã được tạo, không thể thay đổi mã giảm giá");

        var promoCode = request.promoCode().trim().toUpperCase(java.util.Locale.ROOT);
        var currentDiscount = booking.getDiscountAmount() == null ? java.math.BigDecimal.ZERO : booking.getDiscountAmount();
        var subtotal = booking.getTotalAmount().add(currentDiscount);
        var discountAmount = promotionManagementService.calculateDiscount(
                promoCode,
                subtotal,
                booking.getUser().getId(),
                booking.getShowtime().getMovie().getId(),
                booking.getShowtime().getRoom().getCinema().getId());
        booking.setPromoCode(promoCode);
        booking.setDiscountAmount(discountAmount);
        booking.setTotalAmount(subtotal.subtract(discountAmount));
        booking = bookingRepository.save(booking);
        if (payment != null) {
            payment.setAmount(booking.getTotalAmount());
            paymentRepository.save(payment);
        }
        return bookingResponse(booking);
    }

    @Override
    public Object removePromoCode(Long id) {
        var booking = bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking id=" + id));
        var email = com.cinemabooking.security.CurrentUser.email();
        if (email == null || !booking.getUser().getEmail().equals(email))
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không có quyền bỏ mã cho booking này");
        expireIfNeeded(booking);
        if (booking.getStatus() != BookingStatus.PENDING)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Chỉ có thể bỏ mã khỏi đơn đang chờ thanh toán");
        if (!booking.getExpiresAt().isAfter(LocalDateTime.now()))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Đã hết thời gian giữ ghế");

        var payment = paymentRepository.findByBookingId(id).orElse(null);
        if (payment != null && payment.getCheckoutUrl() != null)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Liên kết thanh toán đã được tạo, không thể thay đổi mã giảm giá");

        var currentDiscount = booking.getDiscountAmount() == null
                ? java.math.BigDecimal.ZERO
                : booking.getDiscountAmount();
        booking.setTotalAmount(booking.getTotalAmount().add(currentDiscount));
        booking.setPromoCode(null);
        booking.setDiscountAmount(java.math.BigDecimal.ZERO);
        booking = bookingRepository.save(booking);
        if (payment != null) {
            payment.setAmount(booking.getTotalAmount());
            paymentRepository.save(payment);
        }
        return bookingResponse(booking);
    }

    @Override
    public Object getBooking(Long id) {
        var booking = bookingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking id=" + id));
        expireIfNeeded(booking);
        var email = com.cinemabooking.security.CurrentUser.email();
        if (email != null && !booking.getUser().getEmail().equals(email)) {
            var user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không có quyền xem booking này"));
            var isAdmin = user.getUserRoles().stream()
                    .anyMatch(ur -> "ADMIN".equalsIgnoreCase(ur.getRole().getName()));
            var isStaff = user.getUserRoles().stream()
                    .anyMatch(ur -> "STAFF".equalsIgnoreCase(ur.getRole().getName()));
            if (isStaff && !isAdmin) requireAssignedCinema(booking);
            else if (!isAdmin) throw new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không có quyền xem booking này");
        }
        return bookingResponse(booking);
    }

    @Override
    public Object getBookingByCode(String bookingCode) {
        var normalizedCode = bookingCode == null ? "" : bookingCode.trim();
        var booking = bookingRepository.findByBookingCodeIgnoreCase(normalizedCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vé có mã " + normalizedCode));
        expireIfNeeded(booking);
        requireAssignedCinema(booking);
        return bookingResponse(booking);
    }

    @Override
    public Object getMyBookings() {
        var email = com.cinemabooking.security.CurrentUser.email();
        var user = userRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Chưa đăng nhập"));
        var bookings = bookingRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
        bookings.forEach(this::expireIfNeeded);
        return bookings.stream().map(this::bookingResponse).toList();
    }

    @Override
    public Object getAllBookings() {
        var bookings = bookingRepository.findAllByOrderByCreatedAtDesc();
        bookings.forEach(this::expireIfNeeded);
        return bookings.stream().map(this::bookingResponse).toList();
    }

    @Override
    public Object getStaffBookings() {
        var user = currentUser();
        var isAdmin = user.getUserRoles().stream().anyMatch(item -> "ADMIN".equalsIgnoreCase(item.getRole().getName()));
        var cinemaId = user.getCinema() == null ? null : user.getCinema().getId();
        if (!isAdmin && cinemaId == null) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Nhân viên chưa được phân công rạp");
        var bookings = bookingRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(booking -> isAdmin || booking.getShowtime().getRoom().getCinema().getId().equals(cinemaId)).toList();
        bookings.forEach(this::expireIfNeeded);
        return bookings.stream().map(this::bookingResponse).toList();
    }

    @Override
    public Object adminCancelBooking(Long id) {
        var booking = bookingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking id=" + id));
        expireIfNeeded(booking);
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.PAID)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể hủy booking ở trạng thái " + booking.getStatus());
        booking.setStatus(BookingStatus.CANCELLED);
        booking = bookingRepository.save(booking);
        releaseSeatLocks(booking);
        publishBookingEvent(booking, SeatEventType.SEAT_RELEASED);
        return bookingResponse(booking);
    }

    @Override
    public Object cancelBooking(Long id) {
        var booking = bookingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking id=" + id));
        var email = com.cinemabooking.security.CurrentUser.email();
        if (!booking.getUser().getEmail().equals(email)) throw new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không có quyền hủy booking này");
        expireIfNeeded(booking);
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.PAID)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể hủy booking ở trạng thái " + booking.getStatus());
        if (booking.getStatus() == BookingStatus.PAID) {
            var showtime = booking.getShowtime();
            if (!showtime.getStartTime().minusHours(AppConstants.MIN_CANCEL_BEFORE_SHOWTIME_HOURS).isAfter(LocalDateTime.now()))
                throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Chỉ có thể hủy vé đã thanh toán trước suất chiếu ít nhất " + AppConstants.MIN_CANCEL_BEFORE_SHOWTIME_HOURS + " giờ");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        booking = bookingRepository.save(booking);
        releaseSeatLocks(booking);
        publishBookingEvent(booking, SeatEventType.SEAT_RELEASED);
        return bookingResponse(booking);
    }

    private void expireIfNeeded(com.cinemabooking.entity.Booking booking) {
        if (booking.getStatus() == BookingStatus.PENDING && !booking.getExpiresAt().isAfter(LocalDateTime.now())) {
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);
            releaseSeatLocks(booking);
            publishBookingEvent(booking, SeatEventType.BOOKING_EXPIRED);
        }
    }

    private void releaseSeatLocks(com.cinemabooking.entity.Booking booking) {
        seatLockService.release(
                booking.getShowtime().getId(),
                booking.getBookingSeats().stream().map(item -> item.getSeat().getId()).toList(),
                booking.getUser().getId());
    }

    private void publishBookingEvent(com.cinemabooking.entity.Booking booking, SeatEventType type) {
        seatEventPublisher.publishAfterCommit(new SeatEvent(
                type,
                booking.getShowtime().getId(),
                booking.getBookingSeats().stream().map(item -> item.getSeat().getId()).sorted().toList(),
                null));
    }

    private void registerSeatLockRollbackRelease(Long showtimeId, Collection<Long> seatIds, Long userId) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) seatLockService.release(showtimeId, seatIds, userId);
            }
        });
    }

    @Override
    public Object checkinBooking(Long id) {
        var booking = bookingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking id=" + id));
        requireAssignedCinema(booking);
        if (booking.getCheckedInAt() != null)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Booking đã được check-in trước đó");
        if (booking.getStatus() != BookingStatus.PAID)
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Chỉ có thể check-in booking đã thanh toán");
        var now = LocalDateTime.now();
        var showtime = booking.getShowtime();
        if (now.isAfter(showtime.getEndTime()))
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Suất chiếu đã kết thúc, không thể check-in");
        booking.setCheckedInAt(now);
        booking.setStatus(BookingStatus.COMPLETED);
        return bookingResponse(bookingRepository.save(booking));
    }

    private Object bookingResponse(com.cinemabooking.entity.Booking b) {
        var showtime = b.getShowtime();
        var movie = showtime.getMovie();
        var room = showtime.getRoom();
        var cinema = room.getCinema();
        var seats = b.getBookingSeats().stream().map(bs -> java.util.Map.of(
            "seatId", bs.getSeat().getId(), "row", bs.getSeat().getRow(), "number", bs.getSeat().getNumber(),
            "type", bs.getSeat().getType().name(), "price", bs.getPrice()
        )).toList();
        var map = new java.util.LinkedHashMap<String, Object>();
        map.put("id", b.getId()); map.put("bookingCode", b.getBookingCode()); map.put("status", b.getStatus().name());
        map.put("customerName", b.getUser().getFullName()); map.put("customerEmail", b.getUser().getEmail());
        map.put("customerPhone", b.getUser().getPhone() == null ? "" : b.getUser().getPhone());
        map.put("totalAmount", b.getTotalAmount()); map.put("promoCode", b.getPromoCode()); map.put("discountAmount", b.getDiscountAmount()); map.put("expiresAt", b.getExpiresAt().toString()); map.put("createdAt", b.getCreatedAt().toString());
        map.put("remainingPaymentSeconds", b.getStatus() == BookingStatus.PENDING
                ? Math.max(0, Duration.between(LocalDateTime.now(), b.getExpiresAt()).toSeconds())
                : 0);
        map.put("remainingPaymentMillis", b.getStatus() == BookingStatus.PENDING
                ? Math.max(0, Duration.between(LocalDateTime.now(), b.getExpiresAt()).toMillis())
                : 0);
        map.put("checkedInAt", b.getCheckedInAt() == null ? null : b.getCheckedInAt().toString());
        map.put("movieTitle", movie.getTitle()); map.put("moviePosterUrl", movie.getPosterUrl() == null ? "" : movie.getPosterUrl());
        map.put("cinemaId", cinema.getId()); map.put("cinemaName", cinema.getName()); map.put("cinemaAddress", cinema.getAddress());
        map.put("showtimeId", showtime.getId()); map.put("roomId", room.getId()); map.put("roomName", room.getName());
        map.put("startTime", showtime.getStartTime().toString()); map.put("endTime", showtime.getEndTime().toString());
        map.put("seats", seats); map.put("seatCount", seats.size());
        var payment = paymentRepository.findByBookingId(b.getId()).orElse(null);
        map.put("paymentTime", payment == null || payment.getPaidAt() == null ? null : payment.getPaidAt().toString());
        map.put("paymentStatus", payment == null ? null : payment.getStatus().name());
        map.put("paymentMethod", payment == null || payment.getMethod() == null ? null : payment.getMethod().name());
        map.put("transactionId", payment == null ? null : payment.getTransactionId());
        return map;
    }

    private String generateBookingCode() {
        return "BK" + System.currentTimeMillis() + String.format("%04d", new java.util.Random().nextInt(10000));
    }

    private com.cinemabooking.entity.User currentUser() {
        return userRepository.findByEmail(com.cinemabooking.security.CurrentUser.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private void requireAssignedCinema(com.cinemabooking.entity.Booking booking) {
        var user = currentUser();
        var isAdmin = user.getUserRoles().stream().anyMatch(item -> "ADMIN".equalsIgnoreCase(item.getRole().getName()));
        if (isAdmin) return;
        if (user.getCinema() == null) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Nhân viên chưa được phân công rạp");
        if (!user.getCinema().getId().equals(booking.getShowtime().getRoom().getCinema().getId()))
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Vé không thuộc rạp được phân công");
    }
}
