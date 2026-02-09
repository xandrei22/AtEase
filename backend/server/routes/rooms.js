const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

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
    amenities: row.amenities || [],
    image: row.image,
    images: row.images || [],
    highlights: row.highlights || [],
    cancellation_policy: row.cancellation_policy,
    check_in_time: row.check_in_time,
    check_out_time: row.check_out_time,
  };
}

// GET /api/rooms – list rooms (optional: ?available=true to filter)
router.get('/', async (req, res) => {
  try {
    const availableOnly = req.query.available === 'true';
    let query = `
      SELECT id, room_number, name, room_type, price_per_night, capacity, is_available,
             description, amenities, image, images, highlights, cancellation_policy,
             check_in_time, check_out_time
      FROM rooms
    `;
    const params = [];
    if (availableOnly) {
      query += ' WHERE is_available = true';
    }
    query += ' ORDER BY id';

    const result = await pool.query(query, params);
    res.json(result.rows.map(rowToRoom));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:id – single room
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, room_number, name, room_type, price_per_night, capacity, is_available,
              description, amenities, image, images, highlights, cancellation_policy,
              check_in_time, check_out_time
       FROM rooms WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(rowToRoom(result.rows[0]));
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
