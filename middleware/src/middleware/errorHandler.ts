import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: Date;
    requestId: string;
  };
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 
    Math.random().toString(36).substring(2, 15);

  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    requestId,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  const errorResponse: ErrorResponse = {
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      timestamp: new Date(),
      requestId
    }
  };

  // Add details for development environment
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = {
      stack: err.stack
    };
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json(errorResponse);
};