/**
 * @module middleware/auth
 * @description JWT authentication and role-based access control middleware.
 * - authMiddleware: Verifies JWT token and attaches decoded user to req.user
 * - requireRole: Factory that creates middleware to enforce role-based access
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Middleware that verifies JWT Bearer token from Authorization header.
 * Attaches decoded token payload to req.user on success.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn({ err: err.message }, 'Invalid JWT token');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Factory that creates role-checking middleware.
 * Must be used AFTER authMiddleware.
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'analyst')
 * @returns {Function} Express middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn({ userId: req.user?.id, requiredRoles: roles }, 'Insufficient permissions');
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authMiddleware, requireRole };
