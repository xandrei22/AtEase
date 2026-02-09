const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// POST /api/bookings – create booking (authenticated; customer creates own)
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { check_in_date, check_out_date, room_ids } = req.body;
    const userId = req.user.id;

    if (!check_in_date || !check_out_date || !room_ids || !Array.isArray(room_ids) || room_ids.length === 0) {
      return res.status(400).json({
        error: 'check_in_date, check_out_date and room_ids (array) are required',
      });
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'check_out_date must be after check_in_date' });
    }

    await client.beginTransaction();

    let totalPrice = 0;
    for (const roomId of room_ids) {
      const roomResult = await client.query(
        'SELECT id, price_per_night, is_available FROM rooms WHERE id = $1',
        [roomId]
      );
      if (roomResult.rows.length === 0) {
        await client.rollback();
        return res.status(400).json({ error: `Room ${roomId} not found` });
      }
      const room = roomResult.rows[0];
      if (!room.is_available) {
        await client.rollback();
        return res.status(400).json({ error: `Room ${roomId} is not available` });
      }
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      totalPrice += parseFloat(room.price_per_night) * nights;
    }

    await client.query(
      `INSERT INTO bookings (user_id, check_in_date, check_out_date, total_price, status)
       VALUES ($1, $2, $3, $4, 'confirmed')`,
      [userId, check_in_date, check_out_date, totalPrice.toFixed(2)]
    );
    const idRes = await client.query('SELECT LAST_INSERT_ID() AS id');
    const bookingId = idRes.rows[0]?.id ?? idRes.insertId;
    const bookRes = await client.query(
      'SELECT id, user_id, check_in_date, check_out_date, total_price, status, created_at FROM bookings WHERE id = $1',
      [bookingId]
    );
    const booking = bookRes.rows[0];

    for (const roomId of room_ids) {
      await client.query(
        'INSERT INTO booking_rooms (booking_id, room_id) VALUES ($1, $2)',
        [booking.id, roomId]
      );
    }

    await client.commit();

    res.status(201).json({
      id: booking.id,
      user_id: booking.user_id,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      total_price: parseFloat(booking.total_price),
      status: booking.status,
      created_at: booking.created_at,
      room_ids,
    });
  } catch (err) {
    await client.rollback().catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/bookings – all bookings (Admin only)
router.get('/', authenticate, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.user_id, b.check_in_date, b.check_out_date, b.total_price, b.status, b.created_at,
              u.name AS user_name, u.email AS user_email
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    );
    const bookings = result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      check_in_date: row.check_in_date,
      check_out_date: row.check_out_date,
      total_price: parseFloat(row.total_price),
      status: row.status,
      created_at: row.created_at,
    }));
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/user/:id – bookings for a user (own id or Admin)
router.get('/user/:id', authenticate, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (req.user.role !== 'ADMIN' && req.user.id !== targetUserId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await pool.query(
      `SELECT b.id, b.user_id, b.check_in_date, b.check_out_date, b.total_price, b.status, b.created_at
       FROM bookings b
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [targetUserId]
    );

    const bookings = await Promise.all(
      result.rows.map(async (row) => {
        const roomsResult = await pool.query(
          'SELECT room_id FROM booking_rooms WHERE booking_id = $1',
          [row.id]
        );
        return {
          id: row.id,
          user_id: row.user_id,
          check_in_date: row.check_in_date,
          check_out_date: row.check_out_date,
          total_price: parseFloat(row.total_price),
          status: row.status,
          created_at: row.created_at,
          room_ids: roomsResult.rows.map((r) => r.room_id),
        };
      })
    );
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
