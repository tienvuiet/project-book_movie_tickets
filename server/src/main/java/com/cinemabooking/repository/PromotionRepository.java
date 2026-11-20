package com.cinemabooking.repository;

import com.cinemabooking.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long>, JpaSpecificationExecutor<Promotion> {
    interface CodeUsage {
        String getPromoCode();
        Long getTotalUsed();
        BigDecimal getTotalDiscount();
    }

    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
    Optional<Promotion> findByCodeIgnoreCase(String code);

    List<Promotion> findAllByActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByIdDesc(
            LocalDateTime startedAt, LocalDateTime endedAt);

    @Query(value = "select promo_code as promoCode, count(*) as totalUsed, " +
            "coalesce(sum(discount_amount), 0) as totalDiscount from bookings " +
            "where status in ('PAID', 'COMPLETED') and promo_code in (:codes) group by promo_code",
            nativeQuery = true)
    List<CodeUsage> summarizeUsageByCodes(@Param("codes") Collection<String> codes);

    @Query(value = "select count(*) from bookings where upper(promo_code) = upper(:code) " +
            "and user_id = :userId and status in ('PAID', 'COMPLETED')", nativeQuery = true)
    long countSuccessfulUsageByUser(@Param("code") String code, @Param("userId") Long userId);
}
