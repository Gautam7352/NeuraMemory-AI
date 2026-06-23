import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from './requireAuth.js';
import { AppError } from '../../utils/AppError.js';

// Mock the dependencies
vi.mock('jsonwebtoken');
vi.mock('../../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret',
  },
}));

describe('requireAuth middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      cookies: {},
    };
    mockResponse = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should authenticate a valid token from Authorization header', () => {
    const validToken = 'valid-token';
    const decodedPayload = { userId: '123', email: 'test@example.com' };

    mockRequest.headers = { authorization: `Bearer ${validToken}` };
    vi.mocked(jwt.verify).mockReturnValue(decodedPayload as unknown as void);

    requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith(validToken, 'test-secret');
    expect((mockRequest as Request).user).toEqual(decodedPayload);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(); // called without arguments
  });

  it('should authenticate a valid token from cookies fallback', () => {
    const validToken = 'valid-cookie-token';
    const decodedPayload = { userId: '123', email: 'test@example.com' };

    mockRequest.cookies = { authorization: validToken };
    vi.mocked(jwt.verify).mockReturnValue(decodedPayload as unknown as void);

    requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith(validToken, 'test-secret');
    expect((mockRequest as Request).user).toEqual(decodedPayload);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should call next with AppError 401 if no token is provided', () => {
    requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = vi.mocked(mockNext).mock.calls[0]?.[0] as unknown as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error?.statusCode).toBe(401);
    expect(error?.message).toBe('Authentication required. No token provided.');
  });

  it('should call next with AppError 401 if payload is invalid (missing fields)', () => {
    const validToken = 'valid-token';
    const invalidPayload = { userId: '123' }; // missing email

    mockRequest.headers = { authorization: `Bearer ${validToken}` };
    vi.mocked(jwt.verify).mockReturnValue(invalidPayload as unknown as void);

    requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = vi.mocked(mockNext).mock.calls[0]?.[0] as unknown as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error?.statusCode).toBe(401);
    expect(error?.message).toBe('Invalid token payload.');
  });

  it('should call next with AppError 401 if token has expired', () => {
    const expiredToken = 'expired-token';

    mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

    // Create a mock TokenExpiredError
    const expiredError = new Error('jwt expired');
    expiredError.name = 'TokenExpiredError';
    Object.setPrototypeOf(expiredError, jwt.TokenExpiredError.prototype);
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw expiredError;
    });

    requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = vi.mocked(mockNext).mock.calls[0]?.[0] as unknown as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error?.statusCode).toBe(401);
    expect(error?.message).toBe('Token has expired. Please log in again.');
  });

  it('should call next with AppError 401 if token signature is invalid', () => {
    const invalidToken = 'invalid-token';

    mockRequest.headers = { authorization: `Bearer ${invalidToken}` };

    // Create a mock JsonWebTokenError
    const invalidError = new Error('invalid signature');
    invalidError.name = 'JsonWebTokenError';
    Object.setPrototypeOf(invalidError, jwt.JsonWebTokenError.prototype);
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw invalidError;
    });

    requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = vi.mocked(mockNext).mock.calls[0]?.[0] as unknown as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error?.statusCode).toBe(401);
    expect(error?.message).toBe('Invalid token: invalid signature');
  });

  it('should call next with generic AppError 401 for other verification errors', () => {
    const genericToken = 'generic-token';

    mockRequest.headers = { authorization: `Bearer ${genericToken}` };

    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('Some other error');
    });

    requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = vi.mocked(mockNext).mock.calls[0]?.[0] as unknown as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error?.statusCode).toBe(401);
    expect(error?.message).toBe(
      'Authentication failed. Please provide a valid token.',
    );
  });
});
