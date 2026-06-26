/**
 * @module middleware/validate
 * @description Request validation middleware using Zod schemas.
 * Provides a validate() factory and pre-defined schemas for all endpoints.
 */
const { z } = require('zod');

/**
 * Creates Express middleware that validates req.body against a Zod schema.
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.body = result.data;
    next();
  };
};

// --- Validation Schemas ---

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const transactionSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  amount: z.number().positive('Amount must be positive'),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  distance_from_home: z.number().min(0),
  repeat_retailer: z.number().min(0).max(1),
  used_chip: z.number().min(0).max(1),
  used_pin_number: z.number().min(0).max(1),
  online_order: z.number().min(0).max(1),
});

const reviewSchema = z.object({
  newStatus: z.enum(['CLEARED', 'BLOCKED'], {
    errorMap: () => ({ message: 'Status must be CLEARED or BLOCKED' })
  }),
});

const bulkReviewSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one ID is required'),
  newStatus: z.enum(['CLEARED', 'BLOCKED'], {
    errorMap: () => ({ message: 'Status must be CLEARED or BLOCKED' })
  }),
});

const thresholdSchema = z.object({
  threshold: z.number().min(0).max(1, 'Threshold must be between 0 and 1'),
});

module.exports = {
  validate,
  loginSchema,
  transactionSchema,
  reviewSchema,
  bulkReviewSchema,
  thresholdSchema,
};
