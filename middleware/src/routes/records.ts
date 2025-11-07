import express, { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import { recordService } from '../services/recordService.js';
import { logger } from '../utils/logger.js';
import { handleValidationErrors, validateSignature } from '../middleware/validation.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/security.js';
import { RecordType } from '../types/record.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types since files are encrypted
    cb(null, true);
  }
});

/**
 * Upload encrypted medical record
 * POST /api/records/upload
 */
router.post('/upload',
  authenticateToken,
  authorizeRoles('patient', 'doctor', 'laboratory'),
  authRateLimit,
  upload.single('file'),
  [
    body('patientId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Patient ID must be alphanumeric with underscores or hyphens'),
    body('metadata.title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('metadata.description')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Description must be between 1 and 1000 characters'),
    body('metadata.recordType')
      .isIn(['diagnosis', 'prescription', 'lab_result', 'imaging', 'consultation_note'])
      .withMessage('Invalid record type'),
    body('metadata.mimeType')
      .isString()
      .matches(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/)
      .withMessage('Invalid MIME type format'),
    body('metadata.encryptionKeyHash')
      .optional()
      .isString()
      .isLength({ min: 1, max: 128 })
      .withMessage('Encryption key hash must be between 1 and 128 characters'),
    body('metadata.tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('metadata.tags.*')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters'),
    validateSignature,
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, metadata, signature } = req.body;
      const encryptedFile = req.file;

      if (!encryptedFile) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'Encrypted file is required',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Validate file size
      if (encryptedFile.size === 0) {
        res.status(400).json({
          error: {
            code: 'EMPTY_FILE',
            message: 'File cannot be empty',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Parse metadata if it's a string
      let parsedMetadata;
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (error) {
        res.status(400).json({
          error: {
            code: 'INVALID_METADATA',
            message: 'Invalid metadata JSON format',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Upload record
      const result = await recordService.uploadRecord({
        patientId,
        encryptedFile: encryptedFile.buffer,
        metadata: parsedMetadata,
        providerSignature: signature
      });

      logger.info('Medical record uploaded successfully', {
        recordId: result.recordId,
        patientId: result.patientId,
        providerId: result.providerId,
        recordType: result.recordType,
        fileSize: encryptedFile.size,
        requestId: req.headers['x-request-id']
      });

      res.status(201).json({
        success: true,
        record: {
          recordId: result.recordId,
          patientId: result.patientId,
          providerId: result.providerId,
          recordType: result.recordType,
          ipfsHash: result.ipfsHash,
          createdAt: result.createdAt
        },
        message: result.message,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Medical record upload failed:', error);
      res.status(500).json({
        error: {
          code: 'RECORD_UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload medical record',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Access medical record with consent validation
 * POST /api/records/access
 */
router.post('/access',
  authenticateToken,
  authorizeRoles('doctor', 'laboratory', 'insurer'),
  authRateLimit,
  [
    body('recordId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Record ID is required'),
    validateSignature,
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { recordId, signature } = req.body;
      const providerId = req.userId!;

      // Access record
      const result = await recordService.accessRecord({
        recordId,
        providerId,
        providerSignature: signature
      });

      logger.info('Medical record accessed successfully', {
        recordId: result.recordId,
        patientId: result.patientId,
        providerId: result.providerId,
        accessReason: result.accessReason,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        record: {
          recordId: result.recordId,
          patientId: result.patientId,
          providerId: result.providerId,
          recordType: result.recordType,
          ipfsHash: result.ipfsHash,
          encryptionKeyHash: result.encryptionKeyHash,
          metadata: result.metadata,
          createdAt: result.createdAt,
          lastAccessedAt: result.lastAccessedAt,
          accessCount: result.accessCount,
          accessReason: result.accessReason
        },
        message: result.message,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Medical record access failed:', error);
      res.status(500).json({
        error: {
          code: 'RECORD_ACCESS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to access medical record',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get record metadata (without IPFS hash)
 * GET /api/records/:recordId/metadata
 */
router.get('/:recordId/metadata',
  authenticateToken,
  [
    param('recordId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Record ID is required'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { recordId } = req.params;

      // Get record metadata
      const record = await recordService.getRecordMetadata(recordId);

      logger.info('Record metadata retrieved', {
        recordId,
        requestedBy: req.userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        record: {
          recordId: record.recordId,
          patientId: record.patientId,
          providerId: record.providerId,
          recordType: record.recordType,
          metadata: record.metadata,
          createdAt: record.createdAt,
          lastAccessedAt: record.lastAccessedAt,
          accessCount: record.accessCount
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get record metadata:', error);
      res.status(500).json({
        error: {
          code: 'RECORD_METADATA_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve record metadata',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get all records for a patient
 * GET /api/records/patient/:patientId
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

      // Check if user has permission to view patient's records
      const canView = userRole === 'system_admin' || 
                     userId === patientId ||
                     ['doctor', 'laboratory', 'insurer'].includes(userRole);

      if (!canView) {
        res.status(403).json({
          error: {
            code: 'RECORD_ACCESS_DENIED',
            message: 'You do not have permission to view this patient\'s records',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Get patient records
      const records = await recordService.getPatientRecords(patientId);

      logger.info('Patient records retrieved', {
        patientId,
        recordCount: records.length,
        requestedBy: userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        patientId,
        records: records.map(record => ({
          recordId: record.recordId,
          providerId: record.providerId,
          recordType: record.recordType,
          metadata: record.metadata,
          createdAt: record.createdAt,
          lastAccessedAt: record.lastAccessedAt,
          accessCount: record.accessCount
        })),
        totalCount: records.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get patient records:', error);
      res.status(500).json({
        error: {
          code: 'PATIENT_RECORDS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve patient records',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get all records created by a provider
 * GET /api/records/provider/:providerId
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

      // Check if user has permission to view provider's records
      const canView = userRole === 'system_admin' || userId === providerId;

      if (!canView) {
        res.status(403).json({
          error: {
            code: 'RECORD_ACCESS_DENIED',
            message: 'You do not have permission to view this provider\'s records',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Get provider records
      const records = await recordService.getProviderRecords(providerId);

      logger.info('Provider records retrieved', {
        providerId,
        recordCount: records.length,
        requestedBy: userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        providerId,
        records: records.map(record => ({
          recordId: record.recordId,
          patientId: record.patientId,
          recordType: record.recordType,
          metadata: record.metadata,
          createdAt: record.createdAt,
          lastAccessedAt: record.lastAccessedAt,
          accessCount: record.accessCount
        })),
        totalCount: records.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get provider records:', error);
      res.status(500).json({
        error: {
          code: 'PROVIDER_RECORDS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve provider records',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Query records by type
 * GET /api/records/query/type/:recordType
 */
router.get('/query/type/:recordType',
  authenticateToken,
  authorizeRoles('doctor', 'laboratory', 'insurer', 'system_admin'),
  [
    param('recordType')
      .isIn(['diagnosis', 'prescription', 'lab_result', 'imaging', 'consultation_note'])
      .withMessage('Invalid record type'),
    query('patientId')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Patient ID must be alphanumeric with underscores or hyphens'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { recordType } = req.params;
      const { patientId } = req.query as { patientId?: string };
      const userId = req.userId!;
      const userRole = req.user!.role;

      // If querying for specific patient, check permissions
      if (patientId) {
        const canView = userRole === 'system_admin' || 
                       userId === patientId ||
                       ['doctor', 'laboratory', 'insurer'].includes(userRole);

        if (!canView) {
          res.status(403).json({
            error: {
              code: 'RECORD_ACCESS_DENIED',
              message: 'You do not have permission to view this patient\'s records',
              timestamp: new Date(),
              requestId: req.headers['x-request-id']
            }
          });
          return;
        }
      }

      // Query records by type
      const records = await recordService.queryRecordsByType(recordType as RecordType, patientId);

      logger.info('Records queried by type', {
        recordType,
        patientId,
        recordCount: records.length,
        requestedBy: userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        recordType,
        patientId: patientId || null,
        records: records.map(record => ({
          recordId: record.recordId,
          patientId: record.patientId,
          providerId: record.providerId,
          metadata: record.metadata,
          createdAt: record.createdAt,
          lastAccessedAt: record.lastAccessedAt,
          accessCount: record.accessCount
        })),
        totalCount: records.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to query records by type:', error);
      res.status(500).json({
        error: {
          code: 'RECORD_QUERY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to query records by type',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Download encrypted file from IPFS
 * GET /api/records/:recordId/download
 */
router.get('/:recordId/download',
  authenticateToken,
  authorizeRoles('doctor', 'laboratory', 'insurer'),
  [
    param('recordId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Record ID is required'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { recordId } = req.params;
      const providerId = req.userId!;

      // First access the record to validate permissions and get IPFS hash
      const accessResult = await recordService.accessRecord({
        recordId,
        providerId,
        providerSignature: 'download-access' // Placeholder signature for download
      });

      // Retrieve the encrypted file from IPFS
      const fileData = await recordService.retrieveRecordFile(accessResult.ipfsHash);

      logger.info('Medical record file downloaded', {
        recordId,
        patientId: accessResult.patientId,
        providerId,
        fileSize: fileData.length,
        requestId: req.headers['x-request-id']
      });

      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="record-${recordId}.encrypted"`);
      res.setHeader('Content-Length', fileData.length);

      res.send(fileData);

    } catch (error) {
      logger.error('Medical record download failed:', error);
      res.status(500).json({
        error: {
          code: 'RECORD_DOWNLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Failed to download medical record',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Clear record cache (admin only)
 * POST /api/records/cache/clear
 */
router.post('/cache/clear',
  authenticateToken,
  authorizeRoles('system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      recordService.clearCache();

      logger.info('Record cache cleared', {
        requestedBy: req.userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        message: 'Record cache cleared successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to clear record cache:', error);
      res.status(500).json({
        error: {
          code: 'CACHE_CLEAR_ERROR',
          message: 'Failed to clear record cache',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get record cache statistics (admin only)
 * GET /api/records/cache/stats
 */
router.get('/cache/stats',
  authenticateToken,
  authorizeRoles('system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = recordService.getCacheStats();

      res.json({
        cacheStats: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get record cache stats:', error);
      res.status(500).json({
        error: {
          code: 'CACHE_STATS_ERROR',
          message: 'Failed to retrieve record cache statistics',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

export default router;