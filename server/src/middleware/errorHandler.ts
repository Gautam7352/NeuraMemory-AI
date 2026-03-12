import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Zod or other validation errors that bubble up unexpectedly
  if (err instanceof Error) {
    console.error(
      `[ErrorHandler] U
      nhandled Error: ${err.message}`,
      err.stack,
    );
  } else {
    console.error('[ErrorHandler] Unknown error:', err);
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
