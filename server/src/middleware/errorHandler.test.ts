import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { AppError } from '../utils/AppError.js';
import { errorHandler } from './errorHandler.js';

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockReq = {
      originalUrl: '/test-url',
      method: 'POST',
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle body parser syntax error', () => {
    // A simulated body parser error
    const err = new Error('Unexpected token') as Error & {
      status?: number;
      type?: string;
      body?: unknown;
    };
    err.status = 400;
    err.type = 'entity.parse.failed';
    err.body = '{ malformed json }';

    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const logCall = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
    expect(logCall.message).toBe('Malformed JSON payload');

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Malformed JSON payload.',
    });
  });

  it('should handle ZodError', () => {
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['username'],
        message: 'Expected string, received number',
      },
    ];
    const err = new ZodError(issues);

    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const logCall = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
    expect(logCall.message).toBe('Validation error');
    expect(logCall.issues).toHaveLength(1);
    expect(logCall.issues[0].path).toBe('username');
    expect(logCall.issues[0].message).toBe('Expected string, received number');

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Expected string, received number',
    });
  });

  it('should handle AppError', () => {
    const err = new AppError(404, 'Resource not found', true);

    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const logCall = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
    expect(logCall.message).toBe('Operational error');
    expect(logCall.statusCode).toBe(404);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Resource not found',
    });
  });

  it('should handle generic Error', () => {
    const err = new Error('Something went terribly wrong');

    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logCall = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(logCall.message).toBe('Unhandled application error');
    expect(logCall.errorMessage).toBe('Something went terribly wrong');

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
    });
  });

  it('should handle unknown throwables (e.g., string)', () => {
    const err = 'Just a string error';

    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logCall = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(logCall.message).toBe('Unknown throwable encountered');
    expect(logCall.error).toBe('Just a string error');

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
    });
  });

  it('should include request context in logs', () => {
    const err = new Error('Test context');
    mockReq.headers = { 'x-request-id': 'req-123' };
    mockReq.url = '/fallback-url';
    mockReq.originalUrl = '' as unknown as string;

    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logCall = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(logCall.path).toBe('/fallback-url');
    expect(logCall.requestId).toBe('req-123');
    expect(logCall.method).toBe('POST');
    expect(logCall.timestamp).toBeDefined();
  });
});
