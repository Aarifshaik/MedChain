import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

// Enhanced rate limiting with different tiers
export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id']
      });
      
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later.',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  });
};

// Different rate limits for different endpoints
export const generalRateLimit = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  parseInt(process.env.GENERAL_RATE_LIMIT_MAX || '1000'), // 1000 requests per window
  'Too many requests, please try again later.'
);

export const authRateLimit = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100'), // 100 authentication attempts per window
  'Too many authentication attempts, please try again later.'
);

export const uploadRateLimit = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // 20 uploads per hour
  'Too many file uploads, please try again later.'
);

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Additional security headers beyond helmet
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy for API
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  
  next();
};

// Request size validation
export const validateRequestSize = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.get('content-length');
  const maxSize = 50 * 1024 * 1024; // 50MB max for file uploads
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    logger.warn('Request size exceeded', {
      contentLength,
      maxSize,
      ip: req.ip,
      url: req.url,
      requestId: req.headers['x-request-id']
    });
    
    res.status(413).json({
      error: {
        code: 'REQUEST_TOO_LARGE',
        message: 'Request size exceeds maximum allowed limit',
        timestamp: new Date(),
        requestId: req.headers['x-request-id']
      }
    });
    return;
  }
  
  next();
};

// IP whitelist middleware (for production use)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (process.env.NODE_ENV === 'production' && allowedIPs.length > 0) {
      if (!clientIP || !allowedIPs.includes(clientIP)) {
        logger.warn('IP not whitelisted', {
          clientIP,
          allowedIPs,
          url: req.url,
          requestId: req.headers['x-request-id']
        });
        
        res.status(403).json({
          error: {
            code: 'IP_NOT_ALLOWED',
            message: 'Access denied from this IP address',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }
    }
    
    next();
  };
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          url: req.url,
          method: req.method,
          timeout: timeoutMs,
          requestId: req.headers['x-request-id']
        });
        
        res.status(408).json({
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
};