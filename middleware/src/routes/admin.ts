import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { blockchainManager } from '../utils/blockchainManager.js';
import { logger } from '../utils/logger.js';
import { handleValidationErrors, validateSignature } from '../middleware/validation.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

/**
 * Approve user registration (admin only)
 * POST /api/admin/approve-user
 */
router.post('/approve-user',
  authenticateToken,
  authorizeRoles('system_admin'),
  [
    body('userId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('User ID must be alphanumeric with underscores or hyphens'),
    body('adminSignature')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Admin signature is required'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, adminSignature } = req.body;
      const adminId = req.userId!;

      logger.info(`Admin ${adminId} approving user: ${userId}`);

      // Submit approval transaction to blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.approveRegistration(userId, adminSignature);

      if (result.isSuccessful) {
        logger.info(`User approved successfully: ${userId}, Transaction ID: ${result.transactionId}`);
        
        res.json({
          success: true,
          message: 'User registration approved successfully',
          userId,
          approvedBy: adminId,
          transactionId: result.transactionId,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.error(`User approval failed: ${userId}`);
        res.status(400).json({
          error: {
            code: 'APPROVAL_FAILED',
            message: 'Failed to approve user registration',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
      }

    } catch (error) {
      logger.error('User approval error:', error);
      res.status(500).json({
        error: {
          code: 'APPROVAL_ERROR',
          message: `Approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get pending registrations (admin only)
 * GET /api/admin/pending-registrations
 */
router.get('/pending-registrations',
  authenticateToken,
  authorizeRoles('system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = req.userId!;
      
      logger.info(`Admin ${adminId} requesting pending registrations`);

      // Create admin signature for the request
      const adminSignature = `admin_query_${Date.now()}_${adminId}`;
      
      // Query pending registrations from blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.getPendingRegistrations(adminSignature);

      if (result.result) {
        const pendingUsers = JSON.parse(result.result);
        
        logger.info(`Retrieved ${pendingUsers.length} pending registrations`);
        
        res.json({
          success: true,
          users: pendingUsers,
          count: pendingUsers.length,
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({
          success: true,
          users: [],
          count: 0,
          message: 'No pending registrations found',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Pending registrations query error:', error);
      res.status(500).json({
        error: {
          code: 'PENDING_QUERY_ERROR',
          message: `Failed to retrieve pending registrations: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get user details (admin only)
 * GET /api/admin/user/:userId
 */
router.get('/user/:userId',
  authenticateToken,
  authorizeRoles('system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const adminId = req.userId!;

      logger.info(`Admin ${adminId} requesting user details for: ${userId}`);

      // Query user from blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.getUser(userId);

      if (result.result) {
        const userData = JSON.parse(result.result);
        
        logger.info(`Retrieved user details for: ${userId}`);
        
        res.json({
          success: true,
          user: userData,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: `User ${userId} not found in blockchain`,
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
      }

    } catch (error) {
      logger.error('User query error:', error);
      res.status(500).json({
        error: {
          code: 'USER_QUERY_ERROR',
          message: `Failed to retrieve user details: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get all users (admin only)
 * GET /api/admin/users
 */
router.get('/users',
  authenticateToken,
  authorizeRoles('system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = req.userId!;
      const { status, role } = req.query;

      logger.info(`Admin ${adminId} requesting all users`);

      // Note: This would require a new chaincode function to get all users
      // For now, we'll return a message indicating this needs implementation
      res.json({
        success: false,
        message: 'Get all users functionality needs to be implemented in chaincode',
        note: 'Use pending-registrations endpoint for pending users',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Users query error:', error);
      res.status(500).json({
        error: {
          code: 'USERS_QUERY_ERROR',
          message: `Failed to retrieve users: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

export default router;