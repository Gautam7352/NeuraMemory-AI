import { describe, it, expect } from 'vitest';
import { AppError } from './AppError.js';

describe('AppError', () => {
  it('should create an AppError instance with correct properties', () => {
    const statusCode = 404;
    const message = 'Not Found';
    const isOperational = true;

    const error = new AppError(statusCode, message, isOperational);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(statusCode);
    expect(error.message).toBe(message);
    expect(error.isOperational).toBe(isOperational);
    expect(error.name).toBe('AppError');
    expect(error.stack).toBeDefined();
  });

  it('should default isOperational to true if not provided', () => {
    const statusCode = 500;
    const message = 'Internal Server Error';

    const error = new AppError(statusCode, message);

    expect(error.isOperational).toBe(true);
  });

  it('should allow setting isOperational to false', () => {
    const statusCode = 500;
    const message = 'Critical Error';
    const isOperational = false;

    const error = new AppError(statusCode, message, isOperational);

    expect(error.isOperational).toBe(false);
  });
});
