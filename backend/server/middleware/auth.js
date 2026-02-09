const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'atease-dev-secret-change-in-production';

/**
 * Verify JWT and attach user to req.user.
 * Use on routes that require login.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth: if token present, set req.user; otherwise continue without it.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
  } catch (_) {
    // ignore invalid token for optional auth
  }
  next();
}

module.exports = { authenticate, optionalAuth, JWT_SECRET };
