CREATE TABLE roles (id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(50) NOT NULL UNIQUE, description VARCHAR(255));
CREATE TABLE users (id BIGINT PRIMARY KEY AUTO_INCREMENT, email VARCHAR(120) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL, full_name VARCHAR(120) NOT NULL, phone VARCHAR(20), status VARCHAR(20) NOT NULL, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6));
CREATE TABLE user_roles (id BIGINT PRIMARY KEY AUTO_INCREMENT, user_id BIGINT NOT NULL, role_id BIGINT NOT NULL, CONSTRAINT uk_user_role UNIQUE(user_id, role_id), CONSTRAINT fk_user_roles_user FOREIGN KEY(user_id) REFERENCES users(id), CONSTRAINT fk_user_roles_role FOREIGN KEY(role_id) REFERENCES roles(id));
CREATE TABLE genres (id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL UNIQUE, description VARCHAR(500), status VARCHAR(20) NOT NULL);
CREATE TABLE movies (id BIGINT PRIMARY KEY AUTO_INCREMENT, title VARCHAR(200) NOT NULL, description VARCHAR(2000), duration_minutes INT, release_date DATE, poster_url VARCHAR(255), trailer_url VARCHAR(255), status VARCHAR(20) NOT NULL);
CREATE TABLE movie_genres (movie_id BIGINT NOT NULL, genre_id BIGINT NOT NULL, PRIMARY KEY(movie_id, genre_id), CONSTRAINT fk_movie_genres_movie FOREIGN KEY(movie_id) REFERENCES movies(id), CONSTRAINT fk_movie_genres_genre FOREIGN KEY(genre_id) REFERENCES genres(id));
CREATE TABLE cinemas (id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(150) NOT NULL, address VARCHAR(255) NOT NULL, phone VARCHAR(20), status VARCHAR(20) NOT NULL);
CREATE TABLE cinema_rooms (id BIGINT PRIMARY KEY AUTO_INCREMENT, cinema_id BIGINT NOT NULL, name VARCHAR(100) NOT NULL, total_seats INT, active BIT NOT NULL, CONSTRAINT uk_cinema_room UNIQUE(cinema_id, name), CONSTRAINT fk_rooms_cinema FOREIGN KEY(cinema_id) REFERENCES cinemas(id));
CREATE TABLE seats (id BIGINT PRIMARY KEY AUTO_INCREMENT, room_id BIGINT NOT NULL, seat_row VARCHAR(10) NOT NULL, seat_number INT NOT NULL, type VARCHAR(20) NOT NULL, active BIT NOT NULL, CONSTRAINT uk_room_seat UNIQUE(room_id, seat_row, seat_number), CONSTRAINT fk_seats_room FOREIGN KEY(room_id) REFERENCES cinema_rooms(id));
CREATE TABLE showtimes (id BIGINT PRIMARY KEY AUTO_INCREMENT, movie_id BIGINT NOT NULL, room_id BIGINT NOT NULL, start_time DATETIME(6) NOT NULL, end_time DATETIME(6) NOT NULL, base_price DECIMAL(12,2) NOT NULL, status VARCHAR(20) NOT NULL, CONSTRAINT fk_showtimes_movie FOREIGN KEY(movie_id) REFERENCES movies(id), CONSTRAINT fk_showtimes_room FOREIGN KEY(room_id) REFERENCES cinema_rooms(id));
CREATE TABLE bookings (id BIGINT PRIMARY KEY AUTO_INCREMENT, booking_code VARCHAR(40) NOT NULL UNIQUE, user_id BIGINT NOT NULL, showtime_id BIGINT NOT NULL, status VARCHAR(20) NOT NULL, total_amount DECIMAL(12,2) NOT NULL, expires_at DATETIME(6) NOT NULL, checked_in_at DATETIME(6), created_at DATETIME(6) NOT NULL, CONSTRAINT fk_bookings_user FOREIGN KEY(user_id) REFERENCES users(id), CONSTRAINT fk_bookings_showtime FOREIGN KEY(showtime_id) REFERENCES showtimes(id));
CREATE TABLE booking_seats (id BIGINT PRIMARY KEY AUTO_INCREMENT, booking_id BIGINT NOT NULL, seat_id BIGINT NOT NULL, price DECIMAL(12,2) NOT NULL, CONSTRAINT uk_booking_seat UNIQUE(booking_id, seat_id), CONSTRAINT fk_booking_seats_booking FOREIGN KEY(booking_id) REFERENCES bookings(id), CONSTRAINT fk_booking_seats_seat FOREIGN KEY(seat_id) REFERENCES seats(id));
CREATE TABLE payments (id BIGINT PRIMARY KEY AUTO_INCREMENT, booking_id BIGINT NOT NULL, method VARCHAR(30) NOT NULL, status VARCHAR(20) NOT NULL, amount DECIMAL(12,2) NOT NULL, transaction_id VARCHAR(120), created_at DATETIME(6) NOT NULL, paid_at DATETIME(6), CONSTRAINT fk_payments_booking FOREIGN KEY(booking_id) REFERENCES bookings(id));

INSERT INTO roles(name, description) VALUES ('ADMIN', 'System administrator'), ('STAFF', 'Cinema staff'), ('CUSTOMER', 'Customer');
INSERT INTO users(email, password, full_name, phone, status, created_at, updated_at) VALUES ('admin@cinemabooking.com', '$2a$10$QzhgAhQBDw2tP6Axtg3d3ON1XQSiIPtpcown1OMXLCmypdkXAqvxm', 'Default Admin', '0900000000', 'ACTIVE', NOW(6), NOW(6));
INSERT INTO user_roles(user_id, role_id) SELECT u.id, r.id FROM users u JOIN roles r ON r.name='ADMIN' WHERE u.email='admin@cinemabooking.com';
INSERT INTO genres(name, description, status) VALUES ('Action', 'Action movies', 'ACTIVE'), ('Drama', 'Drama movies', 'ACTIVE'), ('Comedy', 'Comedy movies', 'ACTIVE');
INSERT INTO movies(title, description, duration_minutes, release_date, poster_url, trailer_url, status) VALUES ('Cinema Demo', 'Sample movie for development', 120, CURRENT_DATE, NULL, NULL, 'ACTIVE');
INSERT INTO movie_genres(movie_id, genre_id) SELECT m.id, g.id FROM movies m JOIN genres g ON g.name='Action' WHERE m.title='Cinema Demo';
INSERT INTO cinemas(name, address, phone, status) VALUES ('CinemaBooking Central', '123 Main Street', '0280000000', 'ACTIVE');
INSERT INTO cinema_rooms(cinema_id, name, total_seats, active) SELECT id, 'Room 1', 10, 1 FROM cinemas WHERE name='CinemaBooking Central';
INSERT INTO seats(room_id, seat_row, seat_number, type, active) SELECT id, 'A', 1, 'NORMAL', 1 FROM cinema_rooms WHERE name='Room 1';
INSERT INTO seats(room_id, seat_row, seat_number, type, active) SELECT id, 'A', 2, 'VIP', 1 FROM cinema_rooms WHERE name='Room 1';



