package com.cinemabooking.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;

import com.cinemabooking.repository.PaymentRepository;
import com.cinemabooking.repository.ShowtimeRepository;
import com.cinemabooking.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {
    private static final int TOP_MOVIE_LIMIT = 5;

    private final PaymentRepository paymentRepository;
    private final ShowtimeRepository showtimeRepository;

    @Override
    public Object getDashboard() {
        LocalDate today = LocalDate.now();
        LocalDate currentFrom = today.withDayOfMonth(1);
        LocalDate currentToExclusive = today.plusDays(1);
        LocalDate previousFrom = currentFrom.minusMonths(1);
        int comparablePreviousDays = Math.min(today.getDayOfMonth(), previousFrom.lengthOfMonth());
        LocalDate previousToExclusive = previousFrom.plusDays(comparablePreviousDays);

        PeriodMetrics current = metrics(currentFrom.atStartOfDay(), currentToExclusive.atStartOfDay());
        PeriodMetrics previous = metrics(previousFrom.atStartOfDay(), previousToExclusive.atStartOfDay());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", Map.of(
                "from", currentFrom,
                "to", today,
                "comparisonFrom", previousFrom,
                "comparisonTo", previousToExclusive.minusDays(1)));
        result.put("stats", Map.of(
                "revenue", current.revenue(),
                "revenueChangePercent", percentageChange(current.revenue(), previous.revenue()),
                "ticketsSold", current.ticketsSold(),
                "ticketsChangePercent", percentageChange(BigDecimal.valueOf(current.ticketsSold()), BigDecimal.valueOf(previous.ticketsSold())),
                "currentlyShowingMovies", showtimeRepository.countCurrentlyShowingMovies(LocalDateTime.now()),
                "growthPercent", percentageChange(current.revenue(), previous.revenue())
        ));
        result.put("revenue", revenueSeries(currentFrom, today));
        result.put("topMovies", topMovies(currentFrom.atStartOfDay(), currentToExclusive.atStartOfDay()));
        result.put("revenueBycinema", revenueBycinema(currentFrom.atStartOfDay(), currentToExclusive.atStartOfDay()));
        result.put("recentTransactions", recentTransactions(currentFrom.atStartOfDay(), currentToExclusive.atStartOfDay()));
        return result;
    }

    @Override
    public Object getRevenue(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime endExclusive = to.plusDays(1).atStartOfDay();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from);
        result.put("to", to);
        result.put("totalRevenue", paymentRepository.sumSuccessfulRevenue(start, endExclusive));
        result.put("ticketsSold", paymentRepository.countSoldTickets(start, endExclusive));
        result.put("dailyRevenue", revenueSeries(from, to));
        result.put("topMovies", topMovies(start, endExclusive));
        return result;
    }

    private PeriodMetrics metrics(LocalDateTime from, LocalDateTime to) {
        return new PeriodMetrics(
                paymentRepository.sumSuccessfulRevenue(from, to),
                paymentRepository.countSoldTickets(from, to));
    }

    private List<Map<String, Object>> revenueSeries(LocalDate from, LocalDate to) {
        Map<LocalDate, BigDecimal> values = new LinkedHashMap<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            values.put(date, BigDecimal.ZERO);
        }
        paymentRepository.sumRevenueByDay(from.atStartOfDay(), to.plusDays(1).atStartOfDay())
                .forEach(row -> values.put(toLocalDate(row[0]), (BigDecimal) row[1]));

        List<Map<String, Object>> series = new ArrayList<>();
        values.forEach((date, amount) -> series.add(Map.of("date", date, "value", amount)));
        return series;
    }

    private List<Map<String, Object>> topMovies(LocalDateTime from, LocalDateTime to) {
        return paymentRepository.findMovieSales(from, to).stream()
                .limit(TOP_MOVIE_LIMIT)
                .map(row -> Map.<String, Object>of(
                        "movieId", row[0],
                        "name", row[1],
                        "tickets", row[2],
                        "revenue", row[3]))
                .toList();
    }

    private List<Map<String, Object>> revenueBycinema(LocalDateTime from, LocalDateTime to) {
        return paymentRepository.findRevenueBycinema(from, to).stream()
                .map(row -> Map.<String, Object>of(
                        "cinemaId", row[0],
                        "name", row[1],
                        "revenue", row[2]))
                .toList();
    }

    private List<Map<String, Object>> recentTransactions(LocalDateTime from, LocalDateTime to) {
        return paymentRepository.findRecentTransactions(from, to, PageRequest.of(0, 10)).stream()
                .map(row -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", row[0]);
                    m.put("bookingCode", row[1]);
                    m.put("customerName", row[2]);
                    m.put("cinemaName", row[3]);
                    m.put("amount", row[4]);
                    m.put("status", row[5] != null ? row[5].toString() : null);
                    m.put("paidAt", row[6]);
                    return m;
                })
                .toList();
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate date) return date;
        if (value instanceof Date date) return date.toLocalDate();
        return LocalDate.parse(value.toString());
    }

    private BigDecimal percentageChange(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return current == null || current.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO : new BigDecimal("100.00");
        }
        return current.subtract(previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous, 2, RoundingMode.HALF_UP);
    }

    private record PeriodMetrics(BigDecimal revenue, long ticketsSold) {}
}
