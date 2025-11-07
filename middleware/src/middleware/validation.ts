import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors: ValidationError[] = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    logger.warn('Validation failed', {
      requestId: req.headers['x-request-id'],
      url: req.url,
      method: req.method,
      errors: validationErrors
    });

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { validationErrors },
        timestamp: new Date(),
        requestId: req.headers['x-request-id']
      }
    });
    return;
  }
  
  next();
};

// Common validation rules
export const validateUserId = param('userId')
  .isString()
  .isLength({ min: 1, max: 100 })
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('User ID must be alphanumeric with underscores or hyphens');

export const validateRecordId = param('recordId')
  .isString()
  .isLength({ min: 1, max: 100 })
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Record ID must be alphanumeric with underscores or hyphens');

export const validateConsentTokenId = param('consentTokenId')
  .isString()
  .isLength({ min: 1, max: 100 })
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Consent token ID must be alphanumeric with underscores or hyphens');

export const validateSignature = body('signature')
  .isString()
  .isLength({ min: 1 })
  .withMessage('Signature is required and must be a non-empty string');

export const validatePublicKey = body('publicKey')
  .isString()
  .isLength({ min: 1 })
  .withMessage('Public key is required and must be a non-empty string');

export const validateUserRole = body('role')
  .isIn(['patient', 'doctor', 'laboratory', 'insurer', 'auditor', 'system_admin'])
  .withMessage('Role must be one of: patient, doctor, laboratory, insurer, auditor, system_admin');

export const validateRecordType = body('recordType')
  .isIn(['diagnosis', 'prescription', 'lab_result', 'imaging', 'consultation_note'])
  .withMessage('Record type must be one of: diagnosis, prescription, lab_result, imaging, consultation_note');

export const validateIPFSHash = body('ipfsHash')
  .isString()
  .matches(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/)
  .withMessage('IPFS hash must be a valid CID');

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Remove any potential XSS attempts from string fields
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};