package com.cinemabooking.service;

import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.exception.ErrorCode;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GeocodingService {
    private static final long MIN_REQUEST_INTERVAL_MS = 1_000;

    private final RestClient client;
    private final Map<String, Coordinates> cache = new ConcurrentHashMap<>();
    private long lastRequestAt;

    public GeocodingService(
            @Value("${app.geocoding.base-url:https://nominatim.openstreetmap.org}") String baseUrl,
            @Value("${app.geocoding.user-agent:CinemaBooking/1.0}") String userAgent) {
        this.client = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.USER_AGENT, userAgent)
                .build();
    }

    public Coordinates resolve(String address) {
        var normalized = address == null ? "" : address.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Địa chỉ rạp không được để trống");
        var cached = cache.get(normalized);
        if (cached != null) return cached;

        var coordinates = request(address.trim());
        cache.put(normalized, coordinates);
        return coordinates;
    }

    private synchronized Coordinates request(String address) {
        waitForRateLimit();
        try {
            var results = client.get()
                    .uri(builder -> builder.path("/search")
                            .queryParam("q", address)
                            .queryParam("format", "jsonv2")
                            .queryParam("limit", 1)
                            .queryParam("countrycodes", "vn")
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<NominatimResult>>() {});
            lastRequestAt = System.currentTimeMillis();
            if (results == null || results.isEmpty()) {
                throw new BusinessException(ErrorCode.BUSINESS_ERROR,
                        "Không tìm thấy địa chỉ trên OpenStreetMap. Vui lòng nhập địa chỉ chi tiết hơn.");
            }
            var result = results.getFirst();
            return new Coordinates(new BigDecimal(result.lat()), new BigDecimal(result.lon()), result.displayName());
        } catch (BusinessException exception) {
            throw exception;
        } catch (RestClientException | NumberFormatException exception) {
            lastRequestAt = System.currentTimeMillis();
            throw new BusinessException(ErrorCode.BUSINESS_ERROR,
                    "Không thể xác định tọa độ từ địa chỉ lúc này. Vui lòng thử lại.");
        }
    }

    private void waitForRateLimit() {
        var waitMs = MIN_REQUEST_INTERVAL_MS - (System.currentTimeMillis() - lastRequestAt);
        if (waitMs <= 0) return;
        try {
            Thread.sleep(waitMs);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Yêu cầu xác định vị trí đã bị gián đoạn");
        }
    }

    public record Coordinates(BigDecimal latitude, BigDecimal longitude, String displayName) {}

    private record NominatimResult(String lat, String lon, @JsonProperty("display_name") String displayName) {}
}
