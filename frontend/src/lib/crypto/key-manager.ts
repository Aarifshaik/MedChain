/**
 * PQC Key Manager
 * Handles client-side cryptographic key management with secure local storage
 */

import { KyberKEM, DilithiumDSA, PQCUtils } from './pqc-wrapper';
import {
  KyberKeyPair,
  DilithiumKeyPair,
  KyberVariant,
  DilithiumVariant,
  KeyGenerationError,
  PQCError
} from './types';

interface StoredKeyPair {
  publicKey: string; // base64 encoded
  privateKey: string; // base64 encoded, encrypted
  createdAt: number;
  variant: string;
}

interface UserKeys {
  kyber: StoredKeyPair;
  dilithium: StoredKeyPair;
  userId: string;
  createdAt: number;
}

/**
 * PQC Key Manager for client-side key operations
 */
export class PQCKeyManager {
  private kyberKEM: KyberKEM;
  private dilithiumDSA: DilithiumDSA;
  private storagePrefix = 'pqc_keys_';
  private encryptionKey: CryptoKey | null = null;

  constructor(
    kyberVariant: KyberVariant = KyberVariant.KYBER_768,
    dilithiumVariant: DilithiumVariant = DilithiumVariant.DILITHIUM_3
  ) {
    this.kyberKEM = new KyberKEM(kyberVariant);
    this.dilithiumDSA = new DilithiumDSA(dilithiumVariant);
  }

  /**
   * Initialize the key manager with a password for local storage encryption
   */
  async initialize(password: string): Promise<void> {
    try {
      // Derive encryption key from password for local storage
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      
      // Import password as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      // Derive AES key for local storage encryption
      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('healthcare-dlt-salt'), // In production, use random salt per user
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      // Initialize PQC modules (simplified for demo)
      await this.kyberKEM.initialize();
      await this.dilithiumDSA.initialize();
      
    } catch (error) {
      throw new PQCError('Failed to initialize key manager', error);
    }
  }

  /**
   * Generate new PQC key pairs for a user
   */
  async generateUserKeys(userId: string): Promise<{
    kyberKeyPair: KyberKeyPair;
    dilithiumKeyPair: DilithiumKeyPair;
  }> {
    try {
      if (!this.encryptionKey) {
        throw new KeyGenerationError('Key manager not initialized');
      }

      // Generate Kyber key pair for encryption
      const kyberKeyPair = await this.kyberKEM.generateKeyPair();
      
      // Generate Dilithium key pair for signatures
      const dilithiumKeyPair = await this.dilithiumDSA.generateKeyPair();
      
      // Store keys securely
      await this.storeUserKeys(userId, {
        kyber: {
          publicKey: kyberKeyPair.publicKey,
          privateKey: kyberKeyPair.privateKey,
          createdAt: Date.now(),
          variant: this.kyberKEM.getVariant()
        },
        dilithium: {
          publicKey: dilithiumKeyPair.publicKey,
          privateKey: dilithiumKeyPair.privateKey,
          createdAt: Date.now(),
          variant: this.dilithiumDSA.getVariant()
        },
        userId,
        createdAt: Date.now()
      });
      
      return { kyberKeyPair, dilithiumKeyPair };
      
    } catch (error) {
      throw new KeyGenerationError('Failed to generate user keys', error);
    }
  }

