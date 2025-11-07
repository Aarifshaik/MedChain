/**
 * Storage API Routes
 * Handles encrypted file upload and download operations
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import { body, param, query, validationResult } from 'express-validator';
import { encryptedStorageService } from '../services/encryptedStorageService.js';
import { logger } from '../utils/logger.js';
import { runStorageSystemTests, generateTestData } from '../utils/storageTestUtils.js';
import type { 
  EncryptedFileUploadRequest, 
  EncryptedFileDownloadRequest,
  StorageServiceError
} from '../types/storage.js';

const router = express.Router();

// Configure multer for file uploads (in-memory storage for encrypted files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types since files are already encrypted
    cb(null, true);
  }
});

/**
 * Upload encrypted file
 * POST /api/storage/upload
 */
router.post('/upload',
  upload.single('encryptedFile'),
  [
    body('metadata.filename').notEmpty().withMessage('Filename is required'),
    body('metadata.mimeType').notEmpty().withMessage('MIME type is required'),
    body('metadata.originalSize').isInt({ min: 1 }).withMessage('Original size must be a positive integer'),
    body('metadata.providerId').notEmpty().withMessage('Provider ID is required'),
    body('encryptionInfo.originalFileHash').notEmpty().withMessage('Original file hash is required'),
    body('encryptionInfo.algorithm').isIn(['AES-256-GCM', 'ChaCha20-Poly1305']).withMessage('Invalid encryption algorithm'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          }
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No encrypted file was uploaded'
          }
        });
      }

      // Parse metadata and encryption info from request body
      const metadata = JSON.parse(req.body.metadata || '{}');
      const encryptionInfo = JSON.parse(req.body.encryptionInfo || '{}');

      // Create upload request
      const uploadRequest: EncryptedFileUploadRequest = {
        encryptedData: req.file.buffer,
        metadata: {
          filename: metadata.filename,
          mimeType: metadata.mimeType,
          originalSize: parseInt(metadata.originalSize),
          description: metadata.description,
          patientId: metadata.patientId,
          providerId: metadata.providerId,
          recordType: metadata.recordType
        },
        encryptionInfo: {
          originalFileHash: encryptionInfo.originalFileHash,
          algorithm: encryptionInfo.algorithm,
          keyDerivation: encryptionInfo.keyDerivation
        }
      };

      // Upload file
      const result = await encryptedStorageService.uploadEncryptedFile(
        uploadRequest,
        req.ip,
        req.get('User-Agent')
      );

      logger.info(`File upload successful: ${result.cid}`);

      return res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('File upload failed:', error);

      const storageError = error as StorageServiceError;
      const statusCode = storageError.statusCode || 500;
      return res.status(statusCode).json({
        error: {
          code: storageError.code || 'UPLOAD_ERROR',
          message: storageError.message || 'Failed to upload file',
          details: storageError.details
        }
      });
    }
  }
);

/**
 * Download encrypted file
 * GET /api/storage/download/:cid
 */
router.get('/download/:cid',
  [
    param('cid').notEmpty().withMessage('CID is required'),
    query('requesterId').notEmpty().withMessage('Requester ID is required'),
    query('patientId').optional(),
    query('accessReason').optional()
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      // Create download request
      const downloadRequest: EncryptedFileDownloadRequest = {
        cid: req.params.cid,
        requesterId: req.query.requesterId as string,
        patientId: req.query.patientId as string,
        accessReason: req.query.accessReason as string
      };

      // Download file
      const result = await encryptedStorageService.downloadEncryptedFile(
        downloadRequest,
        req.ip,
        req.get('User-Agent')
      );

      logger.info(`File download successful: ${req.params.cid}`);

      // Set appropriate headers
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Length': result.encryptedData.length.toString(),
        'Content-Disposition': `attachment; filename="encrypted_${req.params.cid}"`,
        'X-Transaction-ID': result.transactionId,
        'X-Access-Time': result.accessedAt.toISOString()
      });

      return res.send(result.encryptedData);

    } catch (error) {
      logger.error('File download failed:', error);

      const storageError = error as StorageServiceError;
      const statusCode = storageError.statusCode || 500;
      return res.status(statusCode).json({
        error: {
          code: storageError.code || 'DOWNLOAD_ERROR',
          message: storageError.message || 'Failed to download file',
          details: storageError.details
        }
      });
    }
  }
);

