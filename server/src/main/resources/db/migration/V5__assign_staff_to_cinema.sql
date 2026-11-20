ALTER TABLE users ADD COLUMN cinema_id BIGINT NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_cinema FOREIGN KEY (cinema_id) REFERENCES cinemas(id);
CREATE INDEX idx_users_cinema_id ON users(cinema_id);