  /**
   * Check if user has stored keys
   */
  hasUserKeys(userId: string): boolean {
    try {
      const stored = localStorage.getItem(`${this.storagePrefix}${userId}`);
      return stored !== null;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve user's PQC key pairs
   */
  async getUserKeys(userId: string): Promise<{
    kyberKeyPair: KyberKeyPair;
    dilithiumKeyPair: DilithiumKeyPair;
  } | null> {
    try {
      if (!this.encryptionKey) {
        throw new Error('Key manager not initialized');
      }

      const userKeys = await this.loadUserKeys(userId);
      if (!userKeys) {
        return null;
      }

      return {
        kyberKeyPair: {
          publicKey: userKeys.kyber.publicKey,
          privateKey: userKeys.kyber.privateKey
        },
        dilithiumKeyPair: {
          publicKey: userKeys.dilithium.publicKey,
          privateKey: userKeys.dilithium.privateKey
        }
      };
      
    } catch (error) {
      console.error('Failed to retrieve user keys:', error);
      return null;
    }
  }

  /**
   * Export public keys for registration
   */
  async exportPublicKeys(userId: string): Promise<{
    kyberPublicKey: string;
    dilithiumPublicKey: string;
  } | null> {
    try {
      const userKeys = await this.loadUserKeys(userId);
      if (!userKeys) {
        return null;
      }

      return {
        kyberPublicKey: userKeys.kyber.publicKey,
        dilithiumPublicKey: userKeys.dilithium.publicKey
      };
      
    } catch (error) {
      console.error('Failed to export public keys:', error);
      return null;
    }
  }

  /**
   * Store user keys securely in local storage
   */
  private async storeUserKeys(userId: string, userKeys: UserKeys): Promise<void> {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not available');
      }

      // Encrypt private keys before storage
      const kyberPrivateKeyEncrypted = await this.encryptPrivateKey(userKeys.kyber.privateKey);
      const dilithiumPrivateKeyEncrypted = await this.encryptPrivateKey(userKeys.dilithium.privateKey);
      
      const storageData = {
        ...userKeys,
        kyber: {
          ...userKeys.kyber,
          privateKey: kyberPrivateKeyEncrypted
        },
        dilithium: {
          ...userKeys.dilithium,
          privateKey: dilithiumPrivateKeyEncrypted
        }
      };
      
      localStorage.setItem(`${this.storagePrefix}${userId}`, JSON.stringify(storageData));
      
    } catch (error) {
      throw new Error(`Failed to store user keys: ${error}`);
    }
  }

  /**
   * Load user keys from local storage
   */
  private async loadUserKeys(userId: string): Promise<UserKeys | null> {
    try {
      const stored = localStorage.getItem(`${this.storagePrefix}${userId}`);
      if (!stored) {
        return null;
      }

      const storageData = JSON.parse(stored);
      
      // Decrypt private keys
      const kyberPrivateKey = await this.decryptPrivateKey(storageData.kyber.privateKey);
      const dilithiumPrivateKey = await this.decryptPrivateKey(storageData.dilithium.privateKey);
      
      return {
        ...storageData,
        kyber: {
          ...storageData.kyber,
          privateKey: kyberPrivateKey
        },
        dilithium: {
          ...storageData.dilithium,
          privateKey: dilithiumPrivateKey
        }
      };
      
    } catch (error) {
      console.error('Failed to load user keys:', error);
      return null;
    }
  }

  /**
   * Encrypt private key for storage
   */
  private async encryptPrivateKey(privateKey: string): Promise<string> {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not available');
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(privateKey);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        data
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
      
    } catch (error) {
      throw new Error(`Failed to encrypt private key: ${error}`);
    }
  }

  /**
   * Decrypt private key from storage
   */
  private async decryptPrivateKey(encryptedPrivateKey: string): Promise<string> {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not available');
      }

      const combined = new Uint8Array(atob(encryptedPrivateKey).split('').map(c => c.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
      
    } catch (error) {
      throw new Error(`Failed to decrypt private key: ${error}`);
    }
  }

  /**
   * Clear all stored keys for a user
   */
  clearUserKeys(userId: string): void {
    try {
      localStorage.removeItem(`${this.storagePrefix}${userId}`);
      localStorage.removeItem(`record_keys_${userId}`);
    } catch (error) {
      console.error('Failed to clear user keys:', error);
    }
  }

  /**
   * List all stored user IDs
   */
  getStoredUserIds(): string[] {
    try {
      const userIds: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          userIds.push(key.substring(this.storagePrefix.length));
        }
      }
      return userIds;
    } catch (error) {
      console.error('Failed to get stored user IDs:', error);
      return [];
    }
  }
}