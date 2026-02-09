/**
 * Role-Based Access Control.
 * Use after authenticate() so req.user.role is set.
 * @param {string[]} allowedRoles - e.g. ['ADMIN'] or ['ADMIN', 'CUSTOMER']
 */
function requireRole(allowedRoles) {
  const set = new Set(Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!set.has(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireRole };
