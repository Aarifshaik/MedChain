import express, { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { logger } from '../utils/logger.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/security.js';

const router = express.Router();

/**
 * Grant consent for data access (simplified)
 * POST /api/consent/grant
 */
router.post('/grant',
  authenticateToken,
  authorizeRoles('patient'),
  authRateLimit,
  [
    body('providerId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Provider ID must be alphanumeric with underscores or hyphens'),
    body('permissions')
      .isArray({ min: 1 })
      .withMessage('Permissions must be a non-empty array'),
    body('permissions.*.resourceType')
      .isIn(['diagnosis', 'prescription', 'lab_result', 'imaging', 'consultation_note'])
      .withMessage('Invalid resource type'),
    body('permissions.*.accessLevel')
      .isIn(['read', 'write'])
      .withMessage('Invalid access level'),
    body('expirationTime')
      .optional()
      .isISO8601()
      .withMessage('Expiration time must be a valid ISO 8601 date'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId, permissions, expirationTime } = req.body;
      const patientId = req.userId!;

      // Generate unique consent token ID
      const consentTokenId = `consent_${patientId}_${providerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate mock transaction ID
      const transactionId = `tx_consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // For demo purposes, simulate consent creation
      // In production, this would:
      // 1. Validate provider exists and is approved
      // 2. Create consent token on blockchain
      // 3. Store consent metadata
      // 4. Create audit trail entry

      logger.info('Consent granted successfully', {
        consentTokenId,
        patientId,
        providerId,
        permissions,
        expirationTime,
        requestId: req.headers['x-request-id']
      });

      res.status(201).json({
        success: true,
        data: {
          consentTokenId,
          patientId,
          providerId,
          permissions,
          expirationTime,
          transactionId,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        message: 'Consent granted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Consent grant failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONSENT_GRANT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to grant consent',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Revoke consent
 * POST /api/consent/:consentTokenId/revoke
 */
router.post('/:consentTokenId/revoke',
  authenticateToken,
  authorizeRoles('patient'),
  authRateLimit,
  [
    param('consentTokenId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Consent token ID is required'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { consentTokenId } = req.params;
      const patientId = req.userId!;

      // Generate mock transaction ID
      const transactionId = `tx_revoke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // For demo purposes, simulate consent revocation
      // In production, this would:
      // 1. Validate consent exists and belongs to patient
      // 2. Revoke consent on blockchain
      // 3. Update consent status
      // 4. Create audit trail entry

      logger.info('Consent revoked successfully', {
        consentTokenId,
        patientId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: {
          success: true,
          transactionId,
          revokedAt: new Date().toISOString()
        },
        message: 'Consent revoked successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Consent revocation failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONSENT_REVOKE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to revoke consent',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get consent status
 * GET /api/consent/:consentTokenId
 */
router.get('/:consentTokenId',
  authenticateToken,
  [
    param('consentTokenId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Consent token ID is required'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { consentTokenId } = req.params;
      const userId = req.userId!;

      // For demo purposes, simulate consent status check
      // In production, this would query the blockchain for consent status
      
      const mockConsent = {
        tokenId: consentTokenId,
        patientId: userId,
        providerId: 'mock_provider',
        isActive: true,
        permissions: [
          { resourceType: 'diagnosis', accessLevel: 'read' }
        ],
        createdAt: new Date().toISOString(),
        expirationTime: null,
        revokedAt: null
      };

      logger.info('Consent status retrieved', {
        consentTokenId,
        userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: mockConsent,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get consent status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONSENT_STATUS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve consent status',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get all active consents for patient
 * GET /api/consent/status
 */
router.get('/status',
  authenticateToken,
  authorizeRoles('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = req.userId!;

      // For demo purposes, return mock active consents
      const mockActiveConsents = [
        {
          tokenId: `consent_${patientId}_doctor_001`,
          providerId: 'doctor_001',
          permissions: [
            { resourceType: 'diagnosis', accessLevel: 'read' },
            { resourceType: 'prescription', accessLevel: 'write' }
          ],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          expirationTime: null,
          isActive: true
        },
        {
          tokenId: `consent_${patientId}_lab_001`,
          providerId: 'lab_001',
          permissions: [
            { resourceType: 'lab_result', accessLevel: 'write' }
          ],
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          expirationTime: null,
          isActive: true
        }
      ];

      logger.info('Active consents retrieved', {
        patientId,
        consentCount: mockActiveConsents.length,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: {
          activeConsents: mockActiveConsents,
          totalCount: mockActiveConsents.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get active consents:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONSENT_LIST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve active consents',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

export default router;