const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

function parseJsonField(val, fallback = []) {
  if (val == null) return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function rowToRoom(row) {
  return {
    id: String(row.id),
    room_number: row.room_number,
    name: row.name,
    room_type: row.room_type,
    price_per_night: parseFloat(row.price_per_night),
    capacity: row.capacity,
    is_available: row.is_available,
    description: row.description,
    amenities: parseJsonField(row.amenities),
    image: row.image,
    images: parseJsonField(row.images),
    highlights: parseJsonField(row.highlights),
    cancellation_policy: row.cancellation_policy,
    check_in_time: row.check_in_time,
    check_out_time: row.check_out_time,
    rating: row.avg_rating != null ? Number(row.avg_rating) : null,
    reviewCount: row.review_count != null ? Number(row.review_count) : 0,
  };
}

// GET /api/rooms – list rooms (optional: ?available=true, ?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD)
// When check_in and check_out are provided, rooms already booked for that range are excluded.
router.get('/', async (req, res) => {
  try {
    const availableOnly = req.query.available === 'true';
    const checkIn = req.query.check_in ? String(req.query.check_in).split('T')[0] : null;
    const checkOut = req.query.check_out ? String(req.query.check_out).split('T')[0] : null;
    const hasDateRange = checkIn && checkOut;

    let query = `
      SELECT id, room_number, name, room_type, price_per_night, capacity, is_available,
             description, amenities, image, images, highlights, cancellation_policy,
             check_in_time, check_out_time,
             (SELECT ROUND(AVG(rating),2) FROM reviews WHERE reviews.room_id = rooms.id) AS avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE reviews.room_id = rooms.id) AS review_count
      FROM rooms
    `;
    const params = [];
    const conditions = [];
    if (availableOnly) {
      conditions.push('is_available = true');
    }
    if (hasDateRange) {
      conditions.push(`id NOT IN (
        SELECT br.room_id FROM booking_rooms br
        INNER JOIN bookings b ON b.id = br.booking_id
        WHERE LOWER(COALESCE(b.status, '')) != 'cancelled'
        AND b.check_in_date < ? AND b.check_out_date > ?
      )`);
      params.push(checkOut, checkIn);
    }
    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY id';

    // Try running the query that includes review aggregates. If the reviews table
    // doesn't exist (e.g. DB not seeded), fall back to a simpler query without
    // the review subselects so the rooms list still returns.
    let result;
    try {
      result = await pool.query(query, params);
    } catch (err) {
      // If any error occurs while running the rich query (e.g. missing reviews table),
      // attempt a simpler fallback query so the rooms list can still be returned.
      try {
        const fallbackQuery = `
          SELECT id, room_number, name, room_type, price_per_night, capacity, is_available,
                 description, amenities, image, images, highlights, cancellation_policy,
                 check_in_time, check_out_time,
                 NULL AS avg_rating,
                 0 AS review_count
          FROM rooms
        `;
        result = await pool.query(fallbackQuery, params);
      } catch (fallbackErr) {
        // If fallback also fails, surface original error
        throw err;
      }
    }
    res.json(result.rows.map(rowToRoom));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:id – single room
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Try the rich select including review aggregates; if reviews table missing
    // fall back to a simpler select that omits those subqueries.
    let result;
    try {
      result = await pool.query(
        `SELECT id, room_number, name, room_type, price_per_night, capacity, is_available,
                description, amenities, image, images, highlights, cancellation_policy,
                check_in_time, check_out_time,
                (SELECT ROUND(AVG(rating),2) FROM reviews WHERE reviews.room_id = rooms.id) AS avg_rating,
                (SELECT COUNT(*) FROM reviews WHERE reviews.room_id = rooms.id) AS review_count
         FROM rooms WHERE id = $1`,
        [id]
      );
    } catch (err) {
      try {
        result = await pool.query(
          `SELECT id, room_number, name, room_type, price_per_night, capacity, is_available,
                  description, amenities, image, images, highlights, cancellation_policy,
                  check_in_time, check_out_time, NULL AS avg_rating, 0 AS review_count
           FROM rooms WHERE id = $1`,
          [id]
        );
      } catch (fallbackErr) {
        throw err;
      }
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(rowToRoom(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:id/reviews - list reviews for a room
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    let rows;
    try {
      rows = await pool.query(
        `SELECT r.id, r.user_id, r.room_id, r.booking_id, r.rating, r.comment, r.created_at, u.name as user_name
         FROM reviews r
         LEFT JOIN users u ON u.id = r.user_id
         WHERE r.room_id = $1
         ORDER BY r.created_at DESC`,
        [id]
      );
    } catch (err) {
      // If the reviews table doesn't exist, return an empty list so UI can still function
      if (String(err.message || '').toLowerCase().includes('reviews') || String(err.message || '').toLowerCase().includes("doesn't exist")) {
        return res.json([]);
      }
      throw err;
    }
    res.json(rows.rows.map((r) => ({ id: String(r.id), user_id: String(r.user_id), room_id: String(r.room_id), booking_id: String(r.booking_id), rating: Number(r.rating), comment: r.comment, created_at: r.created_at, user_name: r.user_name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rooms/:id/reviews - add a review for a room (authenticated)
router.post('/:id/reviews', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const roomId = Number(req.params.id);
    const { booking_id: bookingId, rating, comment } = req.body || {};
    if (!bookingId || !rating) return res.status(400).json({ error: 'booking_id and rating are required' });
    const rNum = Number(rating);
    if (!Number.isInteger(rNum) || rNum < 1 || rNum > 5) return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });

    // Verify booking belongs to user, includes this room, has already completed (check_out_date < today), and is not cancelled
    const eligible = await pool.query(
      `SELECT b.id FROM bookings b
       INNER JOIN booking_rooms br ON br.booking_id = b.id
       WHERE b.id = $1 AND b.user_id = $2 AND br.room_id = $3
         AND b.check_out_date < CURRENT_DATE
         AND LOWER(COALESCE(b.status, '')) != 'cancelled'
         AND NOT EXISTS (SELECT 1 FROM reviews rv WHERE rv.booking_id = b.id)
       LIMIT 1`,
      [bookingId, userId, roomId]
    );
    if (eligible.rows.length === 0) return res.status(403).json({ error: 'Booking is not eligible for review or already reviewed' });

    // Use MySQL-compatible insert flow (pool.query wrapper returns insertId)
    try {
      const ins = await pool.query(
        `INSERT INTO reviews (user_id, room_id, booking_id, rating, comment) VALUES ($1, $2, $3, $4, $5)`,
        [userId, roomId, bookingId, rNum, comment || null]
      );
      const newId = ins.insertId || (ins.rows && ins.rows[0] && ins.rows[0].id);
      // Try to fetch created_at if available
      let createdAt = null;
      if (newId) {
        try {
          const sel = await pool.query('SELECT created_at FROM reviews WHERE id = $1', [newId]);
          if (sel.rows && sel.rows[0]) createdAt = sel.rows[0].created_at;
        } catch (_) {
          // ignore
        }
      }
      res.status(201).json({ id: String(newId), user_id: String(userId), room_id: String(roomId), booking_id: String(bookingId), rating: rNum, comment: comment || null, created_at: createdAt });
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('reviews') || String(err.message || '').toLowerCase().includes("doesn't exist")) {
        return res.status(503).json({ error: 'Reviews feature not available: reviews table is missing. Run database migrations/seed to create reviews table.' });
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rooms – create room (Admin only)
router.post('/', authenticate, requireRole(['ADMIN']), async (req, res) => {
  try {
    const {
      room_number,
      name,
      room_type,
      price_per_night,
      capacity,
      is_available = true,
      description,
      amenities,
      image,
      images,
      highlights,
      cancellation_policy,
      check_in_time,
      check_out_time,
    } = req.body;

    if (!room_number || !room_type || price_per_night == null || !capacity) {
      return res.status(400).json({
        error: 'room_number, room_type, price_per_night and capacity are required',
      });
    }

    await pool.query(
      `INSERT INTO rooms (
        room_number, name, room_type, price_per_night, capacity, is_available,
        description, amenities, image, images, highlights, cancellation_policy,
        check_in_time, check_out_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        room_number,
        name || null,
        room_type,
        parseFloat(price_per_night),
        parseInt(capacity, 10),
        !!is_available,
        description || null,
        JSON.stringify(amenities || []),
        image || null,
        JSON.stringify(images || []),
        JSON.stringify(highlights || []),
        cancellation_policy || null,
        check_in_time || null,
        check_out_time || null,
      ]
    );
    const idRes = await pool.query('SELECT LAST_INSERT_ID() AS id');
    const newId = idRes.rows[0]?.id ?? idRes.insertId;
    const sel = await pool.query(
      'SELECT id, room_number, name, room_type, price_per_night, capacity, is_available, description, amenities, image, images, highlights, cancellation_policy, check_in_time, check_out_time FROM rooms WHERE id = $1',
      [newId]
    );
    res.status(201).json(rowToRoom(sel.rows[0]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({ error: 'Room number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rooms/:id – update room (Admin only)
router.put('/:id', authenticate, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      room_number,
      name,
      room_type,
      price_per_night,
      capacity,
      is_available,
      description,
      amenities,
      image,
      images,
      highlights,
      cancellation_policy,
      check_in_time,
      check_out_time,
    } = req.body;

    const updateResult = await pool.query(
      `UPDATE rooms SET
        room_number = COALESCE($2, room_number),
        name = COALESCE($3, name),
        room_type = COALESCE($4, room_type),
        price_per_night = COALESCE($5, price_per_night),
        capacity = COALESCE($6, capacity),
        is_available = COALESCE($7, is_available),
        description = COALESCE($8, description),
        amenities = COALESCE($9, amenities),
        image = COALESCE($10, image),
        images = COALESCE($11, images),
        highlights = COALESCE($12, highlights),
        cancellation_policy = COALESCE($13, cancellation_policy),
        check_in_time = COALESCE($14, check_in_time),
        check_out_time = COALESCE($15, check_out_time)
      WHERE id = $1`,
      [
        id,
        room_number,
        name,
        room_type,
        price_per_night != null ? parseFloat(price_per_night) : null,
        capacity != null ? parseInt(capacity, 10) : null,
        is_available !== undefined ? !!is_available : null,
        description,
        amenities !== undefined ? JSON.stringify(amenities) : null,
        image,
        images !== undefined ? JSON.stringify(images) : null,
        highlights !== undefined ? JSON.stringify(highlights) : null,
        cancellation_policy,
        check_in_time,
        check_out_time,
      ]
    );
    const sel = await pool.query(
      'SELECT id, room_number, name, room_type, price_per_night, capacity, is_available, description, amenities, image, images, highlights, cancellation_policy, check_in_time, check_out_time FROM rooms WHERE id = $1',
      [id]
    );
    if (sel.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(rowToRoom(sel.rows[0]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({ error: 'Room number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
