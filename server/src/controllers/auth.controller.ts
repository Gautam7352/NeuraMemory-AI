import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loginService, registerService } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const registerSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/login
 * Validates credentials and returns a signed JWT on success.
 */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, result.error.errors[0].message);
    }

    const { email, password } = result.data;
    const response = await loginService(email, password);

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/register
 * Validates request body, creates a new user, and returns a signed JWT.
 */
export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, result.error.errors[0].message);
    }

    const { email, password } = result.data;
    const response = await registerService(email, password);

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}
