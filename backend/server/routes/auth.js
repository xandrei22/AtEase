const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { validatePassword } = require('../utils/validatePassword');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register – create customer account
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }

    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = 'CUSTOMER' LIMIT 1"
    );
    if (roleResult.rows.length === 0) {
      return res.status(500).json({ error: 'Roles not seeded. Run database/seed.sql' });
    }
    const roleId = roleResult.rows[0].id;

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role_id) VALUES ($1, $2, $3, $4)',
      [name.trim(), email.trim().toLowerCase(), hash, roleId]
    );
    const idResult = await pool.query('SELECT LAST_INSERT_ID() AS id');
    const userId = idResult.rows[0]?.id ?? idResult.insertId;
    const userResult = await pool.query('SELECT id, name, email, role_id FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    const roleNameResult = await pool.query('SELECT name FROM roles WHERE id = $1', [user.role_id]);
    const role_name = roleNameResult.rows[0]?.name || 'CUSTOMER';

    const token = signToken({ id: user.id, email: user.email, role_name });
    res.status(201).json({
      message: 'Registered successfully',
      user: { id: user.id, name: user.name, email: user.email, role: role_name },
      token,
    });
  } catch (err) {
    console.error('[auth/register]', err.message || err);
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT u.id, u.name, u.email, u.password, r.name AS role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1',
      [email.trim().toLowerCase()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role_name: user.role_name,
    });
    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role_name },
      token,
    });
  } catch (err) {
    console.error('[auth/login]', err.message || err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// GET /api/auth/me – current user (requires auth)
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.name, u.email, r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const row = result.rows[0];
    res.json({ id: row.id, name: row.name, email: row.email, role: row.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
