import { Request, Response, NextFunction } from 'express';
import { authService, SessionData } from '../services/authService.js';
import { logger } from '../utils/logger.js';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: SessionData;
      userId?: string;
      userRole?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: SessionData;
  userId: string;
  userRole: string;
}

/**
 * Middleware to verify JWT token and authenticate requests
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        url: req.url,
        requestId: req.headers['x-request-id']
      });

      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token required',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
      return;
    }

    // Verify token
    const session = authService.verifyToken(token);
    
    if (!session) {
      logger.warn('Authentication failed: Invalid or expired token', {
        ip: req.ip,
        url: req.url,
        requestId: req.headers['x-request-id']
      });

      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
      return;
    }

    // Attach user data to request
    req.user = session;
    req.userId = session.userId;
    req.userRole = session.role;

    logger.debug('Authentication successful', {
      userId: session.userId,
      role: session.role,
      url: req.url,
      requestId: req.headers['x-request-id']
    });

    next();

  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication service error',
        timestamp: new Date(),
        requestId: req.headers['x-request-id']
      }
    });
  }
};

/**
 * Middleware to authorize users based on roles
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.userRole) {
        logger.warn('Authorization failed: User not authenticated', {
          url: req.url,
          requestId: req.headers['x-request-id']
        });

        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      if (!allowedRoles.includes(req.userRole)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: req.userId,
          userRole: req.userRole,
          requiredRoles: allowedRoles,
          url: req.url,
          requestId: req.headers['x-request-id']
        });

        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions for this operation',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      logger.debug('Authorization successful', {
        userId: req.userId,
        userRole: req.userRole,
        url: req.url,
        requestId: req.headers['x-request-id']
      });

      next();

    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization service error',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const session = authService.verifyToken(token);
      if (session) {
        req.user = session;
        req.userId = session.userId;
        req.userRole = session.role;
      }
    }

    next();

  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    // Continue without authentication
    next();
  }
};