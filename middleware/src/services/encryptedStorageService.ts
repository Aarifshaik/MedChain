/**
 * Encrypted File Storage Service
 * Handles encrypted file operations with IPFS integration and access control
 */

import crypto from 'crypto';
import { ipfsService } from './ipfsService.js';
import { logger } from '../utils/logger.js';
import type {
  EncryptedFileUploadRequest,
  EncryptedFileUploadResponse,
  EncryptedFileDownloadRequest,
  EncryptedFileDownloadResponse,
  FileAccessValidation,
  StorageAuditEntry,
  StorageServiceError
} from '../types/storage.js';
import type { FileMetadata } from '../types/ipfs.js';

export class EncryptedStorageService {
  private auditEntries: StorageAuditEntry[] = [];

  /**
   * Upload encrypted file to IPFS with verification
   */
  async uploadEncryptedFile(
    request: EncryptedFileUploadRequest,
    userIp?: string,
    userAgent?: string
  ): Promise<EncryptedFileUploadResponse> {
    try {
      logger.info(`Starting encrypted file upload: ${request.metadata.filename} by ${request.metadata.providerId}`);

      // Verify encryption integrity
      await this.verifyEncryptionIntegrity(request);

      // Prepare IPFS metadata
      const ipfsMetadata: FileMetadata = {
        filename: request.metadata.filename,
        mimeType: request.metadata.mimeType,
        size: request.encryptedData.length,
        uploadedAt: new Date(),
        uploadedBy: request.metadata.providerId,
        description: request.metadata.description,
        metadata: {
          originalSize: request.metadata.originalSize,
          patientId: request.metadata.patientId,
          recordType: request.metadata.recordType,
          encryptionAlgorithm: request.encryptionInfo.algorithm,
          originalFileHash: request.encryptionInfo.originalFileHash
        }
      };

      // Upload to IPFS
      const uploadResult = await ipfsService.uploadFile(request.encryptedData, ipfsMetadata);

      // Generate transaction ID
      const transactionId = this.generateTransactionId();

      // Create audit entry
      await this.createAuditEntry({
        eventType: 'upload',
        userId: request.metadata.providerId,
        cid: uploadResult.cid,
        patientId: request.metadata.patientId,
        details: {
          filename: request.metadata.filename,
          originalSize: request.metadata.originalSize,
          encryptedSize: uploadResult.size,
          recordType: request.metadata.recordType,
          transactionId
        },
        ipAddress: userIp,
        userAgent
      });

      const response: EncryptedFileUploadResponse = {
        cid: uploadResult.cid,
        uploadedAt: uploadResult.timestamp,
        encryptedSize: uploadResult.size,
        pinned: uploadResult.pinned,
        transactionId
      };

      logger.info(`Encrypted file upload completed: CID ${uploadResult.cid}, Transaction ${transactionId}`);
      return response;

    } catch (error) {
      logger.error(`Failed to upload encrypted file: ${request.metadata.filename}`, error);
      
      // Create audit entry for failed upload
      await this.createAuditEntry({
        eventType: 'upload',
        userId: request.metadata.providerId,
        patientId: request.metadata.patientId,
        details: {
          filename: request.metadata.filename,
          error: (error as Error).message,
          success: false
        },
        ipAddress: userIp,
        userAgent
      });

      throw this.createStorageError('UPLOAD_FAILED', 'Failed to upload encrypted file', 500, error);
    }
  }

  /**
   * Download encrypted file with access validation
   */
  async downloadEncryptedFile(
    request: EncryptedFileDownloadRequest,
    userIp?: string,
    userAgent?: string
  ): Promise<EncryptedFileDownloadResponse> {
    try {
      logger.info(`Starting encrypted file download: CID ${request.cid} by ${request.requesterId}`);

      // Validate access permissions
      const accessValidation = await this.validateFileAccess(request);
      
      if (!accessValidation.granted) {
        // Create audit entry for denied access
        await this.createAuditEntry({
          eventType: 'access_denied',
          userId: request.requesterId,
          cid: request.cid,
          patientId: request.patientId,
          details: {
            reason: accessValidation.reason,
            accessReason: request.accessReason
          },
          ipAddress: userIp,
          userAgent
        });

        throw this.createStorageError('ACCESS_DENIED', accessValidation.reason, 403);
      }

      // Download file from IPFS
      const downloadResult = await ipfsService.downloadFile(request.cid);

      // Get file stats for metadata
      const fileStats = await ipfsService.getFileStats(request.cid);

      // Generate transaction ID
      const transactionId = this.generateTransactionId();

      // Create audit entry for successful download
      await this.createAuditEntry({
        eventType: 'download',
        userId: request.requesterId,
        cid: request.cid,
        patientId: request.patientId,
        details: {
          fileSize: downloadResult.size,
          accessReason: request.accessReason,
          consentTokenId: accessValidation.consentTokenId,
          transactionId
        },
        ipAddress: userIp,
        userAgent
      });

      const response: EncryptedFileDownloadResponse = {
        encryptedData: downloadResult.data,
        metadata: {
          filename: 'encrypted_file', // Actual filename would come from blockchain metadata
          mimeType: 'application/octet-stream',
          originalSize: 0, // Would come from blockchain metadata
          encryptedSize: downloadResult.size,
          uploadedAt: new Date(), // Would come from blockchain metadata
          uploadedBy: 'unknown' // Would come from blockchain metadata
        },
        accessedAt: new Date(),
        transactionId
      };

      logger.info(`Encrypted file download completed: CID ${request.cid}, Transaction ${transactionId}`);
      return response;

    } catch (error) {
      const storageError = error as StorageServiceError;
      if (storageError.code === 'ACCESS_DENIED') {
        throw error; // Re-throw access denied errors
      }

      logger.error(`Failed to download encrypted file: CID ${request.cid}`, error);
      
      // Create audit entry for failed download
      await this.createAuditEntry({
        eventType: 'download',
        userId: request.requesterId,
        cid: request.cid,
        patientId: request.patientId,
        details: {
          error: (error as Error).message,
          success: false,
          accessReason: request.accessReason
        },
        ipAddress: userIp,
        userAgent
      });

      throw this.createStorageError('DOWNLOAD_FAILED', 'Failed to download encrypted file', 500, error);
    }
  }

  /**
   * Verify file exists and get basic info
   */
  async verifyFileExists(cid: string): Promise<boolean> {
    try {
      return await ipfsService.fileExists(cid);
    } catch (error) {
      logger.error(`Failed to verify file existence: CID ${cid}`, error);
      return false;
    }
  }

  /**
   * Get file statistics
   */
  async getFileInfo(cid: string): Promise<{ size: number; type: string } | null> {
    try {
      if (!(await this.verifyFileExists(cid))) {
        return null;
      }
      return await ipfsService.getFileStats(cid);
    } catch (error) {
      logger.error(`Failed to get file info: CID ${cid}`, error);
      return null;
    }
  }

  /**
   * Pin file for persistence
   */
  async pinFile(cid: string, userId: string): Promise<boolean> {
    try {
      const pinResult = await ipfsService.pinFile(cid);
      
      // Create audit entry
      await this.createAuditEntry({
        eventType: 'pin',
        userId,
        cid,
        details: {
          pinned: pinResult.pinned,
          timestamp: pinResult.timestamp
        }
      });

      return pinResult.pinned;
    } catch (error) {
      logger.error(`Failed to pin file: CID ${cid}`, error);
      return false;
    }
  }

  /**
   * Unpin file to free storage
   */
  async unpinFile(cid: string, userId: string): Promise<boolean> {
    try {
      const unpinned = await ipfsService.unpinFile(cid);
      
      // Create audit entry
      await this.createAuditEntry({
        eventType: 'unpin',
        userId,
        cid,
        details: {
          unpinned
        }
      });

      return unpinned;
    } catch (error) {
      logger.error(`Failed to unpin file: CID ${cid}`, error);
      return false;
    }
  }

  /**
   * Get audit trail for storage operations
   */
  async getAuditTrail(filters?: {
    userId?: string;
    cid?: string;
    patientId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<StorageAuditEntry[]> {
    let filteredEntries = [...this.auditEntries];

    if (filters) {
      if (filters.userId) {
        filteredEntries = filteredEntries.filter(entry => entry.userId === filters.userId);
      }
      if (filters.cid) {
        filteredEntries = filteredEntries.filter(entry => entry.cid === filters.cid);
      }
      if (filters.patientId) {
        filteredEntries = filteredEntries.filter(entry => entry.patientId === filters.patientId);
      }
      if (filters.eventType) {
        filteredEntries = filteredEntries.filter(entry => entry.eventType === filters.eventType);
      }
      if (filters.startDate) {
        filteredEntries = filteredEntries.filter(entry => entry.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredEntries = filteredEntries.filter(entry => entry.timestamp <= filters.endDate!);
      }
    }

    return filteredEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Verify encryption integrity
   */
  private async verifyEncryptionIntegrity(request: EncryptedFileUploadRequest): Promise<void> {
    // In a real implementation, this would verify:
    // 1. The encrypted data is properly formatted
    // 2. The encryption algorithm is supported
    // 3. The original file hash matches expected format
    
    if (!request.encryptedData || request.encryptedData.length === 0) {
      throw this.createStorageError('INVALID_ENCRYPTED_DATA', 'Encrypted data is empty or invalid', 400);
    }

    if (!request.encryptionInfo.originalFileHash) {
      throw this.createStorageError('MISSING_FILE_HASH', 'Original file hash is required for verification', 400);
    }

    if (!request.encryptionInfo.algorithm) {
      throw this.createStorageError('MISSING_ENCRYPTION_ALGORITHM', 'Encryption algorithm must be specified', 400);
    }

    // Verify supported encryption algorithms
    const supportedAlgorithms = ['AES-256-GCM', 'ChaCha20-Poly1305'];
    if (!supportedAlgorithms.includes(request.encryptionInfo.algorithm)) {
      throw this.createStorageError('UNSUPPORTED_ENCRYPTION', `Unsupported encryption algorithm: ${request.encryptionInfo.algorithm}`, 400);
    }

    logger.debug(`Encryption verification passed for file: ${request.metadata.filename}`);
  }

  /**
   * Validate file access permissions
   */
  private async validateFileAccess(request: EncryptedFileDownloadRequest): Promise<FileAccessValidation> {
    // In a real implementation, this would:
    // 1. Check consent tokens from blockchain
    // 2. Validate user roles and permissions
    // 3. Check if consent is still active
    // 4. Verify patient-provider relationships

    // For now, implement basic validation logic
    if (!request.requesterId) {
      return {
        granted: false,
        reason: 'Requester ID is required'
      };
    }

    // Simulate consent validation
    // In real implementation, this would query the blockchain
    const hasValidConsent = await this.checkConsentToken(request.requesterId, request.patientId);
    
    if (!hasValidConsent && request.patientId) {
      return {
        granted: false,
        reason: 'No valid consent token found for accessing patient data'
      };
    }

    return {
      granted: true,
      reason: 'Access granted based on valid permissions',
      consentTokenId: 'mock-consent-token-id', // Would come from blockchain
      permissions: ['read'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  /**
   * Check consent token validity (mock implementation)
   */
  private async checkConsentToken(requesterId: string, patientId?: string): Promise<boolean> {
    // Mock implementation - in real system this would query blockchain
    // For development, allow access for testing
    return true;
  }

  /**
   * Create audit entry
   */
  private async createAuditEntry(entry: Omit<StorageAuditEntry, 'entryId' | 'timestamp'>): Promise<void> {
    const auditEntry: StorageAuditEntry = {
      entryId: this.generateTransactionId(),
      timestamp: new Date(),
      ...entry
    };

    this.auditEntries.push(auditEntry);
    
    // In production, this would also write to blockchain or persistent storage
    logger.debug(`Audit entry created: ${auditEntry.entryId} - ${auditEntry.eventType}`);
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Create standardized storage service error
   */
  private createStorageError(code: string, message: string, statusCode: number, originalError?: any): StorageServiceError {
    const error = new Error(message) as StorageServiceError;
    error.code = code;
    error.statusCode = statusCode;
    error.details = originalError;
    return error;
  }
}

// Export singleton instance
export const encryptedStorageService = new EncryptedStorageService();