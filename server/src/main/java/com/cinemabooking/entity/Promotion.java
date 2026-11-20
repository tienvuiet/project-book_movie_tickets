package com.cinemabooking.entity;

import com.cinemabooking.enums.PromotionDiscountType;
import com.cinemabooking.enums.PromotionScope;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Entity
@Table(name = "promotions")
public class Promotion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, length = 500)
    private String imageUrl;

    @Column(nullable = false)
    private boolean active;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PromotionDiscountType discountType;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal discountValue;

    @Column(precision = 19, scale = 2)
    private BigDecimal maxDiscount;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal minOrderValue = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "promotion_weekdays", joinColumns = @JoinColumn(name = "promotion_id"))
    @Column(name = "weekday", nullable = false)
    @BatchSize(size = 50)
    private Set<Integer> weekdays = new LinkedHashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PromotionScope applyToMovies = PromotionScope.ALL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PromotionScope applyCinemas = PromotionScope.ALL;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "promotion_movies", joinColumns = @JoinColumn(name = "promotion_id"))
    @Column(name = "movie_id", nullable = false)
    @BatchSize(size = 50)
    private Set<Long> movieIds = new LinkedHashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "promotion_cinemas", joinColumns = @JoinColumn(name = "promotion_id"))
    @Column(name = "cinema_id", nullable = false)
    @BatchSize(size = 50)
    private Set<Long> cinemaIds = new LinkedHashSet<>();

    @Column(nullable = false)
    private Long maxUsage;

    @Column(nullable = false)
    private Integer maxPerUser = 1;

    @Column(nullable = false)
    private boolean allowStack;

    @Column(nullable = false)
    private boolean requireLogin = true;

    @Column(length = 120)
    private String createdBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        var now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        normalizeCode();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
        normalizeCode();
    }

    private void normalizeCode() {
        if (code != null) code = code.trim().toUpperCase(Locale.ROOT);
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public PromotionDiscountType getDiscountType() { return discountType; }
    public void setDiscountType(PromotionDiscountType discountType) { this.discountType = discountType; }
    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }
    public BigDecimal getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(BigDecimal maxDiscount) { this.maxDiscount = maxDiscount; }
    public BigDecimal getMinOrderValue() { return minOrderValue; }
    public void setMinOrderValue(BigDecimal minOrderValue) { this.minOrderValue = minOrderValue; }
    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
    public Set<Integer> getWeekdays() { return weekdays; }
    public void setWeekdays(Set<Integer> weekdays) { this.weekdays = weekdays; }
    public PromotionScope getApplyToMovies() { return applyToMovies; }
    public void setApplyToMovies(PromotionScope applyToMovies) { this.applyToMovies = applyToMovies; }
    public PromotionScope getApplyCinemas() { return applyCinemas; }
    public void setApplyCinemas(PromotionScope applyCinemas) { this.applyCinemas = applyCinemas; }
    public Set<Long> getMovieIds() { return movieIds; }
    public void setMovieIds(Set<Long> movieIds) { this.movieIds = movieIds; }
    public Set<Long> getCinemaIds() { return cinemaIds; }
    public void setCinemaIds(Set<Long> cinemaIds) { this.cinemaIds = cinemaIds; }
    public Long getMaxUsage() { return maxUsage; }
    public void setMaxUsage(Long maxUsage) { this.maxUsage = maxUsage; }
    public Integer getMaxPerUser() { return maxPerUser; }
    public void setMaxPerUser(Integer maxPerUser) { this.maxPerUser = maxPerUser; }
    public boolean isAllowStack() { return allowStack; }
    public void setAllowStack(boolean allowStack) { this.allowStack = allowStack; }
    public boolean isRequireLogin() { return requireLogin; }
    public void setRequireLogin(boolean requireLogin) { this.requireLogin = requireLogin; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
