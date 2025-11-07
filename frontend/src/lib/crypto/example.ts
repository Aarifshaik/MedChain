/**
 * Example usage of the PQC cryptography module
 * This file demonstrates how to use the post-quantum cryptography features
 */

import { 
  PQCKeyManager, 
  AESEncryption, 
  KyberKEM, 
  DilithiumDSA, 
  PQCUtils,
  KyberVariant,
  DilithiumVariant 
} from './index';

/**
 * Example: Complete user registration and key generation workflow
 */
export async function exampleUserRegistration() {
  try {
    // Initialize key manager with user password
    const keyManager = new PQCKeyManager();
    await keyManager.initialize('user-secure-password-123');

    // Generate PQC key pairs for a new user
    const userId = 'patient-001';
    const userKeys = await keyManager.generateUserKeys(userId);

    console.log('Generated Kyber key pair:', {
      publicKeyLength: userKeys.kyberKeyPair.publicKey.length,
      privateKeyLength: userKeys.kyberKeyPair.privateKey.length
    });

    console.log('Generated Dilithium key pair:', {
      publicKeyLength: userKeys.dilithiumKeyPair.publicKey.length,
      privateKeyLength: userKeys.dilithiumKeyPair.privateKey.length
    });

    // Export public keys for sharing with the blockchain
    const publicKeys = await keyManager.exportPublicKeys(userId);
    console.log('Exported public keys for blockchain registration:', publicKeys);

    return { userKeys, publicKeys };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

/**
 * Example: Medical record encryption workflow
 */
export async function exampleMedicalRecordEncryption() {
  try {
    // Simulate medical record data
    const medicalData = new TextEncoder().encode(JSON.stringify({
      patientId: 'patient-001',
      diagnosis: 'Hypertension',
      prescription: 'Lisinopril 10mg daily',
      date: new Date().toISOString(),
      doctorId: 'doctor-001'
    }));

    // Encrypt the medical record
    const encryptionResult = await AESEncryption.encryptFile(
      medicalData,
      'medical-record-001.json',
      'application/json'
    );

    console.log('Encrypted medical record:', {
      originalSize: encryptionResult.metadata.originalSize,
      encryptedSize: encryptionResult.encryptedData.data.length,
      encryptionKey: PQCUtils.encodeBase64(encryptionResult.encryptionKey)
    });

    // Decrypt the medical record
    const decryptionResult = await AESEncryption.decryptFile(
      encryptionResult.encryptedData,
      encryptionResult.encryptionKey,
      encryptionResult.metadata
    );

    const decryptedData = new TextDecoder().decode(decryptionResult.decryptedData);
    console.log('Decrypted medical record:', JSON.parse(decryptedData));

    return { encryptionResult, decryptionResult };
  } catch (error) {
    console.error('Medical record encryption failed:', error);
    throw error;
  }
}

/**
 * Example: Digital signature workflow for authentication
 */
export async function exampleDigitalSignature() {
  try {
    // Initialize Dilithium DSA
    const dilithium = new DilithiumDSA(DilithiumVariant.DILITHIUM_3);
    await dilithium.initialize();

    // Generate key pair
    const keyPair = await dilithium.generateKeyPair();

    // Create authentication challenge
    const nonce = PQCUtils.generateRandomBytes(32);
    const messageText = `auth-challenge:${PQCUtils.encodeBase64(nonce)}:${Date.now()}`;
    const message = await PQCUtils.hash(new TextEncoder().encode(messageText));

    // Sign the challenge
    const signature = await dilithium.sign(keyPair.privateKey, message);

    // Verify the signature
    const isValid = await dilithium.verify(keyPair.publicKey, message, signature);

    console.log('Digital signature example:', {
      nonceLength: nonce.length,
      messageLength: message.length,
      signatureLength: signature.length,
      isValid
    });

    return { keyPair, signature, isValid };
  } catch (error) {
    console.error('Digital signature failed:', error);
    throw error;
  }
}

/**
 * Example: Key encapsulation for secure key exchange
 */
export async function exampleKeyEncapsulation() {
  try {
    // Initialize Kyber KEM
    const kyber = new KyberKEM(KyberVariant.KYBER_768);
    await kyber.initialize();

    // Generate key pair (receiver)
    const receiverKeyPair = await kyber.generateKeyPair();

    // Encapsulate shared secret (sender)
    const encapsulation = await kyber.encapsulate(receiverKeyPair.publicKey);

    // Decapsulate shared secret (receiver)
    const decapsulatedSecret = await kyber.decapsulate(
      receiverKeyPair.privateKey,
      encapsulation.ciphertext
    );

    // Verify shared secrets match (for demo, they won't actually match due to simulation)
    const secretsMatch = encapsulation.sharedSecret === decapsulatedSecret;

    console.log('Key encapsulation example:', {
      ciphertextLength: encapsulation.ciphertext.length,
      sharedSecretLength: encapsulation.sharedSecret.length,
      secretsMatch
    });

    // Use shared secret as AES key (decode from base64 first)
    const sharedSecretBytes = PQCUtils.decodeBase64(encapsulation.sharedSecret);
    const aesKey = sharedSecretBytes.slice(0, 32);

    console.log('Derived AES key length:', aesKey.length);

    return { encapsulation, decapsulatedSecret, aesKey };
  } catch (error) {
    console.error('Key encapsulation failed:', error);
    throw error;
  }
}

/**
 * Example: Complete end-to-end workflow
 */
export async function exampleEndToEndWorkflow() {
  try {
    console.log('Starting end-to-end PQC workflow...');

    // 1. User registration
    const registration = await exampleUserRegistration();
    console.log('✓ User registration completed');

    // 2. Medical record encryption
    const encryption = await exampleMedicalRecordEncryption();
    console.log('✓ Medical record encryption completed');

    // 3. Digital signature
    const signature = await exampleDigitalSignature();
    console.log('✓ Digital signature completed');

    // 4. Key encapsulation
    const keyExchange = await exampleKeyEncapsulation();
    console.log('✓ Key encapsulation completed');

    console.log('End-to-end workflow completed successfully!');

    return {
      registration,
      encryption,
      signature,
      keyExchange
    };
  } catch (error) {
    console.error('End-to-end workflow failed:', error);
    throw error;
  }
}