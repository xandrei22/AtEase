const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/payments – record payment for a booking (mock: always success)
router.post('/', authenticate, async (req, res) => {
  try {
    const { booking_id, amount, payment_method = 'card' } = req.body;

    if (!booking_id || amount == null) {
      return res.status(400).json({ error: 'booking_id and amount are required' });
    }

    const bookingResult = await pool.query(
      'SELECT id, user_id, total_price, status FROM bookings WHERE id = $1',
      [booking_id]
    );
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    if (req.user.role !== 'ADMIN' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Cannot pay for another user\'s booking' });
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    await pool.query(
      `INSERT INTO payments (booking_id, amount, payment_status, payment_method)
       VALUES ($1, $2, 'completed', $3)`,
      [booking_id, paymentAmount, payment_method]
    );
    const payIdRes = await pool.query('SELECT LAST_INSERT_ID() AS id');
    const payId = payIdRes.rows[0]?.id ?? payIdRes.insertId;
    const paySel = await pool.query(
      'SELECT id, booking_id, amount, payment_status, payment_method, created_at FROM payments WHERE id = $1',
      [payId]
    );
    const payment = paySel.rows[0];

    const sumResult = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE booking_id = $1 AND payment_status = $2',
      [booking_id, 'completed']
    );
    const totalPaid = parseFloat(sumResult.rows[0]?.total_paid ?? 0);
    const bookingTotal = parseFloat(booking.total_price);
    const newStatus = totalPaid >= bookingTotal ? 'paid' : 'partial';
    await pool.query(
      'UPDATE bookings SET status = $1 WHERE id = $2',
      [newStatus, booking_id]
    );

    res.status(201).json({
      id: payment.id,
      booking_id: payment.booking_id,
      amount: parseFloat(payment.amount),
      payment_status: payment.payment_status,
      payment_method: payment.payment_method,
      created_at: payment.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/refund - process a refund (ADMIN only)
router.post('/refund', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    const { booking_id, amount } = req.body;
    if (!booking_id || amount == null) return res.status(400).json({ error: 'booking_id and amount are required' });

    const bookingResult = await pool.query('SELECT id, total_price FROM bookings WHERE id = $1', [booking_id]);
    if (bookingResult.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const sumResult = await pool.query('SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE booking_id = $1 AND payment_status = $2', [booking_id, 'completed']);
    const totalPaid = parseFloat(sumResult.rows[0]?.total_paid ?? 0);
    const refundAmount = parseFloat(amount);
    if (refundAmount <= 0) return res.status(400).json({ error: 'Refund amount must be positive' });
    if (refundAmount > totalPaid) return res.status(400).json({ error: 'Refund amount cannot exceed total paid' });

    // record refund as a payments row with status 'refunded' and method 'refund'
    await pool.query('INSERT INTO payments (booking_id, amount, payment_status, payment_method) VALUES ($1, $2, $3, $4)', [booking_id, refundAmount, 'refunded', 'refund']);
    const payIdRes = await pool.query('SELECT LAST_INSERT_ID() AS id');
    const payId = payIdRes.rows[0]?.id ?? payIdRes.insertId;
    const paySel = await pool.query('SELECT id, booking_id, amount, payment_status, payment_method, created_at FROM payments WHERE id = $1', [payId]);
    const refund = paySel.rows[0];

    res.status(201).json({
      id: refund.id,
      booking_id: refund.booking_id,
      amount: parseFloat(refund.amount),
      payment_status: refund.payment_status,
      payment_method: refund.payment_method,
      created_at: refund.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/summary/:bookingId - returns totals for a booking
router.get('/summary/:bookingId', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const bookingResult = await pool.query('SELECT id, total_price FROM bookings WHERE id = $1', [bookingId]);
    if (bookingResult.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const paidRes = await pool.query('SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE booking_id = $1 AND payment_status = $2', [bookingId, 'completed']);
    const refundedRes = await pool.query('SELECT COALESCE(SUM(amount),0) AS total_refunded FROM payments WHERE booking_id = $1 AND payment_status = $2', [bookingId, 'refunded']);
    const totalPaid = parseFloat(paidRes.rows[0]?.total_paid ?? 0);
    const totalRefunded = parseFloat(refundedRes.rows[0]?.total_refunded ?? 0);
    const netPaid = Math.max(0, totalPaid - totalRefunded);

    res.json({ booking_id: bookingId, total_price: parseFloat(bookingResult.rows[0].total_price), total_paid: totalPaid, total_refunded: totalRefunded, net_paid: netPaid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
