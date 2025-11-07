/**
 * AES-256-GCM Encryption/Decryption Utilities
 * Handles client-side file encryption before IPFS upload and decryption for authorized access
 */

import { PQCUtils } from './pqc-wrapper';
import { EncryptedData, EncryptionError } from './types';

interface FileEncryptionResult {
  encryptedData: EncryptedData;
  encryptionKey: Uint8Array;
  metadata: {
    originalSize: number;
    mimeType: string;
    filename: string;
    encryptedAt: number;
  };
}

interface FileDecryptionResult {
  decryptedData: Uint8Array;
  metadata: {
    originalSize: number;
    mimeType: string;
    filename: string;
    encryptedAt: number;
  };
}

/**
 * AES-256-GCM encryption utilities for medical records
 */
export class AESEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256; // bits
  private static readonly IV_LENGTH = 12; // bytes for GCM
  private static readonly TAG_LENGTH = 16; // bytes for GCM

  /**
   * Encrypt file data using AES-256-GCM
   */
  static async encryptFile(
    fileData: Uint8Array,
    mimeType: string,
    filename: string
  ): Promise<FileEncryptionResult> {
    try {
      // Generate random encryption key
      const encryptionKey = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Create a proper ArrayBuffer from key
      const keyBuffer = new ArrayBuffer(encryptionKey.length);
      const keyView = new Uint8Array(keyBuffer);
      keyView.set(encryptionKey);
      
      // Import key for Web Crypto API
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: this.ALGORITHM },
        false,
        ['encrypt']
      );
      
      // Create proper ArrayBuffers
      const dataBuffer = new ArrayBuffer(fileData.length);
      const dataView = new Uint8Array(dataBuffer);
      dataView.set(fileData);
      
      const ivBuffer = new ArrayBuffer(iv.length);
      const ivView = new Uint8Array(ivBuffer);
      ivView.set(iv);
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv: ivBuffer },
        cryptoKey,
        dataBuffer
      );
      
      const encryptedData: EncryptedData = {
        data: PQCUtils.encodeBase64(new Uint8Array(encrypted)),
        iv: PQCUtils.encodeBase64(iv),
        algorithm: 'AES-256-GCM'
      };

      const metadata = {
        originalSize: fileData.length,
        mimeType,
        filename,
        encryptedAt: Date.now()
      };

      return {
        encryptedData,
        encryptionKey,
        metadata
      };

    } catch (error) {
      throw new EncryptionError('Failed to encrypt file', error);
    }
  }

  /**
   * Decrypt file data using AES-256-GCM
   */
  static async decryptFile(
    encryptedData: EncryptedData,
    encryptionKey: Uint8Array,
    metadata: any
  ): Promise<FileDecryptionResult> {
    try {
      // Create a proper ArrayBuffer from key
      const keyBuffer = new ArrayBuffer(encryptionKey.length);
      const keyView = new Uint8Array(keyBuffer);
      keyView.set(encryptionKey);
      
      // Import key for Web Crypto API
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: this.ALGORITHM },
        false,
        ['decrypt']
      );
      
      // Decode encrypted data and IV
      const encrypted = PQCUtils.decodeBase64(encryptedData.data);
      const iv = PQCUtils.decodeBase64(encryptedData.iv);
      
      // Create proper ArrayBuffers
      const encryptedBuffer = new ArrayBuffer(encrypted.length);
      const encryptedView = new Uint8Array(encryptedBuffer);
      encryptedView.set(encrypted);
      
      const ivBuffer = new ArrayBuffer(iv.length);
      const ivView = new Uint8Array(ivBuffer);
      ivView.set(iv);
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: ivBuffer },
        cryptoKey,
        encryptedBuffer
      );
      
      return {
        decryptedData: new Uint8Array(decrypted),
        metadata
      };

    } catch (error) {
      throw new EncryptionError('Failed to decrypt file', error);
    }
  }

  /**
   * Encrypt text data using AES-256-GCM
   */
  static async encryptText(text: string, key: Uint8Array): Promise<EncryptedData> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      
      const result = await this.encryptFile(data, 'text/plain', 'text.txt');
      return result.encryptedData;
      
    } catch (error) {
      throw new EncryptionError('Failed to encrypt text', error);
    }
  }

  /**
   * Decrypt text data using AES-256-GCM
   */
  static async decryptText(encryptedData: EncryptedData, key: Uint8Array): Promise<string> {
    try {
      const result = await this.decryptFile(encryptedData, key, {});
      const decoder = new TextDecoder();
      return decoder.decode(result.decryptedData);
      
    } catch (error) {
      throw new EncryptionError('Failed to decrypt text', error);
    }
  }

  /**
   * Generate random encryption key
   */
  static generateKey(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32)); // 256 bits
  }

  /**
   * Derive key from password using PBKDF2
   */
  static async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array,
    iterations: number = 100000
  ): Promise<Uint8Array> {
    try {
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      
      // Create proper ArrayBuffer for password
      const passwordBuffer = new ArrayBuffer(passwordData.length);
      const passwordView = new Uint8Array(passwordBuffer);
      passwordView.set(passwordData);
      
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      // Create proper ArrayBuffer for salt
      const saltBuffer = new ArrayBuffer(salt.length);
      const saltView = new Uint8Array(saltBuffer);
      saltView.set(salt);
      
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
      return new Uint8Array(exportedKey);
      
    } catch (error) {
      throw new EncryptionError('Failed to derive key from password', error);
    }
  }

  /**
   * Validate encrypted data structure
   */
  static validateEncryptedData(data: any): data is EncryptedData {
    return (
      typeof data === 'object' &&
      typeof data.data === 'string' &&
      typeof data.iv === 'string' &&
      typeof data.algorithm === 'string' &&
      (data.tag === undefined || typeof data.tag === 'string')
    );
  }

  /**
   * Serialize encrypted data to string for storage/transmission
   */
  static serializeEncryptedData(encryptedData: EncryptedData): string {
    return JSON.stringify({
      data: encryptedData.data,
      iv: encryptedData.iv,
      tag: encryptedData.tag,
      algorithm: encryptedData.algorithm
    });
  }

  /**
   * Deserialize encrypted data from string
   */
  static deserializeEncryptedData(serializedData: string): EncryptedData {
    try {
      const parsed = JSON.parse(serializedData);
      return {
        data: parsed.data,
        iv: parsed.iv,
        tag: parsed.tag,
        algorithm: parsed.algorithm
      };
    } catch (error) {
      throw new EncryptionError('Failed to deserialize encrypted data', error);
    }
  }
}