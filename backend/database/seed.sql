-- Hotel Booking System - Seed Data
-- Run after schema.sql. Inserts default roles and optional sample data.

-- =============================================================================
-- ROLES (required for auth)
-- =============================================================================
INSERT INTO roles (name) VALUES ('ADMIN'), ('CUSTOMER')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- SAMPLE ROOMS (optional - matches frontend mock data structure)
-- =============================================================================
INSERT INTO rooms (
  room_number, name, room_type, price_per_night, capacity, is_available,
  description, amenities, image, highlights, cancellation_policy, check_in_time, check_out_time
) VALUES
  ('101', 'Ocean View Suite', 'Suite', 249.00, 4, true,
   'Spacious suite with stunning ocean views. Features a king bed, sitting area, and private balcony.',
   '["Wi-Fi", "AC", "TV", "Pool", "Gym", "Parking", "Mini Bar", "Ocean View"]',
   'https://images.unsplash.com/photo-1582719478250-c89c6d9dba20?w=800',
   '["Private balcony", "King bed", "Sitting area", "24/7 room service", "Free breakfast", "Spa access"]',
   'Free cancellation up to 48 hours before check-in. Partial refund within 48 hours.',
   '3:00 PM', '11:00 AM'),
  ('102', 'Deluxe Double Room', 'Deluxe', 159.00, 2, true,
   'Comfortable double room with modern amenities. Ideal for business or leisure travelers.',
   '["Wi-Fi", "AC", "TV", "Pool", "Gym", "Parking"]',
   'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
   '["Queen bed", "Work desk", "City view", "Coffee maker"]',
   'Free cancellation up to 24 hours before check-in.',
   '3:00 PM', '11:00 AM'),
  ('201', 'Standard Single', 'Single', 99.00, 1, true,
   'Cozy single room perfect for solo travelers. All essential amenities included.',
   '["Wi-Fi", "AC", "TV"]',
   'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
   '["Single bed", "Work desk", "Free Wi-Fi"]',
   'Non-refundable. No changes allowed.',
   '2:00 PM', '10:00 AM'),
  ('202', 'Family Suite', 'Suite', 329.00, 6, true,
   'Spacious family suite with separate living area and kitchenette. Perfect for families.',
   '["Wi-Fi", "AC", "TV", "Pool", "Gym", "Parking", "Kitchenette", "Balcony"]',
   'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
   '["Two bedrooms", "Kitchenette", "Living room", "Pool view", "Kids club access"]',
   'Free cancellation up to 7 days before check-in.',
   '4:00 PM', '11:00 AM'),
  ('103', 'Executive Double', 'Double', 189.00, 2, true,
   'Executive room with premium amenities and city or partial ocean view.',
   '["Wi-Fi", "AC", "TV", "Pool", "Gym", "Parking", "Mini Bar"]',
   'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800',
   '["King bed", "Mini bar", "Lounge access", "Late checkout option"]',
   'Free cancellation up to 48 hours before check-in.',
   '3:00 PM', '11:00 AM')
ON CONFLICT (room_number) DO NOTHING;

-- =============================================================================
-- SAMPLE ADMIN USER (optional - password is 'admin123', hash with bcrypt in app)
-- Only use in development. Remove or change in production.
-- =============================================================================
-- INSERT INTO users (name, email, password, role_id)
-- SELECT 'Admin User', 'admin@hotel.com', '$2a$10$...', id FROM roles WHERE name = 'ADMIN' LIMIT 1;
