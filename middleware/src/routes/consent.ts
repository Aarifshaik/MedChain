import express, { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { consentService, ConsentPermission } from '../services/consentService.js';
import { logger } from '../utils/logger.js';
import { handleValidationErrors, validateSignature } from '../middleware/validation.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/security.js';

const router = express.Router();

/**
 * Grant consent for data access
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
    validateSignature,
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId, permissions, expirationTime, signature } = req.body;
      const patientId = req.userId!;

      // Validate expiration time is in the future
      if (expirationTime) {
        const expDate = new Date(expirationTime);
        if (expDate <= new Date()) {
          res.status(400).json({
            error: {
              code: 'INVALID_EXPIRATION_TIME',
              message: 'Expiration time must be in the future',
              timestamp: new Date(),
              requestId: req.headers['x-request-id']
            }
          });
          return;
        }
      }

      // Grant consent
      const consentToken = await consentService.grantConsent({
        patientId,
        providerId,
        permissions: permissions as ConsentPermission[],
        expirationTime,
        patientSignature: signature
      });

      logger.info('Consent granted successfully', {
        patientId,
        providerId,
        tokenId: consentToken.tokenId,
        requestId: req.headers['x-request-id']
      });

      res.status(201).json({
        success: true,
        consentToken: {
          tokenId: consentToken.tokenId,
          providerId: consentToken.providerId,
          permissions: consentToken.permissions,
          expirationTime: consentToken.expirationTime,
          createdAt: consentToken.createdAt
        },
        message: 'Consent granted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Consent granting failed:', error);
      res.status(500).json({
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
 * Revoke existing consent
 * POST /api/consent/revoke
 */
router.post('/revoke',
  authenticateToken,
  authorizeRoles('patient'),
  authRateLimit,
  [
    body('consentTokenId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Consent token ID is required'),
    validateSignature,
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { consentTokenId, signature } = req.body;
      const patientId = req.userId!;

      // Verify the consent token belongs to the patient
      const consentToken = await consentService.getConsentToken(consentTokenId);
      if (consentToken.patientId !== patientId) {
        res.status(403).json({
          error: {
            code: 'CONSENT_ACCESS_DENIED',
            message: 'You can only revoke your own consent tokens',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Revoke consent
      const result = await consentService.revokeConsent({
        consentTokenId,
        patientSignature: signature
      });

      logger.info('Consent revoked successfully', {
        patientId,
        consentTokenId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: result.success,
        message: result.message,
        consentTokenId,
        revokedAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Consent revocation failed:', error);
      res.status(500).json({
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
 * Validate access permissions
 * POST /api/consent/validate-access
 */
router.post('/validate-access',
  authenticateToken,
  authorizeRoles('doctor', 'laboratory', 'insurer'),
  [
    body('patientId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Patient ID must be alphanumeric with underscores or hyphens'),
    body('resourceType')
      .isIn(['diagnosis', 'prescription', 'lab_result', 'imaging', 'consultation_note'])
      .withMessage('Invalid resource type'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, resourceType } = req.body;
      const providerId = req.userId!;

      // Validate access
      const validationResult = await consentService.validateAccess({
        providerId,
        patientId,
        resourceType
      });

      logger.info('Access validation completed', {
        providerId,
        patientId,
        resourceType,
        accessGranted: validationResult.accessGranted,
        requestId: req.headers['x-request-id']
      });

      res.json({
        accessGranted: validationResult.accessGranted,
        patientId: validationResult.patientId,
        providerId: validationResult.providerId,
        resourceType: validationResult.resourceType,
        consentTokenId: validationResult.consentTokenId,
        permissions: validationResult.permissions,
        message: validationResult.message,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Access validation failed:', error);
      res.status(500).json({
        error: {
          code: 'ACCESS_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate access',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get consent token details
 * GET /api/consent/token/:tokenId
 */
router.get('/token/:tokenId',
  authenticateToken,
  [
    param('tokenId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Token ID is required'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tokenId } = req.params;
      const userId = req.userId!;
      const userRole = req.user!.role;

      // Get consent token
      const consentToken = await consentService.getConsentToken(tokenId);

      // Check if user has permission to view this consent token
      const canView = userRole === 'system_admin' || 
                     userId === consentToken.patientId || 
                     userId === consentToken.providerId;

      if (!canView) {
        res.status(403).json({
          error: {
            code: 'CONSENT_ACCESS_DENIED',
            message: 'You do not have permission to view this consent token',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      logger.info('Consent token retrieved', {
        tokenId,
        requestedBy: userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        consentToken: {
          tokenId: consentToken.tokenId,
          patientId: consentToken.patientId,
          providerId: consentToken.providerId,
          permissions: consentToken.permissions,
          expirationTime: consentToken.expirationTime,
          isActive: consentToken.isActive,
          createdAt: consentToken.createdAt,
          revokedAt: consentToken.revokedAt
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get consent token:', error);
      res.status(500).json({
        error: {
          code: 'CONSENT_TOKEN_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve consent token',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get patient's consent tokens
 * GET /api/consent/patient/:patientId
 */
router.get('/patient/:patientId',
  authenticateToken,
  [
    param('patientId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Patient ID must be alphanumeric with underscores or hyphens'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const userId = req.userId!;
      const userRole = req.user!.role;

      // Check if user has permission to view patient's consents
      const canView = userRole === 'system_admin' || userId === patientId;

      if (!canView) {
        res.status(403).json({
          error: {
            code: 'CONSENT_ACCESS_DENIED',
            message: 'You do not have permission to view this patient\'s consent tokens',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Get patient consents
      const consents = await consentService.getPatientConsents(patientId);

      logger.info('Patient consents retrieved', {
        patientId,
        consentCount: consents.length,
        requestedBy: userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        patientId,
        consents: consents.map(consent => ({
          tokenId: consent.tokenId,
          providerId: consent.providerId,
          permissions: consent.permissions,
          expirationTime: consent.expirationTime,
          isActive: consent.isActive,
          createdAt: consent.createdAt,
          revokedAt: consent.revokedAt
        })),
        totalCount: consents.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get patient consents:', error);
      res.status(500).json({
        error: {
          code: 'PATIENT_CONSENTS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve patient consents',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get provider's consent tokens
 * GET /api/consent/provider/:providerId
 */
router.get('/provider/:providerId',
  authenticateToken,
  [
    param('providerId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Provider ID must be alphanumeric with underscores or hyphens'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const userId = req.userId!;
      const userRole = req.user!.role;

      // Check if user has permission to view provider's consents
      const canView = userRole === 'system_admin' || userId === providerId;

      if (!canView) {
        res.status(403).json({
          error: {
            code: 'CONSENT_ACCESS_DENIED',
            message: 'You do not have permission to view this provider\'s consent tokens',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Get provider consents
      const consents = await consentService.getProviderConsents(providerId);

      logger.info('Provider consents retrieved', {
        providerId,
        consentCount: consents.length,
        requestedBy: userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        providerId,
        consents: consents.map(consent => ({
          tokenId: consent.tokenId,
          patientId: consent.patientId,
          permissions: consent.permissions,
          expirationTime: consent.expirationTime,
          isActive: consent.isActive,
          createdAt: consent.createdAt,
          revokedAt: consent.revokedAt
        })),
        totalCount: consents.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get provider consents:', error);
      res.status(500).json({
        error: {
          code: 'PROVIDER_CONSENTS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve provider consents',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get consent status summary for a patient-provider pair
 * GET /api/consent/status
 */
router.get('/status',
  authenticateToken,
  [
    query('patientId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Patient ID must be alphanumeric with underscores or hyphens'),
    query('providerId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Provider ID must be alphanumeric with underscores or hyphens'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, providerId } = req.query as { patientId: string; providerId: string };
      const userId = req.userId!;
      const userRole = req.user!.role;

      // Check if user has permission to view consent status
      const canView = userRole === 'system_admin' || 
                     userId === patientId || 
                     userId === providerId;

      if (!canView) {
        res.status(403).json({
          error: {
            code: 'CONSENT_ACCESS_DENIED',
            message: 'You do not have permission to view this consent status',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Get patient consents and filter for this provider
      const allConsents = await consentService.getPatientConsents(patientId);
      const providerConsents = allConsents.filter(consent => consent.providerId === providerId);

      // Categorize consents
      const activeConsents = providerConsents.filter(consent => consent.isActive);
      const revokedConsents = providerConsents.filter(consent => !consent.isActive);

      // Get unique resource types with permissions
      const resourcePermissions: Record<string, string[]> = {};
      activeConsents.forEach(consent => {
        consent.permissions.forEach(permission => {
          if (!resourcePermissions[permission.resourceType]) {
            resourcePermissions[permission.resourceType] = [];
          }
          if (!resourcePermissions[permission.resourceType].includes(permission.accessLevel)) {
            resourcePermissions[permission.resourceType].push(permission.accessLevel);
          }
        });
      });

      logger.info('Consent status retrieved', {
        patientId,
        providerId,
        activeConsents: activeConsents.length,
        revokedConsents: revokedConsents.length,
        requestId: req.headers['x-request-id']
      });

      res.json({
        patientId,
        providerId,
        summary: {
          totalConsents: providerConsents.length,
          activeConsents: activeConsents.length,
          revokedConsents: revokedConsents.length,
          resourcePermissions
        },
        activeConsents: activeConsents.map(consent => ({
          tokenId: consent.tokenId,
          permissions: consent.permissions,
          expirationTime: consent.expirationTime,
          createdAt: consent.createdAt
        })),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get consent status:', error);
      res.status(500).json({
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
 * Clear consent cache (admin only)
 * POST /api/consent/cache/clear
 */
router.post('/cache/clear',
  authenticateToken,
  authorizeRoles('system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      consentService.clearCache();

      logger.info('Consent cache cleared', {
        requestedBy: req.userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        message: 'Consent cache cleared successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to clear consent cache:', error);
      res.status(500).json({
        error: {
          code: 'CACHE_CLEAR_ERROR',
          message: 'Failed to clear consent cache',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get consent cache statistics (admin only)
 * GET /api/consent/cache/stats
 */
router.get('/cache/stats',
  authenticateToken,
  authorizeRoles('system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = consentService.getCacheStats();

      res.json({
        cacheStats: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get consent cache stats:', error);
      res.status(500).json({
        error: {
          code: 'CACHE_STATS_ERROR',
          message: 'Failed to retrieve consent cache statistics',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

export default router;