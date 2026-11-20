CREATE TABLE promotions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    description VARCHAR(2000),
    image_url VARCHAR(500) NOT NULL,
    active BIT NOT NULL,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(19,2) NOT NULL,
    max_discount DECIMAL(19,2),
    min_order_value DECIMAL(19,2) NOT NULL DEFAULT 0,
    start_date DATETIME(6) NOT NULL,
    end_date DATETIME(6) NOT NULL,
    apply_to_movies VARCHAR(20) NOT NULL DEFAULT 'ALL',
    apply_cinemas VARCHAR(20) NOT NULL DEFAULT 'ALL',
    max_usage BIGINT NOT NULL,
    max_per_user INT NOT NULL DEFAULT 1,
    allow_stack BIT NOT NULL DEFAULT 0,
    require_login BIT NOT NULL DEFAULT 1,
    created_by VARCHAR(120),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
);

CREATE INDEX idx_promotions_active_dates ON promotions(active, start_date, end_date);
CREATE INDEX idx_promotions_discount_type ON promotions(discount_type);
CREATE INDEX idx_bookings_promo_user_status ON bookings(promo_code, user_id, status);

CREATE TABLE promotion_weekdays (
    promotion_id BIGINT NOT NULL,
    weekday INT NOT NULL,
    PRIMARY KEY (promotion_id, weekday),
    CONSTRAINT fk_promotion_weekdays_promotion FOREIGN KEY (promotion_id)
        REFERENCES promotions(id) ON DELETE CASCADE
);

CREATE TABLE promotion_movies (
    promotion_id BIGINT NOT NULL,
    movie_id BIGINT NOT NULL,
    PRIMARY KEY (promotion_id, movie_id),
    CONSTRAINT fk_promotion_movies_promotion FOREIGN KEY (promotion_id)
        REFERENCES promotions(id) ON DELETE CASCADE
);

CREATE TABLE promotion_cinemas (
    promotion_id BIGINT NOT NULL,
    cinema_id BIGINT NOT NULL,
    PRIMARY KEY (promotion_id, cinema_id),
    CONSTRAINT fk_promotion_cinemas_promotion FOREIGN KEY (promotion_id)
        REFERENCES promotions(id) ON DELETE CASCADE
);

INSERT INTO promotions (
    code, name, description, image_url, active, discount_type, discount_value,
    max_discount, min_order_value, start_date, end_date, apply_to_movies,
    apply_cinemas, max_usage, max_per_user, allow_stack, require_login,
    created_by, created_at, updated_at
) VALUES (
    'TIEN', 'Ưu đãi mặc định 40.000đ', 'Mã khuyến mãi tương thích dữ liệu hiện tại.',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    1, 'FIXED', 40000, NULL, 0, '2020-01-01 00:00:00', '2100-12-31 23:59:59',
    'ALL', 'ALL', 999999999, 999999999, 0, 1, 'System', NOW(6), NOW(6)
);