/**
 * Check if file exists
 * GET /api/storage/exists/:cid
 */
router.get('/exists/:cid',
  [
    param('cid').notEmpty().withMessage('CID is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid CID parameter',
            details: errors.array()
          }
        });
      }

      const exists = await encryptedStorageService.verifyFileExists(req.params.cid);
      const fileInfo = exists ? await encryptedStorageService.getFileInfo(req.params.cid) : null;

      return res.json({
        success: true,
        data: {
          cid: req.params.cid,
          exists,
          fileInfo
        }
      });

    } catch (error) {
      logger.error('File existence check failed:', error);

      const err = error as Error;
      return res.status(500).json({
        error: {
          code: 'CHECK_ERROR',
          message: 'Failed to check file existence',
          details: err.message
        }
      });
    }
  }
);

/**
 * Pin file for persistence
 * POST /api/storage/pin/:cid
 */
router.post('/pin/:cid',
  [
    param('cid').notEmpty().withMessage('CID is required'),
    body('userId').notEmpty().withMessage('User ID is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          }
        });
      }

      const pinned = await encryptedStorageService.pinFile(req.params.cid, req.body.userId);

      return res.json({
        success: true,
        data: {
          cid: req.params.cid,
          pinned,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('File pinning failed:', error);

      const err = error as Error;
      return res.status(500).json({
        error: {
          code: 'PIN_ERROR',
          message: 'Failed to pin file',
          details: err.message
        }
      });
    }
  }
);

/**
 * Unpin file
 * DELETE /api/storage/pin/:cid
 */
router.delete('/pin/:cid',
  [
    param('cid').notEmpty().withMessage('CID is required'),
    body('userId').notEmpty().withMessage('User ID is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          }
        });
      }

      const unpinned = await encryptedStorageService.unpinFile(req.params.cid, req.body.userId);

      return res.json({
        success: true,
        data: {
          cid: req.params.cid,
          unpinned,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('File unpinning failed:', error);

      const err = error as Error;
      return res.status(500).json({
        error: {
          code: 'UNPIN_ERROR',
          message: 'Failed to unpin file',
          details: err.message
        }
      });
    }
  }
);

/**
 * Get storage audit trail
 * GET /api/storage/audit
 */
router.get('/audit',
  [
    query('userId').optional(),
    query('cid').optional(),
    query('patientId').optional(),
    query('eventType').optional().isIn(['upload', 'download', 'access_denied', 'pin', 'unpin']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const filters: any = {};
      if (req.query.userId) filters.userId = req.query.userId;
      if (req.query.cid) filters.cid = req.query.cid;
      if (req.query.patientId) filters.patientId = req.query.patientId;
      if (req.query.eventType) filters.eventType = req.query.eventType;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      const auditTrail = await encryptedStorageService.getAuditTrail(filters);

      return res.json({
        success: true,
        data: {
          entries: auditTrail,
          count: auditTrail.length,
          filters
        }
      });

    } catch (error) {
      logger.error('Audit trail retrieval failed:', error);

      const err = error as Error;
      return res.status(500).json({
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to retrieve audit trail',
          details: err.message
        }
      });
    }
  }
);

/**
 * Test storage system functionality (development only)
 * POST /api/storage/test
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: {
          code: 'NOT_ALLOWED',
          message: 'Test endpoints are not available in production'
        }
      });
    }

    logger.info('Running storage system tests...');
    const testsPassed = await runStorageSystemTests();

    return res.json({
      success: testsPassed,
      message: testsPassed ? 'All storage tests passed' : 'Some storage tests failed',
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Storage system test failed:', error);
    const err = error as Error;
    return res.status(500).json({
      error: {
        code: 'TEST_ERROR',
        message: 'Storage system test failed',
        details: err.message
      }
    });
  }
});

/**
 * Generate test data (development only)
 * POST /api/storage/generate-test-data
 */
router.post('/generate-test-data', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: {
          code: 'NOT_ALLOWED',
          message: 'Test endpoints are not available in production'
        }
      });
    }

    logger.info('Generating test data...');
    await generateTestData();

    return res.json({
      success: true,
      message: 'Test data generated successfully',
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Test data generation failed:', error);
    const err = error as Error;
    return res.status(500).json({
      error: {
        code: 'GENERATION_ERROR',
        message: 'Test data generation failed',
        details: err.message
      }
    });
  }
});

export { router as default };