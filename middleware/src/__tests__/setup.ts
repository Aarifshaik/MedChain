/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

import { jest } from '@jest/globals'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.BLOCKCHAIN_NETWORK_CONFIG = 'test'
process.env.IPFS_NODE_URL = 'http://localhost:5001'
process.env.JWT_SECRET = 'test_jwt_secret'

// Mock blockchain service
jest.mock('../services/blockchainService', () => ({
  blockchainService: {
    initialize: jest.fn().mockResolvedValue(undefined as any),
    disconnect: jest.fn().mockResolvedValue(undefined as any),
    submitTransaction: jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'mock_tx_id',
      blockNumber: 123
    } as any),
    queryLedger: jest.fn().mockResolvedValue({
      success: true,
      data: {}
    } as any),
    registerUser: jest.fn().mockResolvedValue(true as any),
    approveUser: jest.fn().mockResolvedValue(true as any)
  }
}))

// Mock IPFS service
jest.mock('../services/ipfsService', () => ({
  ipfsService: {
    initialize: jest.fn().mockResolvedValue(undefined as any),
    disconnect: jest.fn().mockResolvedValue(undefined as any),
    uploadFile: jest.fn().mockResolvedValue('QmMockHash123' as any),
    retrieveFile: jest.fn().mockResolvedValue(Buffer.from('mock_file_data') as any),
    pinFile: jest.fn().mockResolvedValue(true as any)
  }
}))

// Mock signature verification
jest.mock('../utils/cryptoUtils', () => ({
  verifyDilithiumSignature: jest.fn().mockReturnValue(true),
  generateNonce: jest.fn().mockReturnValue('mock_nonce_123')
}))

// Global test timeout
jest.setTimeout(30000)