/**
 * IPFS Configuration for Healthcare DLT Core
 */

import type { IPFSConfig } from '../types/ipfs.js';

/**
 * Default IPFS configuration for development environment
 */
export const defaultIPFSConfig: IPFSConfig = {
  node: {
    // Helia will use default configuration
    // In production, you might want to configure:
    // - Custom libp2p configuration
    // - Specific datastore/blockstore
    // - Network settings
  },
  pinning: {
    autoPinUploads: true,
    pinExpirationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  }
};

/**
 * Production IPFS configuration
 */
export const productionIPFSConfig: IPFSConfig = {
  node: {
    // Production-specific configuration would go here
    // - Persistent datastore
    // - Specific bootstrap nodes
    // - Network security settings
  },
  pinning: {
    autoPinUploads: true,
    pinExpirationMs: 90 * 24 * 60 * 60 * 1000, // 90 days for production
  }
};

/**
 * Get IPFS configuration based on environment
 */
export function getIPFSConfig(): IPFSConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return productionIPFSConfig;
    case 'development':
    case 'test':
    default:
      return defaultIPFSConfig;
  }
}