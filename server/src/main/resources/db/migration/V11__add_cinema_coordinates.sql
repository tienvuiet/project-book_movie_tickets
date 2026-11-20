ALTER TABLE cinemas
    ADD COLUMN latitude DECIMAL(10, 7) NULL AFTER phone,
    ADD COLUMN longitude DECIMAL(10, 7) NULL AFTER latitude;
