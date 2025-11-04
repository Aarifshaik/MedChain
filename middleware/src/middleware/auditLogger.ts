import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const auditLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || 
    Math.random().toString(36).substring(2, 15);

  // Add request ID to headers for tracking
  req.headers['x-request-id'] = requestId;

  // Log request
  logger.info('API Request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: () => void) {
    const duration = Date.now() - startTime;
    
    logger.info('API Response', {
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    return originalEnd(chunk, encoding, cb);
  };

  next();
};