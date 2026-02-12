require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const { upload, uploadRoute, uploadDir } = require('./routes/upload');
const { authenticate } = require('./middleware/auth');
const { requireRole } = require('./middleware/rbac');

const authRoutes = require('./routes/auth');
const roomsRoutes = require('./routes/rooms');
const bookingsRoutes = require('./routes/bookings');
const paymentsRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 5000;

fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Health check (DB connection)
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, database: 'error', message: err.message });
  }
});

// API routes (all persist to database)
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);

// Image upload (admin only)
app.post('/api/upload', authenticate, requireRole(['ADMIN']), (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : (err.message || 'Upload failed.');
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
    return uploadRoute(req, res);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
