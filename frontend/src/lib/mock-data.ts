import { User, UserRole, MedicalRecord, RecordType, ConsentToken, AuditEntry, AuditEventType, DashboardStats, RecentActivity, SystemStatus } from '@/types'

// Mock Users
export const mockUsers: User[] = [
  {
    userId: 'user-001',
    role: UserRole.DOCTOR,
    publicKeys: {
      kyberPublicKey: 'kyber_mock_key_001',
      dilithiumPublicKey: 'dilithium_mock_key_001'
    },
    registrationStatus: 'approved',
    approvedBy: 'admin-001',
    createdAt: new Date('2024-01-15'),
    approvedAt: new Date('2024-01-16')
  },
  {
    userId: 'user-002',
    role: UserRole.PATIENT,
    publicKeys: {
      kyberPublicKey: 'kyber_mock_key_002',
      dilithiumPublicKey: 'dilithium_mock_key_002'
    },
    registrationStatus: 'approved',
    approvedBy: 'admin-001',
    createdAt: new Date('2024-01-20'),
    approvedAt: new Date('2024-01-21')
  },
  {
    userId: 'user-003',
    role: UserRole.LABORATORY,
    publicKeys: {
      kyberPublicKey: 'kyber_mock_key_003',
      dilithiumPublicKey: 'dilithium_mock_key_003'
    },
    registrationStatus: 'pending',
    createdAt: new Date('2024-02-01')
  }
]

// Mock Medical Records
export const mockMedicalRecords: MedicalRecord[] = [
  {
    recordId: 'record-001',
    patientId: 'user-002',
    providerId: 'user-001',
    recordType: RecordType.DIAGNOSIS,
    ipfsHash: 'QmMockHash001',
    encryptionKeyHash: 'mock_encryption_key_001',
    metadata: {
      title: 'Annual Physical Examination',
      description: 'Routine annual physical examination results',
      createdAt: new Date('2024-02-15'),
      fileSize: 2048,
      mimeType: 'application/pdf'
    },
    signature: 'mock_signature_001'
  },
  {
    recordId: 'record-002',
    patientId: 'user-002',
    providerId: 'user-003',
    recordType: RecordType.LAB_RESULT,
    ipfsHash: 'QmMockHash002',
    encryptionKeyHash: 'mock_encryption_key_002',
    metadata: {
      title: 'Blood Test Results',
      description: 'Complete blood count and metabolic panel',
      createdAt: new Date('2024-02-20'),
      fileSize: 1024,
      mimeType: 'application/pdf'
    },
    signature: 'mock_signature_002'
  }
]

// Mock Consent Tokens
export const mockConsentTokens: ConsentToken[] = [
  {
    tokenId: 'consent-001',
    patientId: 'user-002',
    providerId: 'user-001',
    permissions: [
      {
        resourceType: RecordType.DIAGNOSIS,
        accessLevel: 'read'
      },
      {
        resourceType: RecordType.LAB_RESULT,
        accessLevel: 'read'
      }
    ],
    expirationTime: new Date('2024-12-31'),
    isActive: true,
    createdAt: new Date('2024-02-10'),
    signature: 'mock_consent_signature_001'
  }
]

// Mock Audit Entries
export const mockAuditEntries: AuditEntry[] = [
  {
    entryId: 'audit-001',
    eventType: AuditEventType.RECORD_CREATED,
    userId: 'user-001',
    resourceId: 'record-001',
    timestamp: new Date('2024-02-15T10:30:00Z'),
    details: {
      recordType: 'diagnosis',
      patientId: 'user-002'
    },
    signature: 'mock_audit_signature_001',
    blockNumber: 12345,
    transactionId: 'tx-001'
  },
  {
    entryId: 'audit-002',
    eventType: AuditEventType.RECORD_ACCESSED,
    userId: 'user-001',
    resourceId: 'record-001',
    timestamp: new Date('2024-02-16T14:15:00Z'),
    details: {
      accessType: 'view',
      patientId: 'user-002'
    },
    signature: 'mock_audit_signature_002',
    blockNumber: 12346,
    transactionId: 'tx-002'
  }
]

// Mock Dashboard Statistics
export const mockDashboardStats: DashboardStats = {
  totalRecords: 1234,
  activeConsents: 89,
  recentAccess: 156,
  systemUsers: 45,
  recordsChange: '+12%',
  consentsChange: '+5%',
  accessChange: '+23%',
  usersChange: '+2%'
}

// Mock Recent Activity
export const mockRecentActivity: RecentActivity[] = [
  { action: 'Record uploaded', user: 'Dr. Smith', time: '2 minutes ago', type: 'upload' },
  { action: 'Consent granted', user: 'John Doe', time: '5 minutes ago', type: 'consent' },
  { action: 'Record accessed', user: 'Lab Tech', time: '10 minutes ago', type: 'access' },
  { action: 'User approved', user: 'Admin', time: '15 minutes ago', type: 'approval' }
]

// Mock System Status
export const mockSystemStatus: SystemStatus = {
  quantumResistance: 'active',
  encryptionStatus: 'AES-256-GCM',
  keyAlgorithm: 'CRYSTALS-Kyber',
  signatureAlgorithm: 'CRYSTALS-Dilithium',
  networkStatus: 'connected'
}

// Utility function to get mock data by type
export function getMockData<T>(dataType: string): T {
  switch (dataType) {
    case 'users':
      return mockUsers as T
    case 'medical-records':
      return mockMedicalRecords as T
    case 'consent-tokens':
      return mockConsentTokens as T
    case 'audit-entries':
      return mockAuditEntries as T
    case 'dashboard-stats':
      return mockDashboardStats as T
    case 'recent-activity':
      return mockRecentActivity as T
    case 'system-status':
      return mockSystemStatus as T
    default:
      throw new Error(`Unknown mock data type: ${dataType}`)
  }
}