import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { loginService, registerService } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';

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

    res.cookie("authorization", response.token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
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

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}
