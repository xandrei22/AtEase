const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { validatePassword } = require('../utils/validatePassword');
const nodemailer = require('nodemailer');

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const router = express.Router();
const RESET_TOKEN_EXPIRY_HOURS = 1;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// SMTP configuration via env vars (optional). If not provided, reset link is returned in response for development.
const MAIL_HOST = process.env.MAIL_HOST;
const MAIL_PORT = process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined;
const MAIL_SECURE = process.env.MAIL_SECURE === 'true';
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@atease.local';

let mailer = null;
if (MAIL_HOST) {
  try {
    mailer = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT || 587,
      secure: !!MAIL_SECURE,
      auth: MAIL_USER ? { user: MAIL_USER, pass: MAIL_PASS } : undefined,
    });
  } catch (err) {
    console.error('[auth] failed to create mailer:', err && err.message ? err.message : err);
    mailer = null;
  }
}

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

// POST /api/auth/google – sign in / register with Google (customer only)
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }
    if (!googleClient) {
      return res.status(503).json({ error: 'Google sign-in is not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = (payload.email || '').trim().toLowerCase();
    const name = (payload.name || payload.email || 'User').trim();
    if (!email) {
      return res.status(400).json({ error: 'Google account has no email' });
    }

    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = 'CUSTOMER' LIMIT 1"
    );
    if (roleResult.rows.length === 0) {
      return res.status(500).json({ error: 'Roles not seeded. Run database/seed.sql' });
    }
    const roleId = roleResult.rows[0].id;

    let userResult = await pool.query(
      'SELECT u.id, u.name, u.email, r.name AS role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1',
      [email]
    );
    let user = userResult.rows[0];

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hash = await bcrypt.hash(randomPassword, 10);
      const insertResult = await pool.query(
        'INSERT INTO users (name, email, password, role_id) VALUES ($1, $2, $3, $4)',
        [name, email, hash, roleId]
      );
      const userId = insertResult.insertId ?? insertResult.rows[0]?.id;
      const sel = await pool.query(
        'SELECT u.id, u.name, u.email, r.name AS role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
        [userId]
      );
      user = sel.rows[0];
    } else if (user.role_name !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Use the admin sign-in page for this account' });
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
    console.error('[auth/google]', err.message || err);
    res.status(500).json({ error: err.message || 'Google sign-in failed' });
  }
});

// POST /api/auth/forgot-password – request password reset (email + role: customer | admin; admin requires password verification)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, role, currentPassword } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }
    const roleName = (role === 'admin' ? 'ADMIN' : 'CUSTOMER').toUpperCase();
    
    // For admin role, require current password verification
    if (role === 'admin' && !currentPassword) {
      return res.status(400).json({ error: 'Password is required for admin password reset' });
    }

    const result = await pool.query(
      'SELECT u.id, u.password FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1 AND r.name = $2',
      [email.trim().toLowerCase(), roleName]
    );
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account exists with that email, you will receive a reset link.' });
    }
    const user = result.rows[0];
    
    // For admin, verify current password
    if (role === 'admin') {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

    const userId = user.id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );
    const resetPath = role === 'admin' ? '/admin/reset-password' : '/reset-password';
    const resetLink = `${FRONTEND_URL}${resetPath}?token=${token}`;
    // Try to send email if SMTP configured
    if (mailer) {
      const mailOptions = {
        from: MAIL_FROM,
        to: email,
        subject: 'AtEase Password Reset',
        text: `You requested a password reset. Use this link to reset your password:\n\n${resetLink}\n\nIf you did not request this, ignore this email.`,
        html: `<p>You requested a password reset. Use this link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, ignore this email.</p>`,
      };
      try {
        await mailer.sendMail(mailOptions);
        return res.json({ message: 'If an account exists with that email, you will receive a reset link.' });
      } catch (err) {
        console.error('[auth/forgot-password] failed to send email:', err && err.message ? err.message : err);
        // fall through to return resetLink in response for dev
      }
    }

    // Fallback for development: include reset link in response so frontend/dev can access it
    res.json({
      message: 'If an account exists with that email, you will receive a reset link.',
      resetLink,
    });
  } catch (err) {
    console.error('[auth/forgot-password]', err.message || err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/auth/reset-password – set new password using token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }
    const tokenResult = await pool.query(
      'SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token = $1',
      [token]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }
    const row = tokenResult.rows[0];
    if (new Date(row.expires_at) < new Date()) {
      await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, row.user_id]);
    await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);
    res.json({ message: 'Password has been reset. You can now sign in with your new password.' });
  } catch (err) {
    console.error('[auth/reset-password]', err.message || err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/auth/change-password – change password (authenticated; requires current password)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }

    const result = await pool.query(
      'SELECT id, password FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password has been updated successfully.' });
  } catch (err) {
    console.error('[auth/change-password]', err.message || err);
    res.status(500).json({ error: err.message || 'Failed to change password' });
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

// PATCH /api/auth/profile – update user profile (name/email; requires auth)
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (email !== undefined && email.trim()) updates.email = email.trim().toLowerCase();
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Provide name or email to update' });
    }
    const setClauses = [];
    const params = [];
    let paramCount = 1;
    if (updates.name) {
      setClauses.push(`name = $${paramCount}`);
      params.push(updates.name);
      paramCount++;
    }
    if (updates.email) {
      setClauses.push(`email = $${paramCount}`);
      params.push(updates.email);
      paramCount++;
    }
    params.push(req.user.id);
    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, role_id`;
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    const roleResult = await pool.query('SELECT name FROM roles WHERE id = $1', [user.role_id]);
    const role_name = roleResult.rows[0]?.name || 'UNKNOWN';
    res.json({ id: user.id, name: user.name, email: user.email, role: role_name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062 || err.constraint === 'users_email_key') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error('[auth/profile]', err.message || err);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

module.exports = router;
