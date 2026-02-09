-- AtEase – MySQL seed: roles (required for sign-up and login)
-- Run in phpMyAdmin: open database "atease" → SQL tab → paste and run.
-- Or from terminal: mysql -u root -p atease < database/seed-mysql.sql

-- ROLES (run once so that sign-up and admin login work)
INSERT INTO roles (name) SELECT 'ADMIN' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN');
INSERT INTO roles (name) SELECT 'CUSTOMER' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CUSTOMER');

-- SAMPLE ROOMS (optional – only if your rooms table has these columns)
-- INSERT INTO rooms (room_number, name, room_type, price_per_night, capacity, is_available, description, amenities, image, highlights, cancellation_policy, check_in_time, check_out_time)
-- VALUES
--   ('101', 'Ocean View Suite', 'Suite', 249.00, 4, 1, 'Spacious suite with ocean views.', '[\"Wi-Fi\",\"AC\",\"TV\",\"Pool\"]', 'https://images.unsplash.com/photo-1582719478250-c89c6d9dba20?w=800', '[\"Balcony\",\"King bed\"]', 'Free cancellation 48h before check-in.', '3:00 PM', '11:00 AM'),
--   ('102', 'Deluxe Double', 'Deluxe', 159.00, 2, 1, 'Comfortable double room.', '[\"Wi-Fi\",\"AC\",\"TV\"]', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', '[]', 'Free cancellation 24h before.', '3:00 PM', '11:00 AM')
-- ON DUPLICATE KEY UPDATE name = VALUES(name);
