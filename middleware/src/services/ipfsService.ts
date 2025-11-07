/**
 * IPFS Service for Healthcare DLT Core
 * Handles file upload, download, and pinning operations using Helia
 */

import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { logger } from '../utils/logger.js';
import type { 
  IPFSConfig, 
  IPFSUploadResult, 
  IPFSDownloadResult, 
  FileMetadata, 
  IPFSPinResult,
  IPFSError 
} from '../types/ipfs.js';

export class IPFSService {
  private helia: any;
  private fs: any;
  private config: IPFSConfig;
  private isInitialized: boolean = false;

  constructor(config?: Partial<IPFSConfig>) {
    this.config = {
      node: {
        // Default Helia configuration for development
      },
      pinning: {
        autoPinUploads: true,
        pinExpirationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      ...config
    };
  }

  /**
   * Initialize IPFS node and UnixFS interface
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing IPFS service with Helia...');
      
      // Create Helia node
      this.helia = await createHelia(this.config.node);
      
      // Create UnixFS interface
      this.fs = unixfs(this.helia);
      
      this.isInitialized = true;
      logger.info('IPFS service initialized successfully');
      
      // Log node information
      const peerId = this.helia.libp2p.peerId.toString();
      logger.info(`IPFS Node Peer ID: ${peerId}`);
      
    } catch (error) {
      logger.error('Failed to initialize IPFS service:', error);
      throw this.createIPFSError('INIT_FAILED', 'Failed to initialize IPFS service', error);
    }
  }

  /**
   * Upload encrypted file to IPFS
   */
  async uploadFile(
    encryptedData: Buffer, 
    metadata: FileMetadata
  ): Promise<IPFSUploadResult> {
    this.ensureInitialized();
    
    try {
      logger.info(`Uploading file to IPFS: ${metadata.filename} (${metadata.size} bytes)`);
      
      // Add file to IPFS
      const cid = await this.fs.addBytes(encryptedData);
      const cidString = cid.toString();
      
      logger.info(`File uploaded to IPFS with CID: ${cidString}`);
      
      // Pin file if auto-pinning is enabled
      let pinned = false;
      if (this.config.pinning.autoPinUploads) {
        const pinResult = await this.pinFile(cidString);
        pinned = pinResult.pinned;
      }
      
      const result: IPFSUploadResult = {
        cid: cidString,
        size: encryptedData.length,
        timestamp: new Date(),
        pinned
      };
      
      logger.info(`File upload completed: ${JSON.stringify(result)}`);
      return result;
      
    } catch (error) {
      logger.error(`Failed to upload file to IPFS: ${metadata.filename}`, error);
      throw this.createIPFSError('UPLOAD_FAILED', 'Failed to upload file to IPFS', error);
    }
  }

  /**
   * Download file from IPFS by CID
   */
  async downloadFile(cid: string): Promise<IPFSDownloadResult> {
    this.ensureInitialized();
    
    try {
      logger.info(`Downloading file from IPFS: ${cid}`);
      
      // Retrieve file from IPFS
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.fs.cat(cid)) {
        chunks.push(chunk);
      }
      
      // Combine chunks into single buffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const data = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), totalLength);
      
      const result: IPFSDownloadResult = {
        data,
        size: data.length,
        timestamp: new Date()
      };
      
      logger.info(`File downloaded from IPFS: ${cid} (${result.size} bytes)`);
      return result;
      
    } catch (error) {
      logger.error(`Failed to download file from IPFS: ${cid}`, error);
      throw this.createIPFSError('DOWNLOAD_FAILED', 'Failed to download file from IPFS', error);
    }
  }

  /**
   * Pin file to ensure persistence
   */
  async pinFile(cid: string): Promise<IPFSPinResult> {
    this.ensureInitialized();
    
    try {
      logger.info(`Pinning file in IPFS: ${cid}`);
      
      // Pin the file
      await this.helia.pins.add(cid);
      
      const result: IPFSPinResult = {
        cid,
        pinned: true,
        timestamp: new Date()
      };
      
      logger.info(`File pinned successfully: ${cid}`);
      return result;
      
    } catch (error) {
      logger.error(`Failed to pin file in IPFS: ${cid}`, error);
      throw this.createIPFSError('PIN_FAILED', 'Failed to pin file in IPFS', error);
    }
  }

  /**
   * Unpin file to free up storage
   */
  async unpinFile(cid: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      logger.info(`Unpinning file in IPFS: ${cid}`);
      
      // Unpin the file
      await this.helia.pins.rm(cid);
      
      logger.info(`File unpinned successfully: ${cid}`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to unpin file in IPFS: ${cid}`, error);
      throw this.createIPFSError('UNPIN_FAILED', 'Failed to unpin file in IPFS', error);
    }
  }

  /**
   * Check if file exists in IPFS
   */
  async fileExists(cid: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      // Try to get file stats
      const stats = await this.fs.stat(cid);
      return stats !== null;
      
    } catch (error) {
      // File doesn't exist or other error
      logger.debug(`File existence check failed for CID: ${cid}`, error);
      return false;
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(cid: string): Promise<{ size: number; type: string }> {
    this.ensureInitialized();
    
    try {
      const stats = await this.fs.stat(cid);
      return {
        size: stats.size,
        type: stats.type
      };
      
    } catch (error) {
      logger.error(`Failed to get file stats for CID: ${cid}`, error);
      throw this.createIPFSError('STAT_FAILED', 'Failed to get file statistics', error);
    }
  }

  /**
   * Shutdown IPFS service
   */
  async shutdown(): Promise<void> {
    if (this.helia && this.isInitialized) {
      try {
        logger.info('Shutting down IPFS service...');
        await this.helia.stop();
        this.isInitialized = false;
        logger.info('IPFS service shut down successfully');
      } catch (error) {
        logger.error('Error shutting down IPFS service:', error);
        throw this.createIPFSError('SHUTDOWN_FAILED', 'Failed to shutdown IPFS service', error);
      }
    }
  }

  /**
   * Get IPFS node information
   */
  getNodeInfo(): { peerId: string; isOnline: boolean } | null {
    if (!this.isInitialized || !this.helia) {
      return null;
    }
    
    return {
      peerId: this.helia.libp2p.peerId.toString(),
      isOnline: this.helia.libp2p.status === 'started'
    };
  }

  /**
   * Ensure IPFS service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw this.createIPFSError('NOT_INITIALIZED', 'IPFS service not initialized');
    }
  }

  /**
   * Create standardized IPFS error
   */
  private createIPFSError(code: string, message: string, originalError?: any): IPFSError {
    const error = new Error(message) as IPFSError;
    error.code = code;
    error.details = originalError;
    return error;
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();