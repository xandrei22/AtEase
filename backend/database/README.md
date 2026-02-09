# Hotel Booking System – Database

**This project uses MySQL** (e.g. the `atease` database in phpMyAdmin). The Node backend connects via `server/db.js` using `.env` (see `.env.example`).

## Prerequisites

- [MySQL](https://dev.mysql.com/downloads/) (or MariaDB) installed and running
- A database created (e.g. `atease`)

## Setup

### 1. Create the database (if needed)

In MySQL (or phpMyAdmin):

```sql
CREATE DATABASE atease;
USE atease;
```

### 2. Create tables (MySQL)

From the `backend` folder:

```bash
mysql -u your_user -p atease < database/schema-mysql.sql
```

Or in phpMyAdmin: select the `atease` database → Import → choose `database/schema-mysql.sql`, or open the SQL tab and paste/run the contents of `schema-mysql.sql`.

### 3. Run the seed (required for auth)

```bash
mysql -u your_user -p atease < database/seed-mysql.sql
```

Or run the SQL from `seed-mysql.sql` in phpMyAdmin. This inserts roles (`ADMIN`, `CUSTOMER`) so sign-up and admin login work.

## Tables

| Table          | Purpose                                      |
|----------------|----------------------------------------------|
| `roles`        | User roles (ADMIN, CUSTOMER)                 |
| `users`        | Customer and admin accounts                  |
| `rooms`        | Room types, pricing, availability, amenities  |
| `bookings`     | Reservations (user, dates, total, status)    |
| `booking_rooms`| Links bookings to rooms (many-to-many)       |
| `payments`     | Payment records per booking                  |

## Connection (Node.js)

Set these in `backend/.env` (see `.env.example`):

- `DB_HOST` (default: localhost)
- `DB_PORT` (default: 3306 for MySQL)
- `DB_NAME` (e.g. atease)
- `DB_USER`
- `DB_PASSWORD`

## "Internal Server Error" on Rooms / API

If the frontend shows **Internal Server Error** when loading rooms (or other API calls fail with 500):

1. **Backend not running** – In a terminal, from `backend` run `npm start`. The API must be running on the port Vite proxies to (e.g. 5000).
2. **MySQL not running** – Start MySQL/MariaDB so the backend can connect.
3. **Database or table missing** – Create the `atease` database and the `rooms` table (and other tables). The backend expects a `rooms` table with columns: `id`, `room_number`, `name`, `room_type`, `price_per_night`, `capacity`, `is_available`, `description`, `amenities`, `image`, `images`, `highlights`, `cancellation_policy`, `check_in_time`, `check_out_time`.
4. **Wrong .env** – Check `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_HOST` in `backend/.env`.

Check the **backend terminal** when the error happens; the logged error message (e.g. `ECONNREFUSED`, `Table 'atease.rooms' doesn't exist`) will point to the exact cause.
