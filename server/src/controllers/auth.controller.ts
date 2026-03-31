import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import {
  loginService,
  registerService,
  generateApiService,
} from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const emailSchema = z
  .string({
    required_error: 'Email is required.',
    invalid_type_error: 'Email must be a string.',
  })
  .trim()
  .toLowerCase()
  .email('Please provide a valid email address.');

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({
      required_error: 'Password is required.',
      invalid_type_error: 'Password must be a string.',
    })
    .trim()
    .min(1, 'Password is required.'),
});

const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string({
      required_error: 'Password is required.',
      invalid_type_error: 'Password must be a string.',
    })
    .trim()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(
        400,
        result.error.errors[0]?.message ?? 'Invalid input.',
      );
    }

    const { email, password } = result.data;
    const response = await loginService(email, password);

    res.cookie('authorization', response.token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(
        400,
        result.error.errors[0]?.message ?? 'Invalid input.',
      );
    }

    const { email, password } = result.data;
    const response = await registerService(email, password);

    res.cookie('authorization', response.token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    const { token: _token, ...safeResponse } = response;
    void _token; // Mark as used to satisfy lint
    res.status(201).json(safeResponse);
  } catch (err) {
    next(err);
  }
}

export async function generateApiKeyController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const response = await generateApiService(userId);

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.clearCookie('authorization', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    // We can just import and use findUserById from repository
    const { findUserById } = await import('../repositories/user.repository.js');
    const user = await findUserById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const safeUser = { ...user };
    res.status(200).json({ success: true, data: { user: safeUser } });
  } catch (err) {
    next(err);
  }
}
