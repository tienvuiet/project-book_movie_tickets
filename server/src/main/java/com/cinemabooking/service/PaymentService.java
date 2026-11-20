package com.cinemabooking.service;

import com.cinemabooking.dto.request.PaymentCheckoutRequest;
import vn.payos.model.webhooks.Webhook;

public interface PaymentService {
    Object checkout(PaymentCheckoutRequest request, String clientIp);
    void handlePayOSWebhook(Webhook webhook);
    Object reconcilePayOSPayment(Long bookingId);
}


