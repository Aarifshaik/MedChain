import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { authService } from '../services/authService.js';
import { blockchainManager } from '../utils/blockchainManager.js';
// import { DEFAULT_USERS, validateDefaultUser, getDefaultUser } from '../utils/defaultUsers.js';
import { logger } from '../utils/logger.js';
import { handleValidationErrors, validateSignature, validatePublicKey, validateUserRole } from '../middleware/validation.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/security.js';

const router = express.Router();

// In-memory nonce storage (in production, use Redis or database)
const nonceStore = new Map<string, { nonce: string; expiresAt: number; userId: string }>();

// Clean up expired nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of nonceStore.entries()) {
    if (value.expiresAt < now) {
      nonceStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate authentication nonce
 * POST /api/auth/nonce
 */
router.post('/nonce', 
  authRateLimit,
  [
    body('userId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('User ID must be alphanumeric with underscores or hyphens'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.body;

      // Generate nonce
      const nonce = authService.generateNonce();
      const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes from now

      // Store nonce with expiration
      nonceStore.set(nonce, {
        nonce,
        expiresAt,
        userId
      });

      logger.info('Nonce generated', {
        userId,
        nonce: nonce.substring(0, 8) + '...',
        requestId: req.headers['x-request-id']
      });

      res.json({
        nonce,
        expiresAt: new Date(expiresAt).toISOString(),
        expiresIn: 300, // 5 minutes
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Nonce generation failed:', error);
      res.status(500).json({
        error: {
          code: 'NONCE_GENERATION_ERROR',
          message: 'Failed to generate authentication nonce',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Authenticate user with signature
 * POST /api/auth/authenticate
 */
router.post('/authenticate',
  authRateLimit,
  [
    body('userId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('User ID must be alphanumeric with underscores or hyphens'),
    body('nonce')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Nonce is required'),
    validateSignature,
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, nonce, signature } = req.body;

      // Validate nonce
      const storedNonce = nonceStore.get(nonce);
      if (!storedNonce) {
        res.status(401).json({
          error: {
            code: 'INVALID_NONCE',
            message: 'Invalid or expired nonce',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Check nonce expiration
      if (storedNonce.expiresAt < Date.now()) {
        nonceStore.delete(nonce);
        res.status(401).json({
          error: {
            code: 'NONCE_EXPIRED',
            message: 'Nonce has expired',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Verify nonce belongs to user
      if (storedNonce.userId !== userId) {
        res.status(401).json({
          error: {
            code: 'NONCE_MISMATCH',
            message: 'Nonce does not match user',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Remove used nonce
      nonceStore.delete(nonce);

      // For now, use the auth service for all users
      const authResult = await authService.authenticateUser(userId, nonce, signature);

      if (!authResult.isValid) {
        logger.warn('Authentication failed', {
          userId,
          error: authResult.error,
          ip: req.ip,
          requestId: req.headers['x-request-id']
        });

        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: authResult.error || 'Authentication failed',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Generate JWT token
      const authToken = authService.generateToken(
        authResult.userId!,
        authResult.role!,
        authResult.publicKeys!
      );

      // Log audit event
      try {
        const blockchainService = blockchainManager.getBlockchainService();
        await blockchainService.logAuditEvent(
          'LOGIN_ATTEMPT',
          userId,
          '',
          { success: true, ip: req.ip },
          signature
        );
      } catch (auditError) {
        logger.warn('Failed to log audit event:', auditError);
        // Continue with login even if audit logging fails
      }

      logger.info('User logged in successfully', {
        userId: authResult.userId,
        role: authResult.role,
        requestId: req.headers['x-request-id']
      });

      res.json({
        token: authToken.token,
        expiresAt: authToken.expiresAt,
        user: {
          userId: authResult.userId,
          role: authResult.role
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: {
          code: 'LOGIN_ERROR',
          message: 'Authentication service error',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Refresh authentication token
 * POST /api/auth/refresh
 */
router.post('/refresh',
  authenticateToken,
  async (req, res) => {
    try {
      const currentToken = req.headers.authorization?.split(' ')[1];
      
      if (!currentToken) {
        res.status(400).json({
          error: {
            code: 'TOKEN_REQUIRED',
            message: 'Current token required for refresh',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      const newToken = authService.refreshToken(currentToken);
      
      if (!newToken) {
        res.status(401).json({
          error: {
            code: 'TOKEN_REFRESH_FAILED',
            message: 'Failed to refresh token',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      logger.info('Token refreshed successfully', {
        userId: req.userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        token: newToken.token,
        expiresAt: newToken.expiresAt
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: {
          code: 'TOKEN_REFRESH_ERROR',
          message: 'Token refresh service error',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Revoke session
      const revoked = authService.revokeSession(userId);
      
      if (revoked) {
        logger.info('User logged out successfully', {
          userId,
          requestId: req.headers['x-request-id']
        });
      }

      res.json({
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Logout service error',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get current user profile
 * GET /api/auth/profile
 */
router.get('/profile',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.userId!;
      let userData;
      
      // Try to get user data from blockchain, fallback to mock data
      if (blockchainManager.isServiceAvailable()) {
        try {
          const blockchainService = blockchainManager.getBlockchainService();
          const userResult = await blockchainService.getUser(userId);
          
          if (userResult.result) {
            userData = JSON.parse(userResult.result);
          }
        } catch (blockchainError) {
          logger.warn('Blockchain query failed, using mock data:', blockchainError);
        }
      }
      
      // If blockchain data not available, use mock data from auth service
      if (!userData) {
        const mockUsers: { [key: string]: any } = {
          'admin': {
            userId: 'admin',
            role: 'system_admin',
            personalInfo: {
              firstName: 'System',
              lastName: 'Administrator',
              email: 'admin@healthcare-dlt.com'
            },
            registrationStatus: 'approved',
            createdAt: '2024-01-01T00:00:00Z'
          },
          'doctor1': {
            userId: 'doctor1',
            role: 'doctor',
            personalInfo: {
              firstName: 'Dr. Jane',
              lastName: 'Smith',
              email: 'jane.smith@hospital.com'
            },
            professionalInfo: {
              licenseNumber: 'MD123456',
              specialization: 'General Practice',
              institution: 'City General Hospital'
            },
            registrationStatus: 'approved',
            createdAt: '2024-01-01T00:00:00Z'
          },
          'patient1': {
            userId: 'patient1',
            role: 'patient',
            personalInfo: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@email.com',
              dateOfBirth: '1985-06-15'
            },
            registrationStatus: 'approved',
            createdAt: '2024-01-01T00:00:00Z'
          }
        };
        
        userData = mockUsers[userId];
        
        if (!userData) {
          // For any other user, create basic profile
          userData = {
            userId: userId,
            role: req.user!.role || 'patient',
            personalInfo: {
              firstName: 'Mock',
              lastName: 'User'
            },
            registrationStatus: 'approved',
            createdAt: new Date().toISOString(),
            note: 'This is mock data for development'
          };
        }
      }
      
      // Remove sensitive data
      const { publicKeys, ...safeUserData } = userData;
      
      res.json({
        user: safeUserData,
        session: {
          issuedAt: req.user!.issuedAt,
          expiresAt: req.user!.expiresAt
        },
        dataSource: blockchainManager.isServiceAvailable() ? 'blockchain' : 'mock'
      });

    } catch (error) {
      logger.error('Profile retrieval error:', error);
      res.status(500).json({
        error: {
          code: 'PROFILE_ERROR',
          message: 'Failed to retrieve user profile',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register',
  authRateLimit,
  [
    body('userId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('User ID must be alphanumeric with underscores or hyphens'),
    validateUserRole,
    body('publicKeys.kyberPublicKey')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Kyber public key is required'),
    body('publicKeys.dilithiumPublicKey')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Dilithium public key is required'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email address required'),
    body('organizationId')
      .optional()
      .isString()
      .withMessage('Organization ID must be a string'),
    body('signature')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Registration signature is required'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, role, publicKeys, email, organizationId, signature } = req.body;

      // Use the auth service for blockchain registration
      const result = await authService.registerUser(
        userId,
        role,
        publicKeys,
        email || `${userId}@healthcare-dlt.com`,
        organizationId || 'healthcare-system',
        signature
      );

      if (result.success) {
        logger.info('User registered successfully', {
          userId,
          role,
          transactionId: result.transactionId,
          requestId: req.headers['x-request-id']
        });

        res.status(201).json({
          message: result.message,
          userId,
          role,
          status: role === 'patient' ? 'pending_doctor_approval' : 'pending_admin_approval',
          transactionId: result.transactionId,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          error: {
            code: 'REGISTRATION_FAILED',
            message: result.message,
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
      }

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        error: {
          code: 'REGISTRATION_ERROR',
          message: 'User registration service error',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get session statistics (admin only)
 * GET /api/auth/sessions/stats
 */
router.get('/sessions/stats',
  authenticateToken,
  authorizeRoles('system_admin'),
  async (req, res) => {
    try {
      const stats = authService.getSessionStats();
      
      res.json({
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Session stats error:', error);
      res.status(500).json({
        error: {
          code: 'SESSION_STATS_ERROR',
          message: 'Failed to retrieve session statistics',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

export default router;