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

    const checkInDate = check_in_date.split('T')[0];
    const checkOutDate = check_out_date.split('T')[0];

    // Lock the rooms involved to avoid race conditions where two concurrent
    // bookings pass the availability check at the same time. This serializes
    // booking creation for the same rooms.
    const roomPlaceholders = room_ids.map((_, i) => `$${i + 1}`).join(',');
    await client.query(`SELECT id FROM rooms WHERE id IN (${roomPlaceholders}) FOR UPDATE`, room_ids);

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
      const overlapResult = await client.query(
        `SELECT 1 FROM booking_rooms br
         INNER JOIN bookings b ON b.id = br.booking_id
         WHERE br.room_id = $1 AND LOWER(COALESCE(b.status, '')) != 'cancelled'
         AND b.check_in_date < $2 AND b.check_out_date > $3
         LIMIT 1`,
        [roomId, checkOutDate, checkInDate]
      );
      if (overlapResult.rows && overlapResult.rows.length > 0) {
        await client.rollback();
        return res.status(400).json({
          error: `Room ${roomId} is already booked for the selected dates. Please choose different dates or another room.`,
        });
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
              u.name AS user_name, u.email AS user_email,
              COALESCE(paid.total_paid, 0) AS total_paid,
              COALESCE(ref.total_refunded, 0) AS total_refunded,
              COALESCE(paid.total_paid, 0) - COALESCE(ref.total_refunded, 0) AS net_paid
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN (
         SELECT booking_id, SUM(amount) AS total_paid FROM payments WHERE payment_status = 'completed' GROUP BY booking_id
       ) paid ON paid.booking_id = b.id
       LEFT JOIN (
         SELECT booking_id, SUM(amount) AS total_refunded FROM payments WHERE payment_status = 'refunded' GROUP BY booking_id
       ) ref ON ref.booking_id = b.id
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
      total_paid: parseFloat(row.total_paid || 0),
      total_refunded: parseFloat(row.total_refunded || 0),
      net_paid: parseFloat(row.net_paid || 0),
      status: row.status,
      created_at: row.created_at,
      room_name: null,
    }));

    if (bookings.length > 0) {
      const ids = bookings.map((b) => b.id);
      const placeholders = ids.map(() => '?').join(',');
      const roomResult = await pool.query(
        `SELECT br.booking_id, COALESCE(r.name, r.room_number) AS room_display
         FROM booking_rooms br
         INNER JOIN rooms r ON r.id = br.room_id
         WHERE br.booking_id IN (${placeholders})`,
        ids
      );
      const roomByBooking = {};
      for (const r of roomResult.rows || []) {
        const bid = r.booking_id;
        if (roomByBooking[bid] == null) roomByBooking[bid] = r.room_display ?? r.room_name ?? null;
      }
      bookings.forEach((b) => {
        b.room_name = roomByBooking[b.id] || null;
      });
    }

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
        `SELECT b.id, b.user_id, b.check_in_date, b.check_out_date, b.total_price, b.status, b.created_at,
                COALESCE(paid.total_paid,0) AS total_paid,
                COALESCE(ref.total_refunded,0) AS total_refunded,
                COALESCE(paid.total_paid,0) - COALESCE(ref.total_refunded,0) AS net_paid,
                (
                  SELECT request_type FROM booking_requests br
                  WHERE br.booking_id = b.id AND br.requested_by = b.user_id AND LOWER(COALESCE(br.status,'')) = 'pending'
                  ORDER BY br.created_at DESC LIMIT 1
                ) AS pending_request_type
         FROM bookings b
         LEFT JOIN (
           SELECT booking_id, SUM(amount) AS total_paid FROM payments WHERE payment_status = 'completed' GROUP BY booking_id
         ) paid ON paid.booking_id = b.id
         LEFT JOIN (
           SELECT booking_id, SUM(amount) AS total_refunded FROM payments WHERE payment_status = 'refunded' GROUP BY booking_id
         ) ref ON ref.booking_id = b.id
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
          total_paid: parseFloat(row.total_paid || 0),
          total_refunded: parseFloat(row.total_refunded || 0),
          net_paid: parseFloat(row.net_paid || 0),
          // if user has a pending request for this booking, reflect it in the status
          status: (row.pending_request_type === 'cancel') ? 'cancellation_requested' : (row.pending_request_type === 'modify') ? 'modification_requested' : row.status,
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

// PATCH /api/bookings/:id/cancel - cancel a booking (customer or admin)
router.patch('/:id/cancel', authenticate, async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const client = await pool.connect();
  try {
    await client.beginTransaction();

    const bRes = await client.query('SELECT id, user_id, status FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    if (bRes.rows.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bRes.rows[0];
    if (booking.status === 'cancelled') {
      await client.rollback();
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    const { requestOnly, reason, refund_amount } = req.body || {};
    // If caller is not admin, create a cancellation request instead of performing it immediately
    if (req.user.role !== 'ADMIN') {
      if (req.user.id !== booking.user_id) {
        await client.rollback();
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      // Prevent duplicate pending cancellation requests for the same booking by the same user
      const existingCancel = await client.query(
        `SELECT id FROM booking_requests WHERE booking_id = $1 AND request_type = $2 AND status = $3 AND requested_by = $4 LIMIT 1`,
        [bookingId, 'cancel', 'pending', req.user.id]
      );
      if (existingCancel.rows && existingCancel.rows.length > 0) {
        await client.rollback();
        return res.json({ message: 'Cancellation already requested', request_id: existingCancel.rows[0].id });
      }

      await client.query(
        `INSERT INTO booking_requests (booking_id, request_type, payload, status, requested_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, 'cancel', JSON.stringify({ reason: reason || null }), 'pending', req.user.id]
      );
      await client.commit();
      return res.json({ message: 'Cancellation requested' });
    }

    // ADMIN path: perform cancellation and optionally process refund_amount
    if (refund_amount != null) {
      const sumResult = await client.query('SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE booking_id = $1 AND payment_status = $2', [bookingId, 'completed']);
      const totalPaid = parseFloat(sumResult.rows[0]?.total_paid ?? 0);
      const refundAmount = parseFloat(refund_amount);
      if (refundAmount > totalPaid) {
        await client.rollback();
        return res.status(400).json({ error: 'Refund amount cannot exceed total paid' });
      }
      if (refundAmount > 0) {
        await client.query('INSERT INTO payments (booking_id, amount, payment_status, payment_method) VALUES ($1, $2, $3, $4)', [bookingId, refundAmount, 'refunded', 'refund']);
      }
    }

    await client.query('UPDATE bookings SET status = $1 WHERE id = $2', ['cancelled', bookingId]);
    // Remove room associations so the rooms/dates are clearly available again
    await client.query('DELETE FROM booking_rooms WHERE booking_id = $1', [bookingId]);
    await client.commit();
    res.json({ id: bookingId, status: 'cancelled' });
  } catch (err) {
    await client.rollback().catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/bookings/:id - modify a booking (customer or admin)
// Body may include: check_in_date, check_out_date, room_ids (array)
router.put('/:id', authenticate, async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const client = await pool.connect();
  try {
    const { check_in_date: reqCheckIn, check_out_date: reqCheckOut, room_ids, requestOnly } = req.body;
    const isRequestOnly = !!requestOnly;
    if (!room_ids || !Array.isArray(room_ids) || room_ids.length === 0) {
      return res.status(400).json({ error: 'room_ids (array) are required' });
    }
    // For non-request-only modifications, dates are required. For customer requestOnly we allow omitting dates (will use existing booking dates).
    if (!isRequestOnly) {
      if (!reqCheckIn || !reqCheckOut) {
        return res.status(400).json({ error: 'check_in_date and check_out_date are required for direct modifications' });
      }
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'check_out_date must be after check_in_date' });
    }

    await client.beginTransaction();

    // Lock booking row
    const existingRes = await client.query('SELECT id, user_id, check_in_date, check_out_date, total_price, status FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    if (existingRes.rows.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }
    const existing = existingRes.rows[0];
    if (req.user.role !== 'ADMIN' && req.user.id !== existing.user_id) {
      await client.rollback();
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    if (existing.status === 'cancelled') {
      await client.rollback();
      return res.status(400).json({ error: 'Cannot modify a cancelled booking' });
    }

    // If customer requests modification, create a request record for admin approval
    if (req.user.role !== 'ADMIN' && isRequestOnly) {
      // Prevent duplicate pending modification requests for the same booking by the same user
      const existingModify = await client.query(
        `SELECT id FROM booking_requests WHERE booking_id = $1 AND request_type = $2 AND status = $3 AND requested_by = $4 LIMIT 1`,
        [bookingId, 'modify', 'pending', req.user.id]
      );
      if (existingModify.rows && existingModify.rows.length > 0) {
        await client.rollback();
        return res.json({ message: 'Modification already requested', request_id: existingModify.rows[0].id });
      }

      // Use provided dates or fall back to existing booking dates for request-only changes
      const useCheckIn = reqCheckIn || existing.check_in_date;
      const useCheckOut = reqCheckOut || existing.check_out_date;
      const modifyPayload = { check_in_date: useCheckIn, check_out_date: useCheckOut, room_ids };
      if (req.body && req.body.guests != null) modifyPayload.guests = Number(req.body.guests);
      await client.query(
        `INSERT INTO booking_requests (booking_id, request_type, payload, status, requested_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, 'modify', JSON.stringify(modifyPayload), 'pending', req.user.id]
      );
      await client.commit();
      return res.json({ message: 'Modification requested' });
    }

    const checkInDate = check_in_date.split('T')[0];
    const checkOutDate = check_out_date.split('T')[0];

    // Lock the rooms involved to avoid race conditions when modifying a booking
    const roomPlaceholders = room_ids.map((_, i) => `$${i + 1}`).join(',');
    await client.query(`SELECT id FROM rooms WHERE id IN (${roomPlaceholders}) FOR UPDATE`, room_ids);

    // Calculate new total price and verify availability (excluding this booking)
    let newTotal = 0;
    for (const roomId of room_ids) {
      const roomResult = await client.query('SELECT id, price_per_night FROM rooms WHERE id = $1', [roomId]);
      if (roomResult.rows.length === 0) {
        await client.rollback();
        return res.status(400).json({ error: `Room ${roomId} not found` });
      }
      const room = roomResult.rows[0];

      const overlapResult = await client.query(
        `SELECT 1 FROM booking_rooms br
         INNER JOIN bookings b ON b.id = br.booking_id
         WHERE br.room_id = $1 AND b.id != $2 AND LOWER(COALESCE(b.status, '')) != 'cancelled'
         AND b.check_in_date < $3 AND b.check_out_date > $4
         LIMIT 1`,
        [roomId, bookingId, checkOutDate, checkInDate]
      );
      if (overlapResult.rows && overlapResult.rows.length > 0) {
        await client.rollback();
        return res.status(400).json({ error: `Room ${roomId} is already booked for the selected dates.` });
      }
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      newTotal += parseFloat(room.price_per_night) * nights;
    }

    const oldTotal = parseFloat(existing.total_price || 0);
    const delta = parseFloat((newTotal - oldTotal).toFixed(2));

    // Update booking
    await client.query(
      'UPDATE bookings SET check_in_date = $1, check_out_date = $2, total_price = $3 WHERE id = $4',
      [check_in_date, check_out_date, newTotal.toFixed(2), bookingId]
    );

    // Replace booking_rooms entries
    await client.query('DELETE FROM booking_rooms WHERE booking_id = $1', [bookingId]);
    for (const roomId of room_ids) {
      await client.query('INSERT INTO booking_rooms (booking_id, room_id) VALUES ($1, $2)', [bookingId, roomId]);
    }

    await client.commit();

    // Return delta so frontend/payment flow can charge or refund accordingly
    res.json({ id: bookingId, new_total: parseFloat(newTotal.toFixed(2)), delta });
  } catch (err) {
    await client.rollback().catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;

// -----------------------------------------------------------------------------
// Admin endpoints to approve/reject customer requests
// -----------------------------------------------------------------------------
// PATCH /api/bookings/requests/:id/approve
router.patch('/requests/:id/approve', authenticate, requireRole(['ADMIN']), async (req, res) => {
  const reqId = parseInt(req.params.id, 10);
  const { refund_amount } = req.body || {};
  const client = await pool.connect();
  try {
    await client.beginTransaction();
    const rRes = await client.query('SELECT id, booking_id, request_type, payload, status FROM booking_requests WHERE id = $1 FOR UPDATE', [reqId]);
    if (rRes.rows.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }
    const request = rRes.rows[0];
    if ((request.status || '').toLowerCase() !== 'pending') {
      await client.rollback();
      return res.status(400).json({ error: 'Request already processed' });
    }

    const bookingId = request.booking_id;
    const bRes = await client.query('SELECT id, user_id, check_in_date, check_out_date, total_price, status FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    if (bRes.rows.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bRes.rows[0];

    if (request.request_type === 'modify') {
      const payload = request.payload || {};
      const { check_in_date, check_out_date, room_ids } = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (!check_in_date || !check_out_date || !Array.isArray(room_ids) || room_ids.length === 0) {
        await client.rollback();
        return res.status(400).json({ error: 'Invalid modify payload' });
      }
      const checkIn = new Date(check_in_date);
      const checkOut = new Date(check_out_date);
      if (checkOut <= checkIn) {
        await client.rollback();
        return res.status(400).json({ error: 'check_out_date must be after check_in_date' });
      }

      const checkInDate = check_in_date.split('T')[0];
      const checkOutDate = check_out_date.split('T')[0];

      // Lock the rooms involved to prevent races when approving modify requests
      const placeholders = room_ids.map((_, i) => `$${i + 1}`).join(',');
      await client.query(`SELECT id FROM rooms WHERE id IN (${placeholders}) FOR UPDATE`, room_ids);
      let newTotal = 0;
      for (const roomId of room_ids) {
        const roomResult = await client.query('SELECT id, price_per_night FROM rooms WHERE id = $1', [roomId]);
        if (roomResult.rows.length === 0) {
          await client.rollback();
          return res.status(400).json({ error: `Room ${roomId} not found` });
        }
        const overlapResult = await client.query(
          `SELECT 1 FROM booking_rooms br INNER JOIN bookings b ON b.id = br.booking_id
           WHERE br.room_id = $1 AND b.id != $2 AND LOWER(COALESCE(b.status, '')) != 'cancelled'
           AND b.check_in_date < $3 AND b.check_out_date > $4 LIMIT 1`,
          [roomId, bookingId, checkOutDate, checkInDate]
        );
        if (overlapResult.rows && overlapResult.rows.length > 0) {
          await client.rollback();
          return res.status(400).json({ error: `Room ${roomId} is already booked for the selected dates.` });
        }
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        newTotal += parseFloat(roomResult.rows[0].price_per_night) * nights;
      }

      const oldTotal = parseFloat(booking.total_price || 0);
      const delta = parseFloat((newTotal - oldTotal).toFixed(2));

      await client.query('UPDATE bookings SET check_in_date = $1, check_out_date = $2, total_price = $3 WHERE id = $4', [check_in_date, check_out_date, newTotal.toFixed(2), bookingId]);
      await client.query('DELETE FROM booking_rooms WHERE booking_id = $1', [bookingId]);
      for (const roomId of room_ids) await client.query('INSERT INTO booking_rooms (booking_id, room_id) VALUES ($1, $2)', [bookingId, roomId]);

      await client.query('UPDATE booking_requests SET status = $1 WHERE id = $2', ['approved', reqId]);
      await client.commit();
      return res.json({ id: bookingId, new_total: parseFloat(newTotal.toFixed(2)), delta });
    }

    if (request.request_type === 'cancel') {
      // admin approves cancellation; optionally process refund amount passed in body
      if (booking.status === 'cancelled') {
        await client.rollback();
        return res.status(400).json({ error: 'Booking already cancelled' });
      }
      if (refund_amount != null) {
        const sumResult = await client.query('SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE booking_id = $1 AND payment_status = $2', [bookingId, 'completed']);
        const totalPaid = parseFloat(sumResult.rows[0]?.total_paid ?? 0);
        const refundAmount = parseFloat(refund_amount);
        if (refundAmount > totalPaid) {
          await client.rollback();
          return res.status(400).json({ error: 'Refund amount cannot exceed total paid' });
        }
        if (refundAmount > 0) {
          await client.query('INSERT INTO payments (booking_id, amount, payment_status, payment_method) VALUES ($1, $2, $3, $4)', [bookingId, refundAmount, 'refunded', 'refund']);
        }
      }
      await client.query('UPDATE bookings SET status = $1 WHERE id = $2', ['cancelled', bookingId]);
      // Remove room associations so the rooms/dates are clearly available again
      await client.query('DELETE FROM booking_rooms WHERE booking_id = $1', [bookingId]);
      await client.query('UPDATE booking_requests SET status = $1 WHERE id = $2', ['approved', reqId]);
      await client.commit();
      return res.json({ id: bookingId, status: 'cancelled' });
    }

    await client.rollback();
    res.status(400).json({ error: 'Unsupported request type' });
  } catch (err) {
    await client.rollback().catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/bookings/requests/:id/reject
router.patch('/requests/:id/reject', authenticate, requireRole(['ADMIN']), async (req, res) => {
  const reqId = parseInt(req.params.id, 10);
  try {
    // MariaDB/MySQL do not support PostgreSQL-style RETURNING; perform update then select
    await pool.query('UPDATE booking_requests SET status = $1 WHERE id = $2', ['rejected', reqId]);
    const sel = await pool.query('SELECT id, booking_id, status FROM booking_requests WHERE id = $1', [reqId]);
    if (!sel.rows || sel.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(sel.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/requests - list pending requests (admin)
router.get('/requests', authenticate, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT br.id, br.booking_id, br.request_type, br.payload, br.status, br.requested_by, br.created_at,
              u.name AS requested_by_name, b.total_price
       FROM booking_requests br
       JOIN users u ON u.id = br.requested_by
       LEFT JOIN bookings b ON b.id = br.booking_id
       ORDER BY br.created_at DESC`
    );
    res.json(result.rows.map((r) => ({ id: r.id, booking_id: r.booking_id, request_type: r.request_type, payload: r.payload, status: r.status, requested_by: r.requested_by, requested_by_name: r.requested_by_name, booking_total: parseFloat(r.total_price || 0), created_at: r.created_at })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/requests/mine - list requests for the authenticated user
router.get('/requests/mine', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, booking_id, request_type, payload, status, requested_by, created_at
       FROM booking_requests WHERE requested_by = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows.map((r) => ({ id: r.id, booking_id: r.booking_id, request_type: r.request_type, payload: r.payload, status: r.status, created_at: r.created_at })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
