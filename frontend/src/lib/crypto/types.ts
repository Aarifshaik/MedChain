/**
 * PQC Cryptographic Types
 * Type definitions for post-quantum cryptographic operations
 */

/**
 * Kyber KEM variants
 */
export enum KyberVariant {
  KYBER_512 = 'kyber-512',
  KYBER_768 = 'kyber-768',
  KYBER_1024 = 'kyber-1024'
}

/**
 * Dilithium DSA variants
 */
export enum DilithiumVariant {
  DILITHIUM_2 = 'dilithium-2',
  DILITHIUM_3 = 'dilithium-3',
  DILITHIUM_5 = 'dilithium-5'
}

/**
 * Kyber key pair interface
 */
export interface KyberKeyPair {
  publicKey: string;  // Base64 encoded
  privateKey: string; // Base64 encoded
}

/**
 * Dilithium key pair interface
 */
export interface DilithiumKeyPair {
  publicKey: string;  // Base64 encoded
  privateKey: string; // Base64 encoded
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  data: string;       // Base64 encoded encrypted data
  iv: string;         // Base64 encoded initialization vector
  tag?: string;       // Base64 encoded authentication tag (for AEAD)
  algorithm: string;  // Encryption algorithm used
}

/**
 * Digital signature structure
 */
export interface DigitalSignature {
  signature: string;  // Base64 encoded signature
  publicKey: string;  // Base64 encoded public key
  algorithm: string;  // Signature algorithm used
  timestamp: number;  // Signature creation timestamp
}

/**
 * Key encapsulation result
 */
export interface KeyEncapsulation {
  ciphertext: string;    // Base64 encoded ciphertext
  sharedSecret: string;  // Base64 encoded shared secret
}

/**
 * PQC algorithm parameters
 */
export interface PQCParameters {
  kyberVariant: KyberVariant;
  dilithiumVariant: DilithiumVariant;
  securityLevel: 1 | 3 | 5; // NIST security levels
}

/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
  algorithm: 'PBKDF2' | 'scrypt' | 'Argon2';
  iterations?: number;
  salt: Uint8Array;
  keyLength: number;
}

/**
 * Cryptographic operation result
 */
export interface CryptoResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    algorithm: string;
    keySize: number;
    timestamp: number;
  };
}

/**
 * PQC Error classes
 */
export class PQCError extends Error {
  public readonly code: string;
  public readonly originalError?: any;

  constructor(message: string, originalError?: any, code: string = 'PQC_ERROR') {
    super(message);
    this.name = 'PQCError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class KeyGenerationError extends PQCError {
  constructor(message: string, originalError?: any) {
    super(message, originalError, 'KEY_GENERATION_ERROR');
    this.name = 'KeyGenerationError';
  }
}

export class EncryptionError extends PQCError {
  constructor(message: string, originalError?: any) {
    super(message, originalError, 'ENCRYPTION_ERROR');
    this.name = 'EncryptionError';
  }
}

export class DecryptionError extends PQCError {
  constructor(message: string, originalError?: any) {
    super(message, originalError, 'DECRYPTION_ERROR');
    this.name = 'DecryptionError';
  }
}

export class SignatureError extends PQCError {
  constructor(message: string, originalError?: any) {
    super(message, originalError, 'SIGNATURE_ERROR');
    this.name = 'SignatureError';
  }
}

export class VerificationError extends PQCError {
  constructor(message: string, originalError?: any) {
    super(message, originalError, 'VERIFICATION_ERROR');
    this.name = 'VerificationError';
  }
}

/**
 * Storage encryption configuration
 */
export interface StorageEncryptionConfig {
  algorithm: 'AES-GCM' | 'ChaCha20-Poly1305';
  keySize: 128 | 192 | 256;
  ivSize: number;
  tagSize: number;
}

/**
 * Key storage metadata
 */
export interface KeyStorageMetadata {
  userId: string;
  keyType: 'kyber' | 'dilithium' | 'symmetric';
  variant: string;
  createdAt: number;
  lastUsed?: number;
  expiresAt?: number;
  isRevoked: boolean;
}

/**
 * Audit trail entry for cryptographic operations
 */
export interface CryptoAuditEntry {
  operationType: 'key_generation' | 'encryption' | 'decryption' | 'signing' | 'verification';
  userId: string;
  algorithm: string;
  keyId?: string;
  timestamp: number;
  success: boolean;
  errorCode?: string;
  metadata?: Record<string, any>;
}

/**
 * PQC configuration interface
 */
export interface PQCConfig {
  defaultKyberVariant: KyberVariant;
  defaultDilithiumVariant: DilithiumVariant;
  keyRotationInterval: number; // in milliseconds
  storageEncryption: StorageEncryptionConfig;
  auditLogging: boolean;
  securityLevel: 1 | 3 | 5;
}

/**
 * Default PQC configuration
 */
export const DEFAULT_PQC_CONFIG: PQCConfig = {
  defaultKyberVariant: KyberVariant.KYBER_768,
  defaultDilithiumVariant: DilithiumVariant.DILITHIUM_3,
  keyRotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
  storageEncryption: {
    algorithm: 'AES-GCM',
    keySize: 256,
    ivSize: 12,
    tagSize: 16
  },
  auditLogging: true,
  securityLevel: 3
};