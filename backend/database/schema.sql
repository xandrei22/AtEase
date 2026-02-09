-- Hotel Booking System - Database Schema (PostgreSQL)
-- Run this file to create all tables. Requires an existing database.

-- =============================================================================
-- ROLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role_id    INTEGER NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);

-- =============================================================================
-- ROOMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS rooms (
  id              SERIAL PRIMARY KEY,
  room_number     VARCHAR(20) NOT NULL UNIQUE,
  name            VARCHAR(255),
  room_type       VARCHAR(50) NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL CHECK (price_per_night >= 0),
  capacity        INTEGER NOT NULL CHECK (capacity > 0),
  is_available    BOOLEAN NOT NULL DEFAULT true,
  description     TEXT,
  amenities       JSONB DEFAULT '[]',
  image           VARCHAR(500),
  images          JSONB DEFAULT '[]',
  highlights      JSONB DEFAULT '[]',
  cancellation_policy TEXT,
  check_in_time   VARCHAR(20),
  check_out_time  VARCHAR(20),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_room_type ON rooms(room_type);
CREATE INDEX idx_rooms_is_available ON rooms(is_available);
CREATE INDEX idx_rooms_price_per_night ON rooms(price_per_night);

-- =============================================================================
-- BOOKINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  check_in_date  DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_price    DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  status         VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- =============================================================================
-- BOOKING_ROOMS (junction: one booking can include multiple rooms)
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_rooms (
  id         SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  room_id    INTEGER NOT NULL REFERENCES rooms(id),
  UNIQUE(booking_id, room_id)
);

CREATE INDEX idx_booking_rooms_booking_id ON booking_rooms(booking_id);
CREATE INDEX idx_booking_rooms_room_id ON booking_rooms(room_id);

-- =============================================================================
-- PAYMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id             SERIAL PRIMARY KEY,
  booking_id     INTEGER NOT NULL REFERENCES bookings(id),
  amount         DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);

-- =============================================================================
-- OPTIONAL: Trigger to update rooms.updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rooms_updated_at ON rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
