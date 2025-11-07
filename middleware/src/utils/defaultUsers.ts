import { logger } from './logger.js';

// Default system admin credentials
export const DEFAULT_ADMIN = {
  userId: 'admin',
  password: 'Healthcare@2024!',
  role: 'system_admin',
  publicKeys: {
    kyberPublicKey: 'default_kyber_admin_key_placeholder',
    dilithiumPublicKey: 'default_dilithium_admin_key_placeholder'
  },
  personalInfo: {
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@healthcare-dlt.com',
    phone: '+1-555-0000'
  },
  isDefault: true,
  createdAt: new Date().toISOString()
};

// Default doctor for testing
export const DEFAULT_DOCTOR = {
  userId: 'doctor1',
  password: 'Doctor@2024!',
  role: 'doctor',
  publicKeys: {
    kyberPublicKey: 'default_kyber_doctor_key_placeholder',
    dilithiumPublicKey: 'default_dilithium_doctor_key_placeholder'
  },
  personalInfo: {
    firstName: 'Dr. John',
    lastName: 'Smith',
    email: 'doctor@healthcare-dlt.com',
    phone: '+1-555-0001'
  },
  professionalInfo: {
    licenseNumber: 'MD123456',
    specialization: 'General Medicine',
    institution: 'Healthcare DLT Hospital'
  },
  isDefault: true,
  createdAt: new Date().toISOString()
};

// Default patient for testing
export const DEFAULT_PATIENT = {
  userId: 'patient1',
  password: 'Patient@2024!',
  role: 'patient',
  publicKeys: {
    kyberPublicKey: 'default_kyber_patient_key_placeholder',
    dilithiumPublicKey: 'default_dilithium_patient_key_placeholder'
  },
  personalInfo: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'patient@healthcare-dlt.com',
    phone: '+1-555-0002',
    dateOfBirth: '1990-01-01'
  },
  isDefault: true,
  createdAt: new Date().toISOString()
};

export const DEFAULT_USERS = [DEFAULT_ADMIN, DEFAULT_DOCTOR, DEFAULT_PATIENT];

/**
 * Initialize default users in the system
 * This should be called during system startup
 */
export async function initializeDefaultUsers(): Promise<void> {
  try {
    logger.info('Initializing default users...');
    
    // In a real implementation, you would:
    // 1. Check if users already exist in the blockchain
    // 2. Create them if they don't exist
    // 3. Store their credentials securely
    
    // For now, just log the default credentials
    logger.info('Default users available:');
    DEFAULT_USERS.forEach(user => {
      logger.info(`- ${user.role.toUpperCase()}: ${user.userId} / ${user.password}`);
    });
    
    logger.info('Default users initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize default users:', error);
  }
}

/**
 * Get default user by userId
 */
export function getDefaultUser(userId: string) {
  return DEFAULT_USERS.find(user => user.userId === userId);
}

/**
 * Validate default user credentials
 */
export function validateDefaultUser(userId: string, password: string): boolean {
  const user = getDefaultUser(userId);
  return user ? user.password === password : false;
}