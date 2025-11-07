/**
 * Storage service type definitions for encrypted file operations
 */

export interface EncryptedFileUploadRequest {
  /** Encrypted file data */
  encryptedData: Buffer;
  /** File metadata */
  metadata: {
    /** Original filename */
    filename: string;
    /** MIME type */
    mimeType: string;
    /** File size before encryption */
    originalSize: number;
    /** File description */
    description?: string;
    /** Patient ID (for medical records) */
    patientId?: string;
    /** Provider ID (uploader) */
    providerId: string;
    /** Record type */
    recordType?: string;
  };
  /** Encryption verification data */
  encryptionInfo: {
    /** Hash of the original file for integrity verification */
    originalFileHash: string;
    /** Encryption algorithm used */
    algorithm: string;
    /** Key derivation info (without actual key) */
    keyDerivation?: string;
  };
}

export interface EncryptedFileUploadResponse {
  /** IPFS Content Identifier */
  cid: string;
  /** Upload timestamp */
  uploadedAt: Date;
  /** File size after encryption */
  encryptedSize: number;
  /** Whether file was pinned */
  pinned: boolean;
  /** Upload transaction ID */
  transactionId: string;
}

export interface EncryptedFileDownloadRequest {
  /** IPFS CID of the encrypted file */
  cid: string;
  /** Requesting user ID */
  requesterId: string;
  /** Patient ID (for access control) */
  patientId?: string;
  /** Access reason/purpose */
  accessReason?: string;
}

export interface EncryptedFileDownloadResponse {
  /** Encrypted file data */
  encryptedData: Buffer;
  /** File metadata */
  metadata: {
    filename: string;
    mimeType: string;
    originalSize: number;
    encryptedSize: number;
    uploadedAt: Date;
    uploadedBy: string;
  };
  /** Access granted timestamp */
  accessedAt: Date;
  /** Access transaction ID */
  transactionId: string;
}

export interface FileAccessValidation {
  /** Whether access is granted */
  granted: boolean;
  /** Reason for access decision */
  reason: string;
  /** Consent token ID (if applicable) */
  consentTokenId?: string;
  /** Access permissions */
  permissions?: string[];
  /** Access expiration time */
  expiresAt?: Date;
}

export interface StorageAuditEntry {
  /** Audit entry ID */
  entryId: string;
  /** Event type */
  eventType: 'upload' | 'download' | 'access_denied' | 'pin' | 'unpin';
  /** User ID who performed the action */
  userId: string;
  /** File CID */
  cid?: string;
  /** Patient ID (if applicable) */
  patientId?: string;
  /** Timestamp */
  timestamp: Date;
  /** Additional details */
  details: Record<string, any>;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
}

export interface StorageServiceError extends Error {
  /** Error code */
  code: string;
  /** HTTP status code */
  statusCode: number;
  /** Additional error details */
  details?: any;
}