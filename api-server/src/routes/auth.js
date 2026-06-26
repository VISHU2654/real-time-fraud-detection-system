/**
 * @module routes/auth
 * @description Authentication endpoints.
 * POST /login — Validates credentials with bcrypt and returns a JWT token.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config');
const logger = require('../utils/logger');
const { validate, loginSchema } = require('../middleware/validate');

const router = express.Router();

/**
 * POST /login
 * Authenticate with username/password and receive a JWT token.
 */
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate username
    if (username !== config.adminUsername) {
      logger.warn({ username }, 'Login attempt with unknown username');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate password with bcrypt
    const isValid = await bcrypt.compare(password, config.adminPasswordHash);
    if (!isValid) {
      logger.warn({ username }, 'Login attempt with invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sign JWT with 8h expiry (not 100h as before)
    const token = jwt.sign(
      { id: username, role: 'admin' },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    logger.info({ username }, 'User logged in successfully');
    res.json({ token });
  } catch (err) {
    logger.error({ err: err.message }, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
