const path = require('path');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const uploadDir = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = (file.originalname || '').split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
    cb(null, `room-${Date.now()}.${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'), false);
  },
});

/**
 * POST /api/upload
 * Body: multipart/form-data with field "image" (file).
 * Returns: { url: "/uploads/filename" }
 * Admin only.
 */
function uploadRoute(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided. Use form field "image".' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
}

module.exports = { upload, uploadRoute, uploadDir };
