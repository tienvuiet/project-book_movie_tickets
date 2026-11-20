package com.cinemabooking.service;

import com.cinemabooking.dto.request.PromotionRequest;
import com.cinemabooking.dto.response.PageResponse;
import com.cinemabooking.dto.response.PromotionResponse;
import com.cinemabooking.entity.Promotion;
import com.cinemabooking.enums.PromotionDiscountType;
import com.cinemabooking.enums.PromotionScope;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.exception.ErrorCode;
import com.cinemabooking.exception.ResourceNotFoundException;
import com.cinemabooking.repository.PromotionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
public class PromotionManagementService {
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final PromotionRepository promotionRepository;
    private final Clock businessClock;

    public PromotionManagementService(PromotionRepository promotionRepository, Clock businessClock) {
        this.promotionRepository = promotionRepository;
        this.businessClock = businessClock;
    }

    @Transactional(readOnly = true)
    public PageResponse<PromotionResponse> getAll(int page, int size, String search, String status,
                                                   PromotionDiscountType discountType) {
        var now = now();
        Specification<Promotion> spec = Specification.where(null);
        if (search != null && !search.isBlank()) {
            var keyword = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("code")), keyword),
                    cb.like(cb.lower(root.get("name")), keyword)));
        }
        if (discountType != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("discountType"), discountType));
        }
        spec = applyStatusFilter(spec, status, now);

        var pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)),
                Sort.by(Sort.Direction.DESC, "id"));
        var entities = promotionRepository.findAll(spec, pageable);
        var usage = usageByCodes(entities.getContent().stream().map(Promotion::getCode).toList());
        return PageResponse.from(entities.map(item -> toResponse(item, usage.get(item.getCode()), now)));
    }

    @Transactional(readOnly = true)
    public PromotionResponse getById(Long id) {
        var promotion = find(id);
        return toResponse(promotion, usageForCode(promotion.getCode()), now());
    }

    public PromotionResponse create(PromotionRequest request) {
        var code = normalizeCode(request.code());
        if (promotionRepository.existsByCodeIgnoreCase(code)) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Mã khuyến mãi đã tồn tại");
        }
        var promotion = new Promotion();
        apply(promotion, request, code);
        promotion.setCreatedBy("Admin");
        promotionRepository.save(promotion);
        return toResponse(promotion, null, now());
    }

    public PromotionResponse update(Long id, PromotionRequest request) {
        var promotion = find(id);
        var code = normalizeCode(request.code());
        if (promotionRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR, "Mã khuyến mãi đã tồn tại");
        }
        apply(promotion, request, code);
        promotionRepository.save(promotion);
        return toResponse(promotion, usageForCode(code), now());
    }

    public PromotionResponse toggleActive(Long id, boolean active) {
        var promotion = find(id);
        promotion.setActive(active);
        promotionRepository.save(promotion);
        return toResponse(promotion, usageForCode(promotion.getCode()), now());
    }

    @Transactional(readOnly = true)
    public List<PromotionResponse> getAvailable(BigDecimal orderAmount, Long movieId, Long cinemaId) {
        var now = now();
        var promotions = promotionRepository
                .findAllByActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByIdDesc(now, now);
        var usage = usageByCodes(promotions.stream().map(Promotion::getCode).toList());
        return promotions.stream()
                .filter(item -> isAvailable(item, usage.getOrDefault(item.getCode(), Usage.ZERO),
                        orderAmount, movieId, cinemaId, now))
                .map(item -> toResponse(item, usage.getOrDefault(item.getCode(), Usage.ZERO), now))
                .toList();
    }

    @Transactional(readOnly = true)
    public PromotionResponse validateCode(String code, BigDecimal orderAmount, Long movieId, Long cinemaId) {
        var promotion = findByCode(code);
        var usage = usageForCode(promotion.getCode());
        var now = now();
        validateEligibility(promotion, usage, orderAmount, null, movieId, cinemaId, now);
        return toResponse(promotion, usage, now);
    }

    @Transactional(readOnly = true)
    public BigDecimal calculateDiscount(String code, BigDecimal orderAmount, Long userId,
                                        Long movieId, Long cinemaId) {
        var promotion = findByCode(code);
        var usage = usageForCode(promotion.getCode());
        validateEligibility(promotion, usage, orderAmount, userId, movieId, cinemaId, now());

        var discount = promotion.getDiscountType() == PromotionDiscountType.PERCENT
                ? orderAmount.multiply(promotion.getDiscountValue())
                    .divide(ONE_HUNDRED, 2, RoundingMode.DOWN)
                : promotion.getDiscountValue();
        if (promotion.getMaxDiscount() != null) discount = discount.min(promotion.getMaxDiscount());
        return discount.min(orderAmount).max(BigDecimal.ZERO);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStats(Long id) {
        var promotion = find(id);
        var usage = usageForCode(promotion.getCode());
        return Map.of(
                "totalUsed", usage.totalUsed(),
                "totalDiscount", usage.totalDiscount(),
                "holdCount", 0,
                "refundedCount", 0,
                "successRate", usage.totalUsed() > 0 ? "100%" : "—",
                "dailyUsage", List.of(),
                "recentUsage", List.of());
    }

    private void apply(Promotion target, PromotionRequest request, String code) {
        validateBusinessRules(request);
        target.setCode(code);
        target.setName(request.name().trim());
        target.setDescription(request.description() == null ? null : request.description().trim());
        target.setImageUrl(request.imageUrl().trim());
        target.setActive(request.active());
        target.setDiscountType(request.discountType());
        target.setDiscountValue(request.discountValue());
        target.setMaxDiscount(request.maxDiscount());
        target.setMinOrderValue(request.minOrderValue() == null ? BigDecimal.ZERO : request.minOrderValue());
        target.setStartDate(request.startDate());
        target.setEndDate(request.endDate());
        target.setWeekdays(copy(request.weekdays()));
        target.setApplyToMovies(request.applyToMovies() == null ? PromotionScope.ALL : request.applyToMovies());
        target.setApplyCinemas(request.applyCinemas() == null ? PromotionScope.ALL : request.applyCinemas());
        target.setMovieIds(copy(request.movieIds()));
        target.setCinemaIds(copy(request.cinemaIds()));
        target.setMaxUsage(request.maxUsage());
        target.setMaxPerUser(request.maxPerUser());
        target.setAllowStack(request.allowStack());
        target.setRequireLogin(request.requireLogin());
    }

    private void validateBusinessRules(PromotionRequest request) {
        if (request.discountType() == PromotionDiscountType.PERCENT
                && request.discountValue().compareTo(ONE_HUNDRED) > 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Phần trăm giảm không được vượt quá 100%");
        }
        if (request.applyToMovies() == PromotionScope.SELECTED
                && (request.movieIds() == null || request.movieIds().isEmpty())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Vui lòng chọn ít nhất một phim");
        }
        if (request.applyCinemas() == PromotionScope.SELECTED
                && (request.cinemaIds() == null || request.cinemaIds().isEmpty())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Vui lòng chọn ít nhất một rạp");
        }
    }

    private void validateEligibility(Promotion promotion, Usage usage, BigDecimal orderAmount, Long userId,
                                     Long movieId, Long cinemaId, LocalDateTime now) {
        if (!promotion.isActive()) throw unavailable("Khuyến mãi đang tạm dừng");
        if (now.isBefore(promotion.getStartDate())) throw unavailable("Khuyến mãi chưa bắt đầu");
        if (now.isAfter(promotion.getEndDate())) throw unavailable("Khuyến mãi đã hết hạn");
        if (usage.totalUsed() >= promotion.getMaxUsage()) throw unavailable("Khuyến mãi đã hết lượt sử dụng");
        if (orderAmount != null && orderAmount.compareTo(promotion.getMinOrderValue()) < 0) {
            throw unavailable("Đơn hàng chưa đạt giá trị tối thiểu");
        }
        var weekday = now.getDayOfWeek().getValue() % 7;
        if (!promotion.getWeekdays().isEmpty() && !promotion.getWeekdays().contains(weekday)) {
            throw unavailable("Khuyến mãi không áp dụng hôm nay");
        }
        if (promotion.getApplyToMovies() == PromotionScope.SELECTED
                && (movieId == null || !promotion.getMovieIds().contains(movieId))) {
            throw unavailable("Khuyến mãi không áp dụng cho phim này");
        }
        if (promotion.getApplyCinemas() == PromotionScope.SELECTED
                && (cinemaId == null || !promotion.getCinemaIds().contains(cinemaId))) {
            throw unavailable("Khuyến mãi không áp dụng cho rạp này");
        }
        if (userId != null && promotionRepository.countSuccessfulUsageByUser(promotion.getCode(), userId)
                >= promotion.getMaxPerUser()) {
            throw unavailable("Tài khoản đã dùng hết lượt cho mã này");
        }
    }

    private boolean isAvailable(Promotion promotion, Usage usage, BigDecimal orderAmount,
                                Long movieId, Long cinemaId, LocalDateTime now) {
        try {
            validateEligibility(promotion, usage, orderAmount, null, movieId, cinemaId, now);
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    private Specification<Promotion> applyStatusFilter(Specification<Promotion> spec, String status,
                                                        LocalDateTime now) {
        if (status == null || status.isBlank()) return spec;
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "ACTIVE" -> spec.and((root, query, cb) -> cb.and(
                    cb.isTrue(root.get("active")),
                    cb.lessThanOrEqualTo(root.<LocalDateTime>get("startDate"), now),
                    cb.greaterThanOrEqualTo(root.<LocalDateTime>get("endDate"), now)));
            case "INACTIVE", "PAUSED", "DRAFT" -> spec.and((root, query, cb) -> cb.isFalse(root.get("active")));
            case "EXPIRED" -> spec.and((root, query, cb) -> cb.lessThan(root.<LocalDateTime>get("endDate"), now));
            case "EXPIRING_SOON" -> spec.and((root, query, cb) -> cb.and(
                    cb.isTrue(root.get("active")),
                    cb.lessThanOrEqualTo(root.<LocalDateTime>get("startDate"), now),
                    cb.between(root.<LocalDateTime>get("endDate"), now, now.plusDays(7))));
            case "SCHEDULED" -> spec.and((root, query, cb) -> cb.and(
                    cb.isTrue(root.get("active")),
                    cb.greaterThan(root.<LocalDateTime>get("startDate"), now)));
            default -> spec;
        };
    }

    private PromotionResponse toResponse(Promotion item, Usage usage, LocalDateTime now) {
        var actualUsage = usage == null ? Usage.ZERO : usage;
        return new PromotionResponse(
                item.getId(), item.getCode(), item.getName(), item.getDescription(), item.getImageUrl(),
                item.isActive(), resolveStatus(item, now), item.getDiscountType(), item.getDiscountValue(),
                item.getMaxDiscount(), item.getMinOrderValue(), item.getStartDate(), item.getEndDate(),
                Set.copyOf(item.getWeekdays()), item.getApplyToMovies(), item.getApplyCinemas(),
                Set.copyOf(item.getMovieIds()), Set.copyOf(item.getCinemaIds()), item.getMaxUsage(),
                actualUsage.totalUsed(), item.getMaxPerUser(), item.isAllowStack(), item.isRequireLogin(),
                item.getCreatedBy(), item.getCreatedAt(), item.getUpdatedAt(), actualUsage.totalDiscount());
    }

    private String resolveStatus(Promotion item, LocalDateTime now) {
        if (!item.isActive()) return "INACTIVE";
        if (now.isAfter(item.getEndDate())) return "EXPIRED";
        if (now.isBefore(item.getStartDate())) return "SCHEDULED";
        if (!item.getEndDate().isAfter(now.plusDays(7))) return "EXPIRING_SOON";
        return "ACTIVE";
    }

    private LocalDateTime now() {
        return LocalDateTime.now(businessClock);
    }

    private Map<String, Usage> usageByCodes(List<String> codes) {
        if (codes.isEmpty()) return Map.of();
        var result = new HashMap<String, Usage>();
        promotionRepository.summarizeUsageByCodes(codes).forEach(item -> result.put(
                item.getPromoCode().toUpperCase(Locale.ROOT),
                new Usage(item.getTotalUsed() == null ? 0L : item.getTotalUsed(),
                        item.getTotalDiscount() == null ? BigDecimal.ZERO : item.getTotalDiscount())));
        return result;
    }

    private Usage usageForCode(String code) {
        return usageByCodes(List.of(code)).getOrDefault(code, Usage.ZERO);
    }

    private Promotion find(Long id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khuyến mãi id=" + id));
    }

    private Promotion findByCode(String code) {
        return promotionRepository.findByCodeIgnoreCase(normalizeCode(code))
                .orElseThrow(() -> new ResourceNotFoundException("Mã khuyến mãi không tồn tại"));
    }

    private String normalizeCode(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }

    private BusinessException unavailable(String message) {
        return new BusinessException(ErrorCode.BUSINESS_ERROR, message);
    }

    private static <T> Set<T> copy(Set<T> source) {
        return source == null ? new LinkedHashSet<>() : new LinkedHashSet<>(source);
    }

    private record Usage(long totalUsed, BigDecimal totalDiscount) {
        private static final Usage ZERO = new Usage(0L, BigDecimal.ZERO);
    }
}
