package com.cinemabooking.service.impl;

import com.cinemabooking.dto.request.PaymentCheckoutRequest;
import com.cinemabooking.entity.*;
import com.cinemabooking.enums.*;
import com.cinemabooking.realtime.SeatEventPublisher;
import com.cinemabooking.repository.*;
import com.cinemabooking.service.SeatLockService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.model.webhooks.Webhook;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {
    @Mock PaymentRepository paymentRepository;
    @Mock BookingRepository bookingRepository;
    @Mock UserRepository userRepository;
    @Mock SeatLockService seatLockService;
    @Mock SeatEventPublisher seatEventPublisher;
    @Mock PayOS payOS;
    @InjectMocks PaymentServiceImpl service;

    @BeforeEach void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("customer@example.com", null));
    }
    @AfterEach void clearAuthentication() { SecurityContextHolder.clearContext(); }

    @Test
    void repeatedCheckoutReturnsStoredLinkWithoutCreatingAnotherPayOSOrder() {
        var booking = booking(10L, BookingStatus.PENDING, LocalDateTime.now().plusMinutes(10));
        var payment = payment(booking, PaymentStatus.PENDING);
        payment.setProviderOrderCode(10L);
        payment.setCheckoutUrl("https://pay.payos.vn/web/existing");
        when(bookingRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));
        when(paymentRepository.findByBookingIdForUpdate(10L)).thenReturn(Optional.of(payment));

        var first = service.checkout(new PaymentCheckoutRequest(10L, PaymentMethod.PAYOS), "127.0.0.1");
        var second = service.checkout(new PaymentCheckoutRequest(10L, PaymentMethod.PAYOS), "127.0.0.1");

        assertEquals(first, second);
        verify(payOS, never()).paymentRequests();
    }

    @Test
    void duplicateWebhookCompletesAndPublishesOnlyOnce() {
        var booking = booking(20L, BookingStatus.PENDING, LocalDateTime.now().plusMinutes(10));
        var payment = payment(booking, PaymentStatus.PENDING);
        payment.setProviderOrderCode(20L);
        var webhook = mock(Webhook.class);
        var data = mock(WebhookData.class);
        var webhooks = mock(vn.payos.service.blocking.webhooks.WebhooksService.class);
        when(payOS.webhooks()).thenReturn(webhooks);
        when(webhooks.verify(webhook)).thenReturn(data);
        when(data.getOrderCode()).thenReturn(20L);
        when(data.getCode()).thenReturn("00");
        when(data.getAmount()).thenReturn(100_000L);
        when(data.getReference()).thenReturn("BANK-REF-1");
        when(paymentRepository.findByProviderOrderCodeForUpdate(20L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.handlePayOSWebhook(webhook);
        service.handlePayOSWebhook(webhook);

        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertEquals(BookingStatus.PAID, booking.getStatus());
        assertEquals("BANK-REF-1", payment.getProviderReference());
        verify(seatEventPublisher, times(1)).publishAfterCommit(any());
    }

    @Test
    void reconciliationAcceptsPaymentThatArrivedAfterLocalBookingExpiry() {
        var booking = booking(30L, BookingStatus.EXPIRED, LocalDateTime.now().minusMinutes(1));
        var payment = payment(booking, PaymentStatus.PENDING);
        payment.setProviderOrderCode(30L);
        var link = mock(PaymentLink.class);
        var requests = mock(vn.payos.service.blocking.v2.paymentRequests.PaymentRequestsService.class);
        when(payOS.paymentRequests()).thenReturn(requests);
        when(requests.get(30L)).thenReturn(link);
        when(link.getStatus()).thenReturn(PaymentLinkStatus.PAID);
        when(link.getAmountPaid()).thenReturn(100_000L);
        when(link.getId()).thenReturn("pay-link-30");
        when(bookingRepository.findById(30L)).thenReturn(Optional.of(booking));
        when(paymentRepository.findByBookingId(30L)).thenReturn(Optional.of(payment));
        when(paymentRepository.findByBookingIdForUpdate(30L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.reconcilePayOSPayment(30L);

        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertEquals(BookingStatus.PAID, booking.getStatus());
        verify(seatEventPublisher, times(1)).publishAfterCommit(any());
    }

    private Booking booking(Long id, BookingStatus status, LocalDateTime expiresAt) {
        var user = User.builder().id(1L).email("customer@example.com").build();
        var showtime = Showtime.builder().id(2L).build();
        return Booking.builder().id(id).bookingCode("BK" + id).user(user).showtime(showtime).status(status)
                .totalAmount(new BigDecimal("100000")).expiresAt(expiresAt).bookingSeats(new HashSet<>()).build();
    }

    private Payment payment(Booking booking, PaymentStatus status) {
        return Payment.builder().id(100L + booking.getId()).booking(booking).method(PaymentMethod.PAYOS)
                .status(status).amount(booking.getTotalAmount()).build();
    }
}
