/**
 * IPFS Service Initializer
 * Handles IPFS service startup and graceful shutdown
 */

import { ipfsService } from '../services/ipfsService.js';
import { getIPFSConfig } from '../config/ipfs.js';
import { logger } from './logger.js';

/**
 * Initialize IPFS service with configuration
 */
export async function initializeIPFS(): Promise<void> {
  try {
    logger.info('Starting IPFS service initialization...');
    
    // Get configuration based on environment
    const config = getIPFSConfig();
    
    // Initialize IPFS service
    await ipfsService.initialize();
    
    // Log node information
    const nodeInfo = ipfsService.getNodeInfo();
    if (nodeInfo) {
      logger.info(`IPFS Node initialized - Peer ID: ${nodeInfo.peerId}, Online: ${nodeInfo.isOnline}`);
    }
    
    logger.info('IPFS service initialization completed successfully');
    
  } catch (error) {
    logger.error('Failed to initialize IPFS service:', error);
    throw error;
  }
}

/**
 * Gracefully shutdown IPFS service
 */
export async function shutdownIPFS(): Promise<void> {
  try {
    logger.info('Shutting down IPFS service...');
    await ipfsService.shutdown();
    logger.info('IPFS service shutdown completed');
  } catch (error) {
    logger.error('Error during IPFS service shutdown:', error);
    // Don't throw error during shutdown to allow other cleanup to continue
  }
}

/**
 * Setup graceful shutdown handlers for IPFS
 */
export function setupIPFSShutdownHandlers(): void {
  // Handle process termination signals
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal, shutting down IPFS service...');
    await shutdownIPFS();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal, shutting down IPFS service...');
    await shutdownIPFS();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception, shutting down IPFS service:', error);
    await shutdownIPFS();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    logger.error('Unhandled rejection, shutting down IPFS service:', reason);
    await shutdownIPFS();
    process.exit(1);
  });
}