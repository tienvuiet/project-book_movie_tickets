package com.cinemabooking.controller;

import com.cinemabooking.dto.request.*;
import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.service.PaymentService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.payos.model.webhooks.Webhook;

@RestController @RequestMapping("/api/payments") @RequiredArgsConstructor
public class PaymentController {
    private final PaymentService service;
    @PostMapping("/checkout") public ApiResponse<Object> checkout(@Valid @RequestBody PaymentCheckoutRequest request, HttpServletRequest httpRequest){
        var forwarded = httpRequest.getHeader("X-Forwarded-For");
        return ApiResponse.success(service.checkout(request, forwarded == null ? httpRequest.getRemoteAddr() : forwarded));
    }
    @PostMapping("/payos/webhook")
    public ResponseEntity<String> payOSWebhook(@RequestBody Webhook webhook) {
        service.handlePayOSWebhook(webhook);
        return ResponseEntity.ok("OK");
    }
    @GetMapping("/payos/status/{bookingId}")
    public ApiResponse<Object> payOSStatus(@PathVariable Long bookingId) {
        return ApiResponse.success(service.reconcilePayOSPayment(bookingId));
    }
}

