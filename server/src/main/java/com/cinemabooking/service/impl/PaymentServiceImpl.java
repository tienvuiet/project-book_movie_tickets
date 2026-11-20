package com.cinemabooking.service.impl;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;
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
import com.cinemabooking.realtime.SeatEvent;
import com.cinemabooking.realtime.SeatEventPublisher;
import com.cinemabooking.realtime.SeatEventType;
import com.cinemabooking.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.model.webhooks.Webhook;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final SeatLockService seatLockService;
    private final SeatEventPublisher seatEventPublisher;
    private final PayOS payOS;

    @Value("${app.payos.frontend-base-url}")
    private String frontendBaseUrl;

    @Override
    public Object checkout(com.cinemabooking.dto.request.PaymentCheckoutRequest request, String clientIp) {
        var booking = ownedBookingForUpdate(request.bookingId());
        if (booking.getStatus() == BookingStatus.PAID) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Booking đã được thanh toán");
        if (booking.getStatus() != BookingStatus.PENDING) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể thanh toán booking ở trạng thái " + booking.getStatus());
        if (!booking.getExpiresAt().isAfter(LocalDateTime.now())) {
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Thời gian giữ ghế đã hết, vui lòng đặt lại");
        }
        var payment = paymentRepository.findByBookingIdForUpdate(booking.getId()).orElseGet(() -> com.cinemabooking.entity.Payment.builder()
                .booking(booking).amount(booking.getTotalAmount()).build());
        long orderCode = booking.getId();
        if (payment.getProviderOrderCode() != null && payment.getCheckoutUrl() != null) {
            return checkoutResponse(payment);
        }
        payment.setMethod(com.cinemabooking.enums.PaymentMethod.PAYOS);
        payment.setStatus(com.cinemabooking.enums.PaymentStatus.PENDING);
        payment.setProviderOrderCode(orderCode);
        payment.setPaidAt(null);
        payment = paymentRepository.save(payment);

        var paymentRequest = CreatePaymentLinkRequest.builder()
                .orderCode(orderCode)
                .amount(booking.getTotalAmount().longValueExact())
                .description("VE " + booking.getBookingCode())
                .cancelUrl(frontendBaseUrl + "/payment/" + booking.getId() + "?payos=cancelled")
                .returnUrl(frontendBaseUrl + "/success/" + booking.getId() + "?payos=success")
                .expiredAt(Instant.now().plus(
                        Duration.between(LocalDateTime.now(), booking.getExpiresAt())).getEpochSecond())
                .build();
        try {
            var paymentLink = payOS.paymentRequests().create(paymentRequest);
            payment.setPaymentLinkId(paymentLink.getPaymentLinkId());
            payment.setCheckoutUrl(paymentLink.getCheckoutUrl());
            return checkoutResponse(paymentRepository.save(payment));
        } catch (Exception exception) {
            try {
                var existingLink = payOS.paymentRequests().get(orderCode);
                payment.setPaymentLinkId(existingLink.getId());
                payment.setCheckoutUrl("https://pay.payos.vn/web/" + existingLink.getId());
                return checkoutResponse(paymentRepository.save(payment));
            } catch (Exception recoveryException) {
                throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể tạo liên kết thanh toán payOS: " + exception.getMessage());
            }
        }
    }

    @Override
    public void handlePayOSWebhook(Webhook webhook) {
        try {
            var data = payOS.webhooks().verify(webhook);
            var paymentOptional = paymentRepository.findByProviderOrderCodeForUpdate(data.getOrderCode());
            // payOS gửi một webhook mẫu khi đăng ký URL; vẫn trả 200 nếu chữ ký hợp lệ.
            if (paymentOptional.isEmpty()) return;

            var payment = paymentOptional.get();
            if (payment.getStatus() == com.cinemabooking.enums.PaymentStatus.SUCCESS) return;
            if (!"00".equals(data.getCode())) return;
            if (data.getAmount() != payment.getAmount().longValueExact()) {
                throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Số tiền webhook payOS không khớp");
            }

            completePayment(payment, data.getReference());
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Webhook payOS không hợp lệ");
        }
    }

    @Override
    public Object reconcilePayOSPayment(Long bookingId) {
        var booking = ownedBooking(bookingId);
        var payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán của booking id=" + bookingId));
        if (payment.getStatus() == com.cinemabooking.enums.PaymentStatus.SUCCESS) {
            return paymentResponse(payment);
        }
        try {
            var paymentLink = payOS.paymentRequests().get(bookingId);
            if (paymentLink.getStatus() == PaymentLinkStatus.PAID
                    && paymentLink.getAmountPaid() != null
                    && paymentLink.getAmountPaid() == payment.getAmount().longValueExact()) {
                payment = paymentRepository.findByBookingIdForUpdate(bookingId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán của booking id=" + bookingId));
                completePayment(payment, paymentLink.getId());
            }
            return paymentResponse(payment);
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Không thể kiểm tra trạng thái thanh toán payOS");
        }
    }

    private void completePayment(com.cinemabooking.entity.Payment payment, String reference) {
        if (payment.getStatus() == com.cinemabooking.enums.PaymentStatus.SUCCESS) return;
        var booking = payment.getBooking();
        payment.setStatus(com.cinemabooking.enums.PaymentStatus.SUCCESS);
        payment.setProviderReference(reference);
        payment.setTransactionId(reference);
        payment.setPaidAt(LocalDateTime.now());
        booking.setStatus(BookingStatus.PAID);
        paymentRepository.save(payment);
        bookingRepository.save(booking);
        releaseSeatLocks(booking);
        publishBookingEvent(booking, SeatEventType.BOOKING_PAID);
    }

    private com.cinemabooking.entity.Booking ownedBooking(Long id) {
        var booking = bookingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking id=" + id));
        var email = com.cinemabooking.security.CurrentUser.email();
        if (email == null || !booking.getUser().getEmail().equals(email)) throw new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không có quyền thanh toán booking này");
        return booking;
    }

    private com.cinemabooking.entity.Booking ownedBookingForUpdate(Long id) {
        var booking = bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking id=" + id));
        var email = com.cinemabooking.security.CurrentUser.email();
        if (email == null || !booking.getUser().getEmail().equals(email))
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không có quyền thanh toán booking này");
        return booking;
    }

    private Object checkoutResponse(com.cinemabooking.entity.Payment payment) {
        return Map.of(
                "paymentId", payment.getId(),
                "bookingId", payment.getBooking().getId(),
                "status", payment.getStatus().name(),
                "checkoutUrl", payment.getCheckoutUrl());
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

    private Object paymentResponse(com.cinemabooking.entity.Payment payment) {
        var map = new java.util.LinkedHashMap<String, Object>();
        map.put("id", payment.getId()); map.put("bookingId", payment.getBooking().getId());
        map.put("method", payment.getMethod().name()); map.put("status", payment.getStatus().name());
        map.put("amount", payment.getAmount()); map.put("transactionId", payment.getTransactionId());
        map.put("providerOrderCode", payment.getProviderOrderCode());
        map.put("paymentLinkId", payment.getPaymentLinkId());
        map.put("providerReference", payment.getProviderReference());
        map.put("paidAt", payment.getPaidAt() == null ? null : payment.getPaidAt().toString());
        return map;
    }
}
