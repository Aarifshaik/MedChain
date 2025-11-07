/**
 * Storage Test Utilities
 * Helper functions for testing IPFS and encrypted storage functionality
 */

import crypto from 'crypto';
import { encryptedStorageService } from '../services/encryptedStorageService.js';
import { ipfsService } from '../services/ipfsService.js';
import { logger } from './logger.js';
import type { EncryptedFileUploadRequest } from '../types/storage.js';

/**
 * Create test encrypted file data
 */
export function createTestEncryptedFile(originalContent: string = 'Test medical record content'): {
  encryptedData: Buffer;
  originalFileHash: string;
  originalSize: number;
} {
  // Simulate encryption by adding some random bytes to the original content
  const originalBuffer = Buffer.from(originalContent, 'utf8');
  const originalFileHash = crypto.createHash('sha256').update(originalBuffer).digest('hex');
  
  // Create "encrypted" data (in real implementation, this would be actual encryption)
  const encryptedData = Buffer.concat([
    Buffer.from('ENCRYPTED_HEADER_'), // Simulate encryption header
    originalBuffer,
    crypto.randomBytes(16) // Simulate encryption padding
  ]);

  return {
    encryptedData,
    originalFileHash,
    originalSize: originalBuffer.length
  };
}

/**
 * Create test upload request
 */
export function createTestUploadRequest(
  filename: string = 'test-medical-record.pdf',
  providerId: string = 'test-provider-001',
  patientId?: string
): EncryptedFileUploadRequest {
  const testFile = createTestEncryptedFile();

  return {
    encryptedData: testFile.encryptedData,
    metadata: {
      filename,
      mimeType: 'application/pdf',
      originalSize: testFile.originalSize,
      description: 'Test medical record for development',
      patientId,
      providerId,
      recordType: 'diagnosis'
    },
    encryptionInfo: {
      originalFileHash: testFile.originalFileHash,
      algorithm: 'AES-256-GCM',
      keyDerivation: 'PBKDF2-SHA256'
    }
  };
}

/**
 * Test IPFS service functionality
 */
export async function testIPFSService(): Promise<boolean> {
  try {
    logger.info('Testing IPFS service functionality...');

    // Test file upload
    const testData = Buffer.from('Test IPFS file content');
    const metadata = {
      filename: 'test-file.txt',
      mimeType: 'text/plain',
      size: testData.length,
      uploadedAt: new Date(),
      uploadedBy: 'test-user'
    };

    const uploadResult = await ipfsService.uploadFile(testData, metadata);
    logger.info(`IPFS upload test passed: CID ${uploadResult.cid}`);

    // Test file download
    const downloadResult = await ipfsService.downloadFile(uploadResult.cid);
    const downloadedContent = downloadResult.data.toString('utf8');
    
    if (downloadedContent !== 'Test IPFS file content') {
      throw new Error('Downloaded content does not match uploaded content');
    }
    logger.info('IPFS download test passed');

    // Test file existence check
    const exists = await ipfsService.fileExists(uploadResult.cid);
    if (!exists) {
      throw new Error('File existence check failed');
    }
    logger.info('IPFS file existence test passed');

    // Test file stats
    const stats = await ipfsService.getFileStats(uploadResult.cid);
    if (stats.size <= 0) {
      throw new Error('File stats size is invalid');
    }
    logger.info(`IPFS file stats test passed: size=${stats.size}, type=${stats.type}`);

    logger.info('All IPFS service tests passed successfully');
    return true;

  } catch (error) {
    logger.error('IPFS service test failed:', error);
    return false;
  }
}

/**
 * Test encrypted storage service functionality
 */
export async function testEncryptedStorageService(): Promise<boolean> {
  try {
    logger.info('Testing encrypted storage service functionality...');

    // Test file upload
    const uploadRequest = createTestUploadRequest('test-record.pdf', 'test-provider', 'test-patient');
    const uploadResult = await encryptedStorageService.uploadEncryptedFile(uploadRequest);
    logger.info(`Encrypted storage upload test passed: CID ${uploadResult.cid}`);

    // Test file download
    const downloadRequest = {
      cid: uploadResult.cid,
      requesterId: 'test-provider',
      patientId: 'test-patient',
      accessReason: 'Testing download functionality'
    };

    const downloadResult = await encryptedStorageService.downloadEncryptedFile(downloadRequest);
    if (downloadResult.encryptedData.length === 0) {
      throw new Error('Downloaded encrypted data is empty');
    }
    logger.info('Encrypted storage download test passed');

    // Test file existence
    const exists = await encryptedStorageService.verifyFileExists(uploadResult.cid);
    if (!exists) {
      throw new Error('File existence verification failed');
    }
    logger.info('Encrypted storage file existence test passed');

    // Test audit trail
    const auditTrail = await encryptedStorageService.getAuditTrail({
      userId: 'test-provider'
    });
    if (auditTrail.length === 0) {
      throw new Error('Audit trail is empty');
    }
    logger.info(`Encrypted storage audit trail test passed: ${auditTrail.length} entries found`);

    logger.info('All encrypted storage service tests passed successfully');
    return true;

  } catch (error) {
    logger.error('Encrypted storage service test failed:', error);
    return false;
  }
}

/**
 * Run comprehensive storage system tests
 */
export async function runStorageSystemTests(): Promise<boolean> {
  try {
    logger.info('Starting comprehensive storage system tests...');

    // Test IPFS service
    const ipfsTestPassed = await testIPFSService();
    if (!ipfsTestPassed) {
      throw new Error('IPFS service tests failed');
    }

    // Test encrypted storage service
    const storageTestPassed = await testEncryptedStorageService();
    if (!storageTestPassed) {
      throw new Error('Encrypted storage service tests failed');
    }

    logger.info('All storage system tests passed successfully!');
    return true;

  } catch (error) {
    logger.error('Storage system tests failed:', error);
    return false;
  }
}

/**
 * Generate test data for development
 */
export async function generateTestData(): Promise<void> {
  try {
    logger.info('Generating test data for development...');

    const testFiles = [
      { filename: 'patient-001-xray.jpg', patientId: 'patient-001', recordType: 'imaging' },
      { filename: 'patient-001-bloodwork.pdf', patientId: 'patient-001', recordType: 'lab_result' },
      { filename: 'patient-002-diagnosis.pdf', patientId: 'patient-002', recordType: 'diagnosis' },
      { filename: 'patient-002-prescription.pdf', patientId: 'patient-002', recordType: 'prescription' }
    ];

    for (const testFile of testFiles) {
      const uploadRequest = createTestUploadRequest(
        testFile.filename,
        'test-provider-001',
        testFile.patientId
      );
      uploadRequest.metadata.recordType = testFile.recordType;

      const result = await encryptedStorageService.uploadEncryptedFile(uploadRequest);
      logger.info(`Generated test file: ${testFile.filename} -> CID: ${result.cid}`);
    }

    logger.info('Test data generation completed');

  } catch (error) {
    logger.error('Test data generation failed:', error);
    throw error;
  }
}