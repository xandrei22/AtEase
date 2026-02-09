-- Hotel Booking System - MySQL Schema
-- Run: mysql -u your_user -p atease < database/schema-mysql.sql
-- Or run in phpMyAdmin (SQL tab) with database `atease` selected.

-- =============================================================================
-- ROLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role_id    INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);

-- =============================================================================
-- ROOMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS rooms (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  room_number          VARCHAR(20) NOT NULL UNIQUE,
  name                 VARCHAR(255),
  room_type            VARCHAR(50) NOT NULL,
  price_per_night      DECIMAL(10, 2) NOT NULL,
  capacity             INT NOT NULL,
  is_available         TINYINT(1) NOT NULL DEFAULT 1,
  description          TEXT,
  amenities            JSON DEFAULT ('[]'),
  image                VARCHAR(500),
  images               JSON DEFAULT ('[]'),
  highlights           JSON DEFAULT ('[]'),
  cancellation_policy  TEXT,
  check_in_time        VARCHAR(20),
  check_out_time       VARCHAR(20),
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_rooms_room_type ON rooms(room_type);
CREATE INDEX idx_rooms_is_available ON rooms(is_available);
CREATE INDEX idx_rooms_price_per_night ON rooms(price_per_night);

-- =============================================================================
-- BOOKINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  check_in_date  DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_price    DECIMAL(10, 2) NOT NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- =============================================================================
-- BOOKING_ROOMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_rooms (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  room_id    INT NOT NULL,
  UNIQUE KEY (booking_id, room_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE INDEX idx_booking_rooms_booking_id ON booking_rooms(booking_id);
CREATE INDEX idx_booking_rooms_room_id ON booking_rooms(room_id);

-- =============================================================================
-- PAYMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  booking_id     INT NOT NULL,
  amount         DECIMAL(10, 2) NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
