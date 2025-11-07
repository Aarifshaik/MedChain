# Post-Quantum Cryptography Module

This module provides post-quantum cryptographic functionality for the Healthcare DLT system, implementing CRYSTALS-Kyber for key encapsulation and CRYSTALS-Dilithium for digital signatures, along with AES-256-GCM for symmetric encryption.

## Features

- **CRYSTALS-Kyber**: Post-quantum key encapsulation mechanism (KEM)
- **CRYSTALS-Dilithium**: Post-quantum digital signature algorithm (DSA)
- **AES-256-GCM**: Symmetric encryption for medical records
- **Secure Key Management**: Client-side key storage with encryption
- **Type Safety**: Full TypeScript support with comprehensive error handling

## Quick Start

```typescript
import { PQCKeyManager, AESEncryption, KyberKEM, DilithiumDSA } from '@/lib/crypto';

// Initialize key manager
const keyManager = new PQCKeyManager();
await keyManager.initialize('user-password');

// Generate user keys
const userKeys = await keyManager.generateUserKeys('patient-001');

// Encrypt medical record
const encryptionResult = await AESEncryption.encryptFile(
  medicalData,
  'record.json',
  'application/json'
);
```

## Components

### PQCKeyManager
Manages client-side cryptographic keys with secure local storage.

**Key Methods:**
- `initialize(password: string)`: Initialize with encryption password
- `generateUserKeys(userId: string)`: Generate PQC key pairs
- `getUserKeys(userId: string)`: Retrieve stored keys
- `exportPublicKeys(userId: string)`: Export public keys for sharing

### KyberKEM
CRYSTALS-Kyber key encapsulation mechanism for secure key exchange.

**Key Methods:**
- `generateKeyPair()`: Generate Kyber key pair
- `encapsulate(publicKey)`: Create shared secret with ciphertext
- `decapsulate(ciphertext, privateKey)`: Extract shared secret
- `validateKeyPair(keyPair)`: Verify key pair consistency

### DilithiumDSA
CRYSTALS-Dilithium digital signature algorithm for authentication.

**Key Methods:**
- `generateKeyPair()`: Generate Dilithium key pair
- `sign(message, privateKey)`: Create digital signature
- `verify(message, signature, publicKey)`: Verify signature
- `validateKeyPair(keyPair)`: Verify key pair consistency

### AESEncryption
AES-256-GCM symmetric encryption for medical record data.

**Key Methods:**
- `encryptFile(data, filename, mimeType)`: Encrypt file data
- `decryptFile(encryptedData, key, metadata)`: Decrypt file data
- `encryptText(text, key)`: Encrypt text data
- `decryptText(encryptedData, key)`: Decrypt text data

## Security Parameters

### Kyber Variants
- **KYBER_512**: 128-bit security level (not recommended after 2030)
- **KYBER_768**: 192-bit security level (default, not recommended after 2030)
- **KYBER_1024**: 256-bit security level (recommended for long-term use)

### Dilithium Variants
- **DILITHIUM_2**: 128-bit security level (not recommended after 2030)
- **DILITHIUM_3**: 192-bit security level (default, not recommended after 2030)
- **DILITHIUM_5**: 256-bit security level (recommended for long-term use)

## Error Handling

The module provides comprehensive error handling with specific error types:

- `PQCError`: Base error class for all PQC operations
- `KeyGenerationError`: Key generation failures
- `EncryptionError`: Encryption/decryption failures
- `SignatureError`: Digital signature failures

## Usage Examples

See `example.ts` for comprehensive usage examples including:
- User registration workflow
- Medical record encryption
- Digital signature authentication
- Key encapsulation for secure communication
- End-to-end workflow demonstration

## Dependencies

- `@noble/post-quantum`: Auditable post-quantum cryptography implementation
- `@noble/hashes`: Cryptographic hash functions
- Web Crypto API: Browser-native cryptographic operations

## Browser Compatibility

This module requires modern browsers with Web Crypto API support:
- Chrome 37+
- Firefox 34+
- Safari 7+
- Edge 12+

## Security Considerations

1. **Key Storage**: Private keys are encrypted before local storage
2. **Random Generation**: Uses cryptographically secure random number generation
3. **Memory Safety**: Sensitive data is handled as Uint8Arrays
4. **Algorithm Selection**: Uses NIST-standardized post-quantum algorithms
5. **Future-Proof**: Designed to resist quantum computer attacks

## Performance Notes

- Key generation: ~10-50ms depending on variant
- Encryption/Decryption: ~1-5ms per MB of data
- Signature generation: ~5-20ms depending on variant
- Signature verification: ~2-10ms depending on variant

## Integration with Healthcare DLT

This module integrates with the Healthcare DLT system by:
1. Providing quantum-resistant user authentication
2. Encrypting medical records before IPFS storage
3. Enabling secure key exchange between healthcare providers
4. Supporting consent management through cryptographic proofs