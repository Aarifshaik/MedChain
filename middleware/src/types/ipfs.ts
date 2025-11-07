/**
 * IPFS-related type definitions for the Healthcare DLT system
 */

export interface IPFSConfig {
  /** IPFS node configuration */
  node: {
    /** Enable libp2p for networking */
    libp2p?: any;
    /** Data store configuration */
    datastore?: any;
    /** Block store configuration */
    blockstore?: any;
  };
  /** File pinning configuration */
  pinning: {
    /** Enable automatic pinning of uploaded files */
    autoPinUploads: boolean;
    /** Pin expiration time in milliseconds */
    pinExpirationMs?: number;
  };
}

export interface IPFSUploadResult {
  /** IPFS Content Identifier (CID) */
  cid: string;
  /** File size in bytes */
  size: number;
  /** Upload timestamp */
  timestamp: Date;
  /** Whether file was pinned */
  pinned: boolean;
}

export interface IPFSDownloadResult {
  /** File data as Buffer */
  data: Buffer;
  /** File size in bytes */
  size: number;
  /** Content type if available */
  contentType?: string;
  /** Download timestamp */
  timestamp: Date;
}

export interface FileMetadata {
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Upload timestamp */
  uploadedAt: Date;
  /** Uploader user ID */
  uploadedBy: string;
  /** File description */
  description?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface IPFSPinResult {
  /** CID that was pinned */
  cid: string;
  /** Pin status */
  pinned: boolean;
  /** Pin timestamp */
  timestamp: Date;
}

export interface IPFSError extends Error {
  /** Error code */
  code: string;
  /** IPFS-specific error details */
  details?: any;
}