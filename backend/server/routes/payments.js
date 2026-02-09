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

    await pool.query(
      "UPDATE bookings SET status = 'paid' WHERE id = $1",
      [booking_id]
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

module.exports = router;
