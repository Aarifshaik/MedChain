// User and Authentication Types
export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  LABORATORY = 'laboratory',
  INSURER = 'insurer',
  AUDITOR = 'auditor',
  SYSTEM_ADMIN = 'system_admin'
}

export interface User {
  userId: string;
  role: UserRole;
  publicKeys: {
    kyberPublicKey: string;
    dilithiumPublicKey: string;
  };
  registrationStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  createdAt: Date;
  approvedAt?: Date;
}

// Cryptographic Types
export interface KyberKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface DilithiumKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
}

export interface Signature {
  signature: string;
  publicKey: string;
}

// Medical Record Types
export enum RecordType {
  DIAGNOSIS = 'diagnosis',
  PRESCRIPTION = 'prescription',
  LAB_RESULT = 'lab_result',
  IMAGING = 'imaging',
  CONSULTATION_NOTE = 'consultation_note'
}

export interface MedicalRecord {
  recordId: string;
  patientId: string;
  providerId: string;
  recordType: RecordType;
  ipfsHash: string;
  encryptionKeyHash: string;
  metadata: {
    title: string;
    description: string;
    createdAt: Date;
    fileSize: number;
    mimeType: string;
  };
  signature: string;
}

// Consent Management Types
export interface Permission {
  resourceType: RecordType;
  accessLevel: 'read' | 'write';
  conditions?: string[];
}

export interface ConsentToken {
  tokenId: string;
  patientId: string;
  providerId: string;
  permissions: Permission[];
  expirationTime?: Date;
  isActive: boolean;
  createdAt: Date;
  revokedAt?: Date;
  signature: string;
}

// Audit Types
export enum AuditEventType {
  USER_REGISTRATION = 'user_registration',
  USER_APPROVAL = 'user_approval',
  RECORD_CREATED = 'record_created',
  RECORD_ACCESSED = 'record_accessed',
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_REVOKED = 'consent_revoked',
  LOGIN_ATTEMPT = 'login_attempt'
}

export interface AuditEntry {
  entryId: string;
  eventType: AuditEventType;
  userId: string;
  resourceId?: string;
  timestamp: Date;
  details: Record<string, any>;
  signature: string;
  blockNumber: number;
  transactionId: string;
}

// Dashboard Types
export interface DashboardStats {
  totalRecords: number;
  activeConsents: number;
  recentAccess: number;
  systemUsers: number;
  recordsChange: string;
  consentsChange: string;
  accessChange: string;
  usersChange: string;
}

export interface RecentActivity {
  action: string;
  user: string;
  time: string;
  type: 'upload' | 'consent' | 'access' | 'approval';
}

export interface SystemStatus {
  quantumResistance: 'active' | 'inactive';
  encryptionStatus: string;
  keyAlgorithm: string;
  signatureAlgorithm: string;
  networkStatus: 'connected' | 'disconnected' | 'connecting';
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: Date;
    requestId: string;
  };
}