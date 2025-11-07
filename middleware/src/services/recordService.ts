import { logger } from '../utils/logger.js';
import { blockchainManager } from '../utils/blockchainManager.js';
import { ipfsService } from './ipfsService.js';
import { FileMetadata } from '../types/ipfs.js';
import { consentService } from './consentService.js';
import { 
  MedicalRecord, 
  RecordCreateRequest, 
  RecordAccessRequest, 
  RecordAccessResult,
  RecordListItem,
  RecordQueryFilters,
  RecordUploadRequest,
  RecordUploadResult,
  RecordType
} from '../types/record.js';

export class RecordService {
  private recordCache: Map<string, MedicalRecord> = new Map();
  private cacheExpiryTime: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Setup periodic cache cleanup
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 1000); // Run every minute
  }

  /**
   * Upload encrypted medical record to IPFS and create metadata on blockchain
   */
  async uploadRecord(request: RecordUploadRequest): Promise<RecordUploadResult> {
    try {
      logger.info('Uploading medical record', {
        patientId: request.patientId,
        recordType: request.metadata.recordType,
        fileSize: request.encryptedFile.length
      });

      // Upload encrypted file to IPFS
      const fileMetadata: FileMetadata = {
        filename: request.metadata.title || 'medical-record',
        mimeType: request.metadata.mimeType || 'application/octet-stream',
        size: request.encryptedFile.length,
        uploadedAt: new Date(),
        uploadedBy: request.patientId,
        description: request.metadata.description,
        metadata: request.metadata
      };

      const ipfsResult = await ipfsService.uploadFile(request.encryptedFile, fileMetadata);
      logger.info('File uploaded to IPFS', { cid: ipfsResult.cid });

      // Generate unique record ID
      const recordId = this.generateRecordId();

      // Create record metadata on blockchain
      const createRequest: RecordCreateRequest = {
        recordId,
        patientId: request.patientId,
        ipfsHash: ipfsResult.cid,
        metadata: {
          ...request.metadata,
          fileSize: request.encryptedFile.length
        },
        providerSignature: request.providerSignature
      };

      const result = await this.createRecord(createRequest);

      logger.info('Medical record uploaded successfully', {
        recordId: result.recordId,
        ipfsHash: ipfsResult.cid
      });

      return {
        success: true,
        recordId: result.recordId,
        patientId: result.patientId,
        providerId: result.providerId,
        recordType: result.recordType,
        ipfsHash: ipfsResult.cid,
        createdAt: result.createdAt,
        message: 'Medical record uploaded successfully'
      };

    } catch (error) {
      logger.error('Failed to upload medical record:', error);
      throw new Error(`Record upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create medical record metadata on blockchain
   */
  async createRecord(request: RecordCreateRequest): Promise<RecordAccessResult> {
    try {
      logger.info('Creating medical record metadata', {
        recordId: request.recordId,
        patientId: request.patientId
      });

      // Submit transaction to blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.submitTransaction(
        'RecordContract',
        'createRecord',
        [
          request.recordId,
          request.patientId,
          request.ipfsHash,
          JSON.stringify(request.metadata),
          request.providerSignature
        ]
      );

      if (!result.isSuccessful) {
        throw new Error('Failed to create record on blockchain');
      }

      // Parse the result
      const recordData = JSON.parse(result.result);

      logger.info('Medical record metadata created successfully', {
        recordId: recordData.recordId,
        transactionId: result.transactionId
      });

      return recordData;

    } catch (error) {
      logger.error('Failed to create medical record:', error);
      throw new Error(`Record creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Access medical record with consent validation
   */
  async accessRecord(request: RecordAccessRequest): Promise<RecordAccessResult> {
    try {
      logger.info('Accessing medical record', {
        recordId: request.recordId,
        providerId: request.providerId
      });

      // Check cache first
      const cachedRecord = this.recordCache.get(request.recordId);
      if (cachedRecord && this.isCacheValid(request.recordId)) {
        // Still need to validate access and log the attempt
        await this.validateAndLogAccess(request, cachedRecord);
        return this.formatAccessResult(cachedRecord, 'Cached record access');
      }

      // Submit transaction to blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.submitTransaction(
        'RecordContract',
        'accessRecord',
        [
          request.recordId,
          request.providerId,
          request.providerSignature
        ]
      );

      if (!result.isSuccessful) {
        throw new Error('Failed to access record on blockchain');
      }

      // Parse the result
      const accessResult: RecordAccessResult = JSON.parse(result.result);

      // Cache the record for future access
      const medicalRecord: MedicalRecord = {
        recordId: accessResult.recordId,
        patientId: accessResult.patientId,
        providerId: accessResult.providerId,
        recordType: accessResult.recordType,
        ipfsHash: accessResult.ipfsHash,
        encryptionKeyHash: accessResult.encryptionKeyHash,
        metadata: accessResult.metadata,
        signature: '', // Not included in access result
        createdAt: accessResult.createdAt,
        lastAccessedAt: accessResult.lastAccessedAt,
        accessCount: accessResult.accessCount
      };

      this.cacheRecord(medicalRecord);

      logger.info('Medical record accessed successfully', {
        recordId: accessResult.recordId,
        accessReason: accessResult.accessReason,
        transactionId: result.transactionId
      });

      return accessResult;

    } catch (error) {
      logger.error('Failed to access medical record:', error);
      throw new Error(`Record access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get record metadata without IPFS hash (for listing purposes)
   */
  async getRecordMetadata(recordId: string): Promise<RecordListItem> {
    try {
      logger.info('Getting record metadata', { recordId });

      // Check cache first
      const cachedRecord = this.recordCache.get(recordId);
      if (cachedRecord && this.isCacheValid(recordId)) {
        return this.formatListItem(cachedRecord);
      }

      // Query blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.queryLedger(
        'RecordContract',
        'getRecordMetadata',
        [recordId]
      );

      const recordData = JSON.parse(result.result);
      return recordData;

    } catch (error) {
      logger.error('Failed to get record metadata:', error);
      throw new Error(`Failed to retrieve record metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all records for a patient
   */
  async getPatientRecords(patientId: string): Promise<RecordListItem[]> {
    try {
      logger.info('Getting patient records', { patientId });

      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.queryLedger(
        'RecordContract',
        'getPatientRecords',
        [patientId]
      );

      const records: RecordListItem[] = JSON.parse(result.result);

      logger.info('Retrieved patient records', {
        patientId,
        recordCount: records.length
      });

      return records;

    } catch (error) {
      logger.error('Failed to get patient records:', error);
      throw new Error(`Failed to retrieve patient records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all records created by a provider
   */
  async getProviderRecords(providerId: string): Promise<RecordListItem[]> {
    try {
      logger.info('Getting provider records', { providerId });

      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.queryLedger(
        'RecordContract',
        'getProviderRecords',
        [providerId]
      );

      const records: RecordListItem[] = JSON.parse(result.result);

      logger.info('Retrieved provider records', {
        providerId,
        recordCount: records.length
      });

      return records;

    } catch (error) {
      logger.error('Failed to get provider records:', error);
      throw new Error(`Failed to retrieve provider records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query records by type
   */
  async queryRecordsByType(recordType: RecordType, patientId?: string): Promise<RecordListItem[]> {
    try {
      logger.info('Querying records by type', { recordType, patientId });

      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.queryLedger(
        'RecordContract',
        'queryRecordsByType',
        [recordType, patientId || '']
      );

      const records: RecordListItem[] = JSON.parse(result.result);

      logger.info('Retrieved records by type', {
        recordType,
        patientId,
        recordCount: records.length
      });

      return records;

    } catch (error) {
      logger.error('Failed to query records by type:', error);
      throw new Error(`Failed to query records by type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve encrypted file from IPFS
   */
  async retrieveRecordFile(ipfsHash: string): Promise<Buffer> {
    try {
      logger.info('Retrieving record file from IPFS', { ipfsHash });

      const downloadResult = await ipfsService.downloadFile(ipfsHash);
      const fileData = downloadResult.data;

      logger.info('Record file retrieved successfully', {
        ipfsHash,
        fileSize: fileData.length
      });

      return fileData;

    } catch (error) {
      logger.error('Failed to retrieve record file:', error);
      throw new Error(`File retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate access and log the attempt (for cached records)
   */
  private async validateAndLogAccess(request: RecordAccessRequest, record: MedicalRecord): Promise<void> {
    try {
      // Check if provider is the record creator (always has access)
      if (record.providerId === request.providerId) {
        return; // Access granted
      }

      // Check consent for access
      const accessValidation = await consentService.validateAccess({
        providerId: request.providerId,
        patientId: record.patientId,
        resourceType: record.recordType
      });

      if (!accessValidation.accessGranted) {
        throw new Error(`Access denied. Provider ${request.providerId} does not have permission to access record ${request.recordId}`);
      }

    } catch (error) {
      logger.error('Access validation failed for cached record:', error);
      throw error;
    }
  }

  /**
   * Format medical record as access result
   */
  private formatAccessResult(record: MedicalRecord, accessReason: string): RecordAccessResult {
    return {
      success: true,
      recordId: record.recordId,
      patientId: record.patientId,
      providerId: record.providerId,
      recordType: record.recordType,
      ipfsHash: record.ipfsHash,
      encryptionKeyHash: record.encryptionKeyHash,
      metadata: record.metadata,
      createdAt: record.createdAt,
      lastAccessedAt: record.lastAccessedAt,
      accessCount: record.accessCount,
      accessReason,
      message: 'Record access granted'
    };
  }

  /**
   * Format medical record as list item
   */
  private formatListItem(record: MedicalRecord): RecordListItem {
    return {
      recordId: record.recordId,
      patientId: record.patientId,
      providerId: record.providerId,
      recordType: record.recordType,
      metadata: record.metadata,
      createdAt: record.createdAt,
      lastAccessedAt: record.lastAccessedAt,
      accessCount: record.accessCount
    };
  }

  /**
   * Generate unique record ID
   */
  private generateRecordId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `record-${timestamp}-${random}`;
  }

  /**
   * Cache medical record
   */
  private cacheRecord(record: MedicalRecord): void {
    this.recordCache.set(record.recordId, {
      ...record,
      cachedAt: Date.now()
    } as any);
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(recordId: string): boolean {
    const cached = this.recordCache.get(recordId) as any;
    if (!cached || !cached.cachedAt) {
      return false;
    }
    
    return (Date.now() - cached.cachedAt) < this.cacheExpiryTime;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, value] of this.recordCache.entries()) {
      const cached = value as any;
      if (cached.cachedAt && (now - cached.cachedAt) > this.cacheExpiryTime) {
        this.recordCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired record cache entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.recordCache.clear();
    logger.info('Record cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    cacheHitRate?: number;
  } {
    return {
      totalEntries: this.recordCache.size
    };
  }
}

// Export singleton instance
export const recordService = new RecordService();