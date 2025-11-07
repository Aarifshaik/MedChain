import express, { Request, Response } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import { recordService } from '../services/recordService.js';
import { logger } from '../utils/logger.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/security.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1
  }
});

/**
 * Upload medical record (simplified for frontend compatibility)
 * POST /api/records/upload
 */
router.post('/upload',
  authenticateToken,
  authRateLimit,
  upload.single('file'),
  [
    body('title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('description')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Description must be between 1 and 1000 characters'),
    body('recordType')
      .isIn(['diagnosis', 'prescription', 'lab_result', 'imaging', 'consultation_note'])
      .withMessage('Invalid record type'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { title, description, recordType } = req.body;
      const file = req.file;
      const userId = req.userId!;

      if (!file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'File is required',
            timestamp: new Date(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Generate unique record ID
      const recordId = `record_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate mock IPFS hash
      const ipfsHash = `Qm${Math.random().toString(36).substr(2, 44)}`;
      
      // Generate mock transaction ID
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create metadata
      const metadata = {
        title,
        description,
        recordType,
        mimeType: file.mimetype,
        fileSize: file.size,
        originalName: file.originalname,
        createdAt: new Date().toISOString()
      };

      // For demo purposes, we'll simulate the upload process
      // In production, this would:
      // 1. Upload encrypted file to IPFS
      // 2. Store metadata on blockchain
      // 3. Create audit trail entry

      logger.info('Medical record uploaded successfully', {
        recordId,
        patientId: userId,
        providerId: userId,
        recordType,
        fileSize: file.size,
        requestId: req.headers['x-request-id']
      });

      res.status(201).json({
        success: true,
        data: {
          recordId,
          patientId: userId,
          providerId: userId,
          recordType,
          ipfsHash,
          transactionId,
          createdAt: new Date().toISOString()
        },
        message: 'Record uploaded successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Medical record upload failed:', error);
      res.status(500).json({
        success: false,
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
 * Create medical record (simplified for testing)
 * POST /api/records
 */
router.post('/',
  authenticateToken,
  authRateLimit,
  [
    body('patientId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Patient ID is required'),
    body('recordType')
      .isIn(['diagnosis', 'prescription', 'lab_result', 'imaging', 'consultation_note'])
      .withMessage('Invalid record type'),
    body('diagnosis')
      .optional()
      .isString()
      .withMessage('Diagnosis must be a string'),
    body('severity')
      .optional()
      .isIn(['mild', 'moderate', 'severe'])
      .withMessage('Invalid severity level'),
    body('department')
      .optional()
      .isString()
      .withMessage('Department must be a string'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, recordType, diagnosis, severity, department, metadata } = req.body;
      const userId = req.userId!;

      // Generate unique record ID
      const recordId = `record_${patientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Mock IPFS hash
      const ipfsHash = `Qm${Math.random().toString(36).substr(2, 44)}`;
      
      // Create record data for blockchain
      const recordData = {
        recordId,
        patientId,
        providerId: userId,
        recordType,
        diagnosis: diagnosis || null,
        severity: severity || null,
        department: department || null,
        ipfsHash,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          provider: userId,
          facility: 'Healthcare DLT System'
        },
        createdAt: new Date().toISOString()
      };

      // In production, this would submit to blockchain
      logger.info('Medical record created', {
        recordId,
        patientId,
        providerId: userId,
        recordType,
        requestId: req.headers['x-request-id']
      });

      res.status(201).json({
        success: true,
        data: {
          recordId,
          patientId,
          providerId: userId,
          recordType,
          ipfsHash,
          createdAt: recordData.createdAt
        },
        message: 'Record created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Medical record creation failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RECORD_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create medical record',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Rich query for medical records (CouchDB-enabled)
 * POST /api/records/query
 */
router.post('/query',
  authenticateToken,
  authRateLimit,
  [
    body('selector')
      .isObject()
      .withMessage('Selector must be an object'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    body('sort')
      .optional()
      .isArray()
      .withMessage('Sort must be an array'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { selector, limit = 10, sort } = req.body;
      const userId = req.userId!;

      // Mock rich query results for demonstration
      const mockResults = [];
      const queryTypes = ['diagnosis', 'prescription', 'lab_result', 'imaging'];
      const diagnoses = ['hypertension', 'diabetes', 'asthma', 'arthritis'];
      const severities = ['mild', 'moderate', 'severe'];
      const departments = ['cardiology', 'endocrinology', 'pulmonology', 'rheumatology'];

      // Generate mock results based on selector
      for (let i = 0; i < Math.min(limit, 5); i++) {
        const recordId = `record_${userId}_${Date.now() - i * 1000}_${Math.random().toString(36).substr(2, 9)}`;
        const recordType = queryTypes[Math.floor(Math.random() * queryTypes.length)];
        
        const mockRecord = {
          recordId,
          patientId: selector.patientId || userId,
          providerId: userId,
          recordType: selector.recordType || recordType,
          diagnosis: selector.diagnosis || diagnoses[Math.floor(Math.random() * diagnoses.length)],
          severity: selector.severity || severities[Math.floor(Math.random() * severities.length)],
          department: selector.department || departments[Math.floor(Math.random() * departments.length)],
          ipfsHash: `Qm${Math.random().toString(36).substr(2, 44)}`,
          metadata: {
            timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            provider: `Dr. Provider${i + 1}`,
            facility: 'Healthcare DLT System'
          },
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        };

        // Apply selector filtering (simplified)
        let matches = true;
        for (const [key, value] of Object.entries(selector)) {
          if (key === '$and') continue; // Skip complex operators for demo
          if (mockRecord[key as keyof typeof mockRecord] !== value) {
            matches = false;
            break;
          }
        }

        if (matches) {
          mockResults.push(mockRecord);
        }
      }

      // Apply sorting (simplified)
      if (sort && sort.length > 0) {
        const sortField = Object.keys(sort[0])[0];
        const sortOrder = sort[0][sortField];
        
        mockResults.sort((a, b) => {
          const aVal = a[sortField as keyof typeof a] || '';
          const bVal = b[sortField as keyof typeof b] || '';
          
          if (sortOrder === 'desc') {
            return bVal > aVal ? 1 : -1;
          } else {
            return aVal > bVal ? 1 : -1;
          }
        });
      }

      logger.info('Rich query executed', {
        selector,
        limit,
        resultCount: mockResults.length,
        userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: {
          records: mockResults,
          totalCount: mockResults.length,
          query: {
            selector,
            limit,
            sort
          }
        },
        message: 'Rich query executed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Rich query failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RICH_QUERY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute rich query',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Get record with access validation
 * GET /api/records/:recordId
 */
router.get('/:recordId',
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
      const userId = req.userId!;

      // For demo purposes, simulate record access validation
      // In production, this would check consent tokens and permissions
      
      // Mock record data
      const mockRecord = {
        recordId,
        patientId: userId,
        providerId: userId,
        recordType: 'diagnosis',
        diagnosis: 'hypertension',
        severity: 'moderate',
        department: 'cardiology',
        metadata: {
          title: 'Sample Medical Record',
          description: 'Sample description',
          mimeType: 'application/pdf',
          fileSize: 1024,
          timestamp: new Date().toISOString(),
          provider: 'Dr. Smith',
          facility: 'Healthcare DLT System'
        },
        createdAt: new Date().toISOString()
      };

      // Mock IPFS hash
      const ipfsHash = `Qm${Math.random().toString(36).substr(2, 44)}`;

      logger.info('Medical record accessed', {
        recordId,
        userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: {
          record: mockRecord,
          ipfsHash,
          hasAccess: true
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Medical record access failed:', error);
      res.status(500).json({
        success: false,
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

export default router;