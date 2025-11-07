import express, { Request, Response } from 'express';
import { query } from 'express-validator';
import { logger } from '../utils/logger.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get audit trail
 * GET /api/audit/trail
 */
router.get('/trail',
  authenticateToken,
  authorizeRoles('system_admin', 'auditor'),
  [
    query('userId')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('User ID must be alphanumeric with underscores or hyphens'),
    query('eventType')
      .optional()
      .isString()
      .withMessage('Event type must be a string'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page size must be between 1 and 1000'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, eventType, startDate, endDate, pageSize = 100 } = req.query;

      // For demo purposes, generate mock audit entries
      const mockAuditEntries = [
        {
          entryId: 'audit_001',
          eventType: 'user_registration',
          userId: 'patient_001',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          details: { role: 'patient' },
          signature: 'audit_signature_001',
          blockNumber: 100,
          transactionId: 'tx_audit_001'
        },
        {
          entryId: 'audit_002',
          eventType: 'login_attempt',
          userId: 'patient_001',
          timestamp: new Date('2024-01-01T10:05:00Z'),
          details: { success: true, ipAddress: '192.168.1.1' },
          signature: 'audit_signature_002',
          blockNumber: 101,
          transactionId: 'tx_audit_002'
        },
        {
          entryId: 'audit_003',
          eventType: 'record_created',
          userId: 'patient_001',
          resourceId: 'record_001',
          timestamp: new Date('2024-01-01T10:10:00Z'),
          details: { recordType: 'diagnosis', ipfsHash: 'QmAuditRecord' },
          signature: 'audit_signature_003',
          blockNumber: 102,
          transactionId: 'tx_audit_003'
        },
        {
          entryId: 'audit_004',
          eventType: 'consent_granted',
          userId: 'patient_001',
          resourceId: 'consent_001',
          timestamp: new Date('2024-01-01T10:15:00Z'),
          details: { providerId: 'doctor_001', permissions: ['read'] },
          signature: 'audit_signature_004',
          blockNumber: 103,
          transactionId: 'tx_audit_004'
        },
        {
          entryId: 'audit_005',
          eventType: 'record_accessed',
          userId: 'doctor_001',
          resourceId: 'record_001',
          timestamp: new Date('2024-01-01T10:20:00Z'),
          details: { accessedBy: 'doctor_001', consentTokenId: 'consent_001' },
          signature: 'audit_signature_005',
          blockNumber: 104,
          transactionId: 'tx_audit_005'
        }
      ];

      // Filter entries based on query parameters
      let filteredEntries = mockAuditEntries;

      if (userId) {
        filteredEntries = filteredEntries.filter(entry => entry.userId === userId);
      }

      if (eventType) {
        const eventTypes = eventType.toString().split(',');
        filteredEntries = filteredEntries.filter(entry => eventTypes.includes(entry.eventType));
      }

      if (startDate) {
        const start = new Date(startDate.toString());
        filteredEntries = filteredEntries.filter(entry => new Date(entry.timestamp) >= start);
      }

      if (endDate) {
        const end = new Date(endDate.toString());
        filteredEntries = filteredEntries.filter(entry => new Date(entry.timestamp) <= end);
      }

      // Apply pagination
      const limit = parseInt(pageSize.toString());
      const paginatedEntries = filteredEntries.slice(0, limit);

      logger.info('Audit trail retrieved', {
        totalEntries: filteredEntries.length,
        returnedEntries: paginatedEntries.length,
        filters: { userId, eventType, startDate, endDate },
        requestedBy: req.userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: {
          entries: paginatedEntries,
          totalEntries: filteredEntries.length,
          hasMore: filteredEntries.length > limit
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to retrieve audit trail:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_TRAIL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve audit trail',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Generate compliance report
 * GET /api/audit/compliance-report
 */
router.get('/compliance-report',
  authenticateToken,
  authorizeRoles('system_admin', 'auditor'),
  [
    query('reportType')
      .isIn(['daily', 'weekly', 'monthly', 'yearly'])
      .withMessage('Report type must be daily, weekly, monthly, or yearly'),
    query('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('includeRecommendations')
      .optional()
      .isBoolean()
      .withMessage('Include recommendations must be a boolean'),
    handleValidationErrors
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reportType, startDate, endDate, includeRecommendations = false } = req.query;

      // For demo purposes, generate mock compliance report
      const mockReport = {
        reportId: `compliance_report_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        reportPeriod: {
          startDate: startDate?.toString() || '',
          endDate: endDate?.toString() || ''
        },
        metrics: {
          totalUsers: 150,
          totalRecords: 1250,
          totalConsents: 890,
          accessAttempts: {
            successful: 2340,
            failed: 45,
            total: 2385
          },
          failedLogins: 23,
          dataBreachIncidents: 0,
          auditTrailIntegrity: {
            verified: true,
            totalEntries: 5670,
            corruptedEntries: 0,
            lastVerificationDate: new Date().toISOString()
          },
          consentCompliance: {
            activeConsents: 890,
            expiredConsents: 156,
            revokedConsents: 78,
            complianceRate: 98.5
          },
          userActivity: {
            patients: { registrations: 85, logins: 1240 },
            doctors: { registrations: 35, logins: 680 },
            laboratories: { registrations: 15, logins: 230 },
            insurers: { registrations: 10, logins: 145 },
            auditors: { registrations: 5, logins: 50 }
          },
          recordActivity: {
            uploads: 1250,
            accesses: 2340,
            modifications: 45,
            deletions: 0
          },
          securityMetrics: {
            encryptionCompliance: 100,
            signatureVerificationRate: 99.8,
            unauthorizedAccessAttempts: 12,
            blockedRequests: 67
          }
        }
      };

      if (includeRecommendations === 'true') {
        (mockReport as any).recommendations = [
          'Review failed login attempts for potential security threats',
          'Monitor consent expiration dates for proactive renewal',
          'Investigate unauthorized access attempts'
        ];
      }

      logger.info('Compliance report generated', {
        reportType,
        reportPeriod: { startDate, endDate },
        requestedBy: req.userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: mockReport,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'COMPLIANCE_REPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate compliance report',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

/**
 * Verify audit trail integrity
 * GET /api/audit/verify-integrity
 */
router.get('/verify-integrity',
  authenticateToken,
  authorizeRoles('system_admin', 'auditor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // For demo purposes, simulate integrity verification
      const mockIntegrityResult = {
        verified: true,
        totalEntries: 1000,
        verifiedEntries: 1000,
        corruptedEntries: 0,
        integrityHash: 'sha256_integrity_hash_12345',
        lastVerificationDate: new Date().toISOString(),
        blockchainConsistency: {
          verified: true,
          lastBlockNumber: 500,
          hashChainValid: true
        },
        signatureVerification: {
          totalSignatures: 1000,
          validSignatures: 1000,
          invalidSignatures: 0
        }
      };

      logger.info('Audit trail integrity verified', {
        verified: mockIntegrityResult.verified,
        totalEntries: mockIntegrityResult.totalEntries,
        corruptedEntries: mockIntegrityResult.corruptedEntries,
        requestedBy: req.userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: mockIntegrityResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to verify audit trail integrity:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTEGRITY_VERIFICATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to verify audit trail integrity',
          timestamp: new Date(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
);

export default router;