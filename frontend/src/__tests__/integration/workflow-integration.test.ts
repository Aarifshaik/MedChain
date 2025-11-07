/**
 * Integration Tests for End-to-End User Workflows
 * Tests complete user journeys from frontend to backend
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { 
  UserRegistrationWorkflow,
  UserLoginWorkflow,
  RecordUploadWorkflow,
  ConsentManagementWorkflow,
  RecordAccessWorkflow,
  UserApprovalWorkflow
} from '@/lib/workflows/user-workflows'
import { workflowOrchestrator } from '@/lib/workflows/workflow-orchestrator'
import { UserRole, RecordType } from '@/types'

// Mock API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

// Mock PQC Key Manager
vi.mock('@/lib/crypto/key-manager', () => ({
  PQCKeyManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    generateUserKeys: vi.fn().mockResolvedValue({
      kyberKeyPair: { publicKey: new Uint8Array(32), privateKey: new Uint8Array(32) },
      dilithiumKeyPair: { publicKey: new Uint8Array(32), privateKey: new Uint8Array(32) }
    }),
    hasUserKeys: vi.fn().mockReturnValue(true),
    getUserKeys: vi.fn().mockResolvedValue({
      kyberKeyPair: { publicKey: new Uint8Array(32), privateKey: new Uint8Array(32) },
      dilithiumKeyPair: { publicKey: new Uint8Array(32), privateKey: new Uint8Array(32) }
    }),
    exportPublicKeys: vi.fn().mockResolvedValue({
      kyberPublicKey: 'mock_kyber_public_key',
      dilithiumPublicKey: 'mock_dilithium_public_key'
    })
  }))
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('User Registration Workflow Integration', () => {
  let registrationWorkflow: UserRegistrationWorkflow
  let apiClient: any

  beforeEach(async () => {
    const apiModule = await import('@/lib/api')
    apiClient = apiModule.apiClient
    registrationWorkflow = new UserRegistrationWorkflow()
    vi.clearAllMocks()
  })

  it('should complete patient registration workflow successfully', async () => {
    // Mock successful API responses
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: {
        userId: 'patient_001',
        status: 'pending_doctor_approval',
        transactionId: 'tx_123'
      }
    })

    const result = await registrationWorkflow.execute({
      userId: 'patient_001',
      role: UserRole.PATIENT,
      password: 'secure_password_123'
    })

    expect(result.success).toBe(true)
    expect(result.data?.userId).toBe('patient_001')
    expect(result.steps).toContain('Registration completed successfully')
    
    // Verify API was called with correct data
    expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
      userId: 'patient_001',
      role: UserRole.PATIENT,
      publicKeys: {
        kyberPublicKey: 'mock_kyber_public_key',
        dilithiumPublicKey: 'mock_dilithium_public_key'
      }
    })
  })

  it('should handle registration failure gracefully', async () => {
    // Mock API failure
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'User ID already exists',
        timestamp: new Date(),
        requestId: 'req_123'
      }
    })

    const result = await registrationWorkflow.execute({
      userId: 'existing_user',
      role: UserRole.DOCTOR,
      password: 'password123'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('User ID already exists')
  })

  it('should complete doctor registration workflow', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: {
        userId: 'doctor_001',
        status: 'pending_admin_approval',
        transactionId: 'tx_456'
      }
    })

    const result = await registrationWorkflow.execute({
      userId: 'doctor_001',
      role: UserRole.DOCTOR,
      password: 'doctor_secure_pass'
    })

    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('pending_admin_approval')
  })
})

describe('User Authentication Workflow Integration', () => {
  let loginWorkflow: UserLoginWorkflow
  let apiClient: any

  beforeEach(async () => {
    const apiModule = await import('@/lib/api')
    apiClient = apiModule.apiClient
    loginWorkflow = new UserLoginWorkflow()
    vi.clearAllMocks()
  })

  it('should complete login workflow successfully', async () => {
    // Mock nonce generation
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: { nonce: 'mock_nonce_123' }
    })

    // Mock successful authentication
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: {
        token: 'jwt_token_123',
        user: {
          userId: 'patient_001',
          role: UserRole.PATIENT,
          registrationStatus: 'approved'
        },
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }
    })

    const result = await loginWorkflow.execute({
      userId: 'patient_001',
      password: 'secure_password_123'
    })

    expect(result.success).toBe(true)
    expect(result.data?.token).toBe('jwt_token_123')
    expect(result.data?.user.userId).toBe('patient_001')
    expect(result.steps).toContain('Login completed successfully')

    // Verify session storage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'jwt_token_123')
  })

  it('should handle authentication failure', async () => {
    // Mock nonce generation success
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: { nonce: 'mock_nonce_123' }
    })

    // Mock authentication failure
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Invalid signature',
        timestamp: new Date(),
        requestId: 'req_456'
      }
    })

    const result = await loginWorkflow.execute({
      userId: 'invalid_user',
      password: 'wrong_password'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid signature')
  })
})

describe('Medical Record Management Workflow Integration', () => {
  let recordWorkflow: RecordUploadWorkflow
  let apiClient: any

  beforeEach(async () => {
    const apiModule = await import('@/lib/api')
    apiClient = apiModule.apiClient
    recordWorkflow = new RecordUploadWorkflow()
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue('mock_auth_token')
  })

  it('should complete record upload workflow successfully', async () => {
    // Mock IPFS upload
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: { ipfsHash: 'QmTest123' }
    })

    // Mock blockchain record creation
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: {
        recordId: 'record_001',
        transactionId: 'tx_789'
      }
    })

    const mockFile = new File(['test content'], 'test-record.pdf', { type: 'application/pdf' })
    
    const result = await recordWorkflow.execute({
      file: mockFile,
      title: 'Test Medical Record',
      description: 'Test record for integration testing',
      recordType: RecordType.DIAGNOSIS
    }, 'patient_001', 'password123')

    expect(result.success).toBe(true)
    expect(result.data?.recordId).toBe('record_001')
    expect(result.data?.ipfsHash).toBe('QmTest123')
    expect(result.steps).toContain('Medical record uploaded successfully')
  })

  it('should handle IPFS upload failure', async () => {
    // Mock IPFS upload failure
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: false,
      error: {
        code: 'IPFS_UPLOAD_FAILED',
        message: 'Failed to upload to IPFS',
        timestamp: new Date(),
        requestId: 'req_789'
      }
    })

    const mockFile = new File(['test content'], 'test-record.pdf', { type: 'application/pdf' })
    
    const result = await recordWorkflow.execute({
      file: mockFile,
      title: 'Test Record',
      description: 'Test description',
      recordType: RecordType.LAB_RESULT
    }, 'patient_001', 'password123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to upload file to IPFS')
  })
})

describe('Consent Management Workflow Integration', () => {
  let consentWorkflow: ConsentManagementWorkflow
  let apiClient: any

  beforeEach(async () => {
    const apiModule = await import('@/lib/api')
    apiClient = apiModule.apiClient
    consentWorkflow = new ConsentManagementWorkflow()
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue('mock_auth_token')
  })

  it('should complete consent granting workflow successfully', async () => {
    // Mock provider validation
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        userId: 'doctor_001',
        role: UserRole.DOCTOR,
        registrationStatus: 'approved'
      }
    })

    // Mock consent creation
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: {
        consentTokenId: 'consent_001',
        transactionId: 'tx_consent_123'
      }
    })

    // Mock consent verification
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        tokenId: 'consent_001',
        isActive: true,
        patientId: 'patient_001',
        providerId: 'doctor_001'
      }
    })

    const result = await consentWorkflow.grantConsent({
      providerId: 'doctor_001',
      permissions: [
        {
          resourceType: RecordType.DIAGNOSIS,
          accessLevel: 'read'
        }
      ]
    }, 'patient_001')

    expect(result.success).toBe(true)
    expect(result.data?.consentTokenId).toBe('consent_001')
    expect(result.steps).toContain('Consent granted successfully')
  })

  it('should complete consent revocation workflow successfully', async () => {
    // Mock consent revocation
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        transactionId: 'tx_revoke_123'
      }
    })

    // Mock revocation verification (consent should be inactive)
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        tokenId: 'consent_001',
        isActive: false,
        revokedAt: new Date()
      }
    })

    const result = await consentWorkflow.revokeConsent('consent_001')

    expect(result.success).toBe(true)
    expect(result.data?.revoked).toBe(true)
    expect(result.steps).toContain('Consent revoked successfully')
  })
})

describe('Record Access Workflow Integration', () => {
  let accessWorkflow: RecordAccessWorkflow
  let apiClient: any

  beforeEach(async () => {
    const apiModule = await import('@/lib/api')
    apiClient = apiModule.apiClient
    accessWorkflow = new RecordAccessWorkflow()
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue('mock_auth_token')
    
    // Mock stored encryption keys
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'record_keys_doctor_001') {
        return JSON.stringify([{
          recordId: 'record_001',
          key: Array.from(new Uint8Array(32).fill(1)),
          createdAt: Date.now()
        }])
      }
      return 'mock_auth_token'
    })
  })

  it('should complete record access workflow successfully', async () => {
    // Mock record access permission check
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        record: {
          recordId: 'record_001',
          patientId: 'patient_001',
          metadata: {
            title: 'Test Record',
            mimeType: 'application/pdf',
            fileSize: 1024
          }
        },
        ipfsHash: 'QmTest123',
        hasAccess: true
      }
    })

    // Mock IPFS file retrieval
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        encryptedData: Array.from(new Uint8Array([1, 2, 3, 4, 5]))
      }
    })

    const result = await accessWorkflow.execute('record_001', 'doctor_001', 'password123')

    expect(result.success).toBe(true)
    expect(result.data?.file).toBeInstanceOf(Blob)
    expect(result.data?.metadata.title).toBe('Test Record')
    expect(result.steps).toContain('Record accessed successfully')
  })

  it('should handle access denied scenario', async () => {
    // Mock access denied
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        hasAccess: false
      }
    })

    const result = await accessWorkflow.execute('record_001', 'unauthorized_user', 'password123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied or record not found')
  })
})

describe('Complete System Integration Tests', () => {
  let apiClient: any

  beforeEach(async () => {
    const apiModule = await import('@/lib/api')
    apiClient = apiModule.apiClient
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('should complete full patient workflow: registration -> login -> upload record -> grant consent', async () => {
    // Step 1: Patient Registration
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: { userId: 'patient_test', status: 'pending_doctor_approval', transactionId: 'tx_1' }
    })

    const registrationResult = await workflowOrchestrator.executeUserOnboarding({
      userId: 'patient_test',
      role: UserRole.PATIENT,
      password: 'secure_password',
      confirmPassword: 'secure_password'
    })

    expect(registrationResult.success).toBe(true)

    // Step 2: Patient Login
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, data: { nonce: 'nonce_123' } })
      .mockResolvedValueOnce({
        success: true,
        data: {
          token: 'jwt_token',
          user: { userId: 'patient_test', role: UserRole.PATIENT },
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        }
      })

    const loginResult = await workflowOrchestrator.executeAuthentication({
      userId: 'patient_test',
      password: 'secure_password'
    })

    expect(loginResult.success).toBe(true)

    // Step 3: Upload Medical Record
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, data: { ipfsHash: 'QmRecord123' } })
      .mockResolvedValueOnce({ success: true, data: { recordId: 'record_test', transactionId: 'tx_2' } })

    const mockFile = new File(['medical data'], 'record.pdf', { type: 'application/pdf' })
    
    const recordResult = await workflowOrchestrator.executeRecordManagement({
      file: mockFile,
      title: 'Test Medical Record',
      description: 'Integration test record',
      recordType: RecordType.DIAGNOSIS
    }, 'patient_test', 'secure_password')

    expect(recordResult.success).toBe(true)

    // Step 4: Grant Consent to Doctor
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: { userId: 'doctor_test', role: UserRole.DOCTOR, registrationStatus: 'approved' }
    })
    
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: { consentTokenId: 'consent_test', transactionId: 'tx_3' }
    })
    
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: { tokenId: 'consent_test', isActive: true }
    })

    const consentResult = await workflowOrchestrator.executeConsentManagement({
      action: 'grant',
      providerId: 'doctor_test',
      permissions: [{ resourceType: RecordType.DIAGNOSIS, accessLevel: 'read' }]
    }, 'patient_test')

    expect(consentResult.success).toBe(true)

    // Verify all workflows completed successfully
    expect(registrationResult.success).toBe(true)
    expect(loginResult.success).toBe(true)
    expect(recordResult.success).toBe(true)
    expect(consentResult.success).toBe(true)
  })

  it('should complete full doctor workflow: login -> access patient record', async () => {
    // Setup: Doctor login
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, data: { nonce: 'nonce_456' } })
      .mockResolvedValueOnce({
        success: true,
        data: {
          token: 'doctor_jwt_token',
          user: { userId: 'doctor_test', role: UserRole.DOCTOR },
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        }
      })

    const loginResult = await workflowOrchestrator.executeAuthentication({
      userId: 'doctor_test',
      password: 'doctor_password'
    })

    expect(loginResult.success).toBe(true)

    // Mock stored encryption keys for doctor
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'record_keys_doctor_test') {
        return JSON.stringify([{
          recordId: 'patient_record_001',
          key: Array.from(new Uint8Array(32).fill(2)),
          createdAt: Date.now()
        }])
      }
      return 'doctor_jwt_token'
    })

    // Access patient record
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        success: true,
        data: {
          record: {
            recordId: 'patient_record_001',
            patientId: 'patient_test',
            metadata: { title: 'Patient Diagnosis', mimeType: 'application/pdf', fileSize: 2048 }
          },
          ipfsHash: 'QmPatientRecord123',
          hasAccess: true
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: { encryptedData: Array.from(new Uint8Array([10, 20, 30, 40, 50])) }
      })

    const accessResult = await workflowOrchestrator.executeRecordAccess(
      'patient_record_001',
      'doctor_test',
      'doctor_password'
    )

    expect(accessResult.success).toBe(true)
    expect(accessResult.data?.file).toBeInstanceOf(Blob)
  })

  it('should complete multi-role healthcare workflow with audit trail verification', async () => {
    // Simulate complete healthcare scenario with multiple roles
    const testScenario = {
      patient: 'patient_multi_001',
      doctor: 'doctor_multi_001',
      lab: 'lab_multi_001',
      insurer: 'insurer_multi_001',
      admin: 'admin_multi_001'
    }

    // Step 1: All users register and get approved
    for (const [role, userId] of Object.entries(testScenario)) {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        data: { userId, status: 'pending_approval', transactionId: `tx_${role}` }
      })

      const registrationResult = await workflowOrchestrator.executeUserOnboarding({
        userId,
        role: role.toUpperCase() as UserRole,
        password: `${role}_password`,
        confirmPassword: `${role}_password`
      })

      expect(registrationResult.success).toBe(true)
    }

    // Step 2: Patient uploads initial medical record
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, data: { nonce: 'patient_nonce' } })
      .mockResolvedValueOnce({
        success: true,
        data: { token: 'patient_token', user: { userId: testScenario.patient, role: UserRole.PATIENT } }
      })
      .mockResolvedValueOnce({ success: true, data: { ipfsHash: 'QmPatientRecord' } })
      .mockResolvedValueOnce({ success: true, data: { recordId: 'record_001', transactionId: 'tx_record' } })

    const patientFile = new File(['patient medical history'], 'history.pdf', { type: 'application/pdf' })
    const recordUploadResult = await workflowOrchestrator.executeRecordManagement({
      file: patientFile,
      title: 'Medical History',
      description: 'Complete medical history',
      recordType: RecordType.DIAGNOSIS
    }, testScenario.patient, 'patient_password')

    expect(recordUploadResult.success).toBe(true)

    // Step 3: Patient grants consent to doctor and lab
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ success: true, data: { userId: testScenario.doctor, role: UserRole.DOCTOR } })
      .mockResolvedValueOnce({ success: true, data: { userId: testScenario.lab, role: UserRole.LABORATORY } })

    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, data: { consentTokenId: 'consent_doctor', transactionId: 'tx_consent_1' } })
      .mockResolvedValueOnce({ success: true, data: { consentTokenId: 'consent_lab', transactionId: 'tx_consent_2' } })

    const doctorConsentResult = await workflowOrchestrator.executeConsentManagement({
      action: 'grant',
      providerId: testScenario.doctor,
      permissions: [
        { resourceType: RecordType.DIAGNOSIS, accessLevel: 'read' },
        { resourceType: RecordType.PRESCRIPTION, accessLevel: 'write' }
      ]
    }, testScenario.patient)

    const labConsentResult = await workflowOrchestrator.executeConsentManagement({
      action: 'grant',
      providerId: testScenario.lab,
      permissions: [{ resourceType: RecordType.LAB_RESULT, accessLevel: 'write' }]
    }, testScenario.patient)

    expect(doctorConsentResult.success).toBe(true)
    expect(labConsentResult.success).toBe(true)

    // Step 4: Doctor accesses record and creates prescription
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === `record_keys_${testScenario.doctor}`) {
        return JSON.stringify([{ recordId: 'record_001', key: Array.from(new Uint8Array(32).fill(3)) }])
      }
      return 'doctor_token'
    })

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        success: true,
        data: {
          record: { recordId: 'record_001', patientId: testScenario.patient },
          ipfsHash: 'QmPatientRecord',
          hasAccess: true
        }
      })
      .mockResolvedValueOnce({ success: true, data: { encryptedData: Array.from(new Uint8Array([1, 2, 3])) } })

    const doctorAccessResult = await workflowOrchestrator.executeRecordAccess(
      'record_001',
      testScenario.doctor,
      'doctor_password'
    )

    expect(doctorAccessResult.success).toBe(true)

    // Doctor creates prescription
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, data: { ipfsHash: 'QmPrescription' } })
      .mockResolvedValueOnce({ success: true, data: { recordId: 'prescription_001', transactionId: 'tx_prescription' } })

    const prescriptionFile = new File(['prescription data'], 'prescription.pdf', { type: 'application/pdf' })
    const prescriptionResult = await workflowOrchestrator.executeRecordManagement({
      file: prescriptionFile,
      title: 'Prescription',
      description: 'Patient prescription',
      recordType: RecordType.PRESCRIPTION
    }, testScenario.doctor, 'doctor_password')

    expect(prescriptionResult.success).toBe(true)

    // Step 5: Lab uploads test results
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, data: { ipfsHash: 'QmLabResult' } })
      .mockResolvedValueOnce({ success: true, data: { recordId: 'lab_result_001', transactionId: 'tx_lab' } })

    const labResultFile = new File(['lab test results'], 'lab_results.pdf', { type: 'application/pdf' })
    const labResultUpload = await workflowOrchestrator.executeRecordManagement({
      file: labResultFile,
      title: 'Lab Results',
      description: 'Blood test results',
      recordType: RecordType.LAB_RESULT
    }, testScenario.lab, 'lab_password')

    expect(labResultUpload.success).toBe(true)

    // Step 6: Patient grants limited consent to insurer
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: { userId: testScenario.insurer, role: UserRole.INSURER }
    })

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: { consentTokenId: 'consent_insurer', transactionId: 'tx_consent_insurer' }
    })

    const insurerConsentResult = await workflowOrchestrator.executeConsentManagement({
      action: 'grant',
      providerId: testScenario.insurer,
      permissions: [{ resourceType: RecordType.DIAGNOSIS, accessLevel: 'read' }],
      expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }, testScenario.patient)

    expect(insurerConsentResult.success).toBe(true)

    // Step 7: Verify comprehensive audit trail
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        entries: [
          { eventType: 'user_registration', userId: testScenario.patient, timestamp: new Date() },
          { eventType: 'user_registration', userId: testScenario.doctor, timestamp: new Date() },
          { eventType: 'user_registration', userId: testScenario.lab, timestamp: new Date() },
          { eventType: 'record_created', userId: testScenario.patient, resourceId: 'record_001', timestamp: new Date() },
          { eventType: 'consent_granted', userId: testScenario.patient, resourceId: 'consent_doctor', timestamp: new Date() },
          { eventType: 'consent_granted', userId: testScenario.patient, resourceId: 'consent_lab', timestamp: new Date() },
          { eventType: 'record_accessed', userId: testScenario.doctor, resourceId: 'record_001', timestamp: new Date() },
          { eventType: 'record_created', userId: testScenario.doctor, resourceId: 'prescription_001', timestamp: new Date() },
          { eventType: 'record_created', userId: testScenario.lab, resourceId: 'lab_result_001', timestamp: new Date() },
          { eventType: 'consent_granted', userId: testScenario.patient, resourceId: 'consent_insurer', timestamp: new Date() }
        ]
      }
    })

    const auditResult = await workflowOrchestrator.executeAuditQuery({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      includeAllUsers: true
    })

    expect(auditResult.success).toBe(true)
    expect(auditResult.data?.entries.length).toBeGreaterThanOrEqual(10)

    // Verify all expected audit events are present
    const auditEvents = auditResult.data?.entries.map((entry: any) => entry.eventType) || []
    expect(auditEvents).toContain('user_registration')
    expect(auditEvents).toContain('record_created')
    expect(auditEvents).toContain('consent_granted')
    expect(auditEvents).toContain('record_accessed')
  })
})

describe('Error Handling and Recovery Integration', () => {
  let apiClient: any

  beforeEach(async () => {
    const apiModule = await import('@/lib/api')
    apiClient = apiModule.apiClient
    vi.clearAllMocks()
  })

  it('should handle network failures gracefully', async () => {
    // Mock network error
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'))

    const result = await workflowOrchestrator.executeUserOnboarding({
      userId: 'test_user',
      role: UserRole.PATIENT,
      password: 'password',
      confirmPassword: 'password'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Network error')
  })

  it('should handle blockchain transaction failures', async () => {
    // Mock blockchain failure
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: false,
      error: {
        code: 'BLOCKCHAIN_ERROR',
        message: 'Transaction failed to commit',
        timestamp: new Date(),
        requestId: 'req_error'
      }
    })

    const registrationWorkflow = new UserRegistrationWorkflow()
    const result = await registrationWorkflow.execute({
      userId: 'test_user',
      role: UserRole.DOCTOR,
      password: 'password123'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Transaction failed to commit')
  })

  it('should handle cryptographic key generation failures', async () => {
    // Mock key generation failure
    const { PQCKeyManager } = await import('@/lib/crypto/key-manager')
    const mockKeyManager = vi.mocked(PQCKeyManager)
    
    mockKeyManager.mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      generateUserKeys: vi.fn().mockRejectedValue(new Error('Key generation failed')),
      hasUserKeys: vi.fn().mockReturnValue(false),
      getUserKeys: vi.fn().mockResolvedValue(null),
      exportPublicKeys: vi.fn().mockResolvedValue(null)
    }) as any)

    const registrationWorkflow = new UserRegistrationWorkflow()
    const result = await registrationWorkflow.execute({
      userId: 'test_user',
      role: UserRole.PATIENT,
      password: 'password123'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Key generation failed')
  })
})

describe('Audit Trail and Compliance Integration Tests', () => {
  let apiClient: any

  beforeEach(async () => {
    const apiModule = await import('@/lib/api')
    apiClient = apiModule.apiClient
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('should generate comprehensive audit trails for all system activities', async () => {
    // Mock audit trail API responses
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        entries: [
          {
            entryId: 'audit_001',
            eventType: 'user_registration',
            userId: 'patient_audit_001',
            timestamp: new Date('2024-01-01T10:00:00Z'),
            details: { role: UserRole.PATIENT },
            signature: 'audit_signature_001',
            blockNumber: 100,
            transactionId: 'tx_audit_001'
          },
          {
            entryId: 'audit_002',
            eventType: 'login_attempt',
            userId: 'patient_audit_001',
            timestamp: new Date('2024-01-01T10:05:00Z'),
            details: { success: true, ipAddress: '192.168.1.1' },
            signature: 'audit_signature_002',
            blockNumber: 101,
            transactionId: 'tx_audit_002'
          },
          {
            entryId: 'audit_003',
            eventType: 'record_created',
            userId: 'patient_audit_001',
            resourceId: 'record_audit_001',
            timestamp: new Date('2024-01-01T10:10:00Z'),
            details: { recordType: RecordType.DIAGNOSIS, ipfsHash: 'QmAuditRecord' },
            signature: 'audit_signature_003',
            blockNumber: 102,
            transactionId: 'tx_audit_003'
          },
          {
            entryId: 'audit_004',
            eventType: 'consent_granted',
            userId: 'patient_audit_001',
            resourceId: 'consent_audit_001',
            timestamp: new Date('2024-01-01T10:15:00Z'),
            details: { providerId: 'doctor_audit_001', permissions: ['read'] },
            signature: 'audit_signature_004',
            blockNumber: 103,
            transactionId: 'tx_audit_004'
          },
          {
            entryId: 'audit_005',
            eventType: 'record_accessed',
            userId: 'doctor_audit_001',
            resourceId: 'record_audit_001',
            timestamp: new Date('2024-01-01T10:20:00Z'),
            details: { accessedBy: 'doctor_audit_001', consentTokenId: 'consent_audit_001' },
            signature: 'audit_signature_005',
            blockNumber: 104,
            transactionId: 'tx_audit_005'
          }
        ],
        totalEntries: 5,
        hasMore: false
      }
    })

    const auditResult = await workflowOrchestrator.executeAuditQuery({
      startDate: new Date('2024-01-01T00:00:00Z').toISOString(),
      endDate: new Date('2024-01-01T23:59:59Z').toISOString(),
      eventTypes: ['user_registration', 'login_attempt', 'record_created', 'consent_granted', 'record_accessed']
    })

    expect(auditResult.success).toBe(true)
    expect(auditResult.data?.entries).toHaveLength(5)

    // Verify audit entry structure and integrity
    const entries = auditResult.data?.entries || []
    entries.forEach((entry: any) => {
      expect(entry).toHaveProperty('entryId')
      expect(entry).toHaveProperty('eventType')
      expect(entry).toHaveProperty('userId')
      expect(entry).toHaveProperty('timestamp')
      expect(entry).toHaveProperty('signature')
      expect(entry).toHaveProperty('blockNumber')
      expect(entry).toHaveProperty('transactionId')
      expect(entry.blockNumber).toBeGreaterThan(0)
      expect(entry.signature).toBeTruthy()
    })

    // Verify chronological ordering
    for (let i = 1; i < entries.length; i++) {
      const prevTimestamp = new Date(entries[i - 1].timestamp).getTime()
      const currTimestamp = new Date(entries[i].timestamp).getTime()
      expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp)
    }

    // Verify all expected event types are present
    const eventTypes = entries.map((entry: any) => entry.eventType)
    expect(eventTypes).toContain('user_registration')
    expect(eventTypes).toContain('login_attempt')
    expect(eventTypes).toContain('record_created')
    expect(eventTypes).toContain('consent_granted')
    expect(eventTypes).toContain('record_accessed')
  })

  it('should provide filtered audit queries for compliance reporting', async () => {
    // Test user-specific audit filtering
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        entries: [
          {
            entryId: 'user_audit_001',
            eventType: 'user_registration',
            userId: 'specific_patient_001',
            timestamp: new Date(),
            signature: 'sig_001',
            blockNumber: 200,
            transactionId: 'tx_200'
          },
          {
            entryId: 'user_audit_002',
            eventType: 'record_created',
            userId: 'specific_patient_001',
            resourceId: 'record_specific_001',
            timestamp: new Date(),
            signature: 'sig_002',
            blockNumber: 201,
            transactionId: 'tx_201'
          }
        ],
        totalEntries: 2
      }
    })

    const userAuditResult = await workflowOrchestrator.executeAuditQuery({
      userId: 'specific_patient_001',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    })

    expect(userAuditResult.success).toBe(true)
    expect(userAuditResult.data?.entries).toHaveLength(2)
    userAuditResult.data?.entries.forEach((entry: any) => {
      expect(entry.userId).toBe('specific_patient_001')
    })

    // Test event type filtering
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        entries: [
          {
            entryId: 'consent_audit_001',
            eventType: 'consent_granted',
            userId: 'patient_consent_001',
            resourceId: 'consent_token_001',
            timestamp: new Date(),
            signature: 'consent_sig_001',
            blockNumber: 300,
            transactionId: 'tx_300'
          },
          {
            entryId: 'consent_audit_002',
            eventType: 'consent_revoked',
            userId: 'patient_consent_001',
            resourceId: 'consent_token_001',
            timestamp: new Date(),
            signature: 'consent_sig_002',
            blockNumber: 301,
            transactionId: 'tx_301'
          }
        ],
        totalEntries: 2
      }
    })

    const consentAuditResult = await workflowOrchestrator.executeAuditQuery({
      eventTypes: ['consent_granted', 'consent_revoked'],
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    })

    expect(consentAuditResult.success).toBe(true)
    expect(consentAuditResult.data?.entries).toHaveLength(2)
    consentAuditResult.data?.entries.forEach((entry: any) => {
      expect(['consent_granted', 'consent_revoked']).toContain(entry.eventType)
    })
  })

  it('should generate compliance reports with required metrics', async () => {
    // Mock compliance report API response
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        reportId: 'compliance_report_001',
        generatedAt: new Date().toISOString(),
        reportPeriod: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        metrics: {
          totalUsers: 150,
          totalRecords: 1250,
          totalConsents: 890,
          accessAttempts: {
            successful: 2340,
            failed: 45,
            total: 2385
          },
          failedLogins: 23,
          dataBreachIncidents: 0,
          auditTrailIntegrity: {
            verified: true,
            totalEntries: 5670,
            corruptedEntries: 0,
            lastVerificationDate: new Date().toISOString()
          },
          consentCompliance: {
            activeConsents: 890,
            expiredConsents: 156,
            revokedConsents: 78,
            complianceRate: 98.5
          },
          userActivity: {
            patients: { registrations: 85, logins: 1240 },
            doctors: { registrations: 35, logins: 680 },
            laboratories: { registrations: 15, logins: 230 },
            insurers: { registrations: 10, logins: 145 },
            auditors: { registrations: 5, logins: 50 }
          },
          recordActivity: {
            uploads: 1250,
            accesses: 2340,
            modifications: 45,
            deletions: 0
          },
          securityMetrics: {
            encryptionCompliance: 100,
            signatureVerificationRate: 99.8,
            unauthorizedAccessAttempts: 12,
            blockedRequests: 67
          }
        },
        recommendations: [
          'Review failed login attempts for potential security threats',
          'Monitor consent expiration dates for proactive renewal',
          'Investigate unauthorized access attempts'
        ]
      }
    })

    const complianceResult = await workflowOrchestrator.executeComplianceReport({
      reportType: 'monthly',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      includeRecommendations: true
    })

    expect(complianceResult.success).toBe(true)
    
    const report = complianceResult.data
    expect(report).toHaveProperty('reportId')
    expect(report).toHaveProperty('generatedAt')
    expect(report).toHaveProperty('metrics')
    expect(report).toHaveProperty('recommendations')

    // Verify required compliance metrics
    const metrics = report?.metrics
    expect(metrics).toHaveProperty('totalUsers')
    expect(metrics).toHaveProperty('totalRecords')
    expect(metrics).toHaveProperty('totalConsents')
    expect(metrics).toHaveProperty('accessAttempts')
    expect(metrics).toHaveProperty('auditTrailIntegrity')
    expect(metrics).toHaveProperty('consentCompliance')
    expect(metrics).toHaveProperty('userActivity')
    expect(metrics).toHaveProperty('recordActivity')
    expect(metrics).toHaveProperty('securityMetrics')

    // Verify audit trail integrity
    expect(metrics?.auditTrailIntegrity.verified).toBe(true)
    expect(metrics?.auditTrailIntegrity.corruptedEntries).toBe(0)

    // Verify consent compliance metrics
    expect(metrics?.consentCompliance.complianceRate).toBeGreaterThan(95)
    expect(metrics?.consentCompliance.activeConsents).toBeGreaterThan(0)

    // Verify security metrics
    expect(metrics?.securityMetrics.encryptionCompliance).toBe(100)
    expect(metrics?.securityMetrics.signatureVerificationRate).toBeGreaterThan(99)

    // Verify recommendations are provided
    expect(report?.recommendations).toBeInstanceOf(Array)
    expect(report?.recommendations.length).toBeGreaterThan(0)
  })

  it('should verify audit trail immutability and detect tampering', async () => {
    // Mock audit trail integrity verification
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        verified: true,
        totalEntries: 1000,
        verifiedEntries: 1000,
        corruptedEntries: 0,
        integrityHash: 'sha256_integrity_hash_12345',
        lastVerificationDate: new Date().toISOString(),
        blockchainConsistency: {
          verified: true,
          lastBlockNumber: 500,
          hashChainValid: true
        },
        signatureVerification: {
          totalSignatures: 1000,
          validSignatures: 1000,
          invalidSignatures: 0
        }
      }
    })

    const integrityResult = await workflowOrchestrator.executeAuditIntegrityCheck()

    expect(integrityResult.success).toBe(true)
    
    const verification = integrityResult.data
    expect(verification?.verified).toBe(true)
    expect(verification?.corruptedEntries).toBe(0)
    expect(verification?.integrityHash).toBeTruthy()
    expect(verification?.blockchainConsistency.verified).toBe(true)
    expect(verification?.blockchainConsistency.hashChainValid).toBe(true)
    expect(verification?.signatureVerification.invalidSignatures).toBe(0)

    // Test tampering detection scenario
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        verified: false,
        totalEntries: 1000,
        verifiedEntries: 998,
        corruptedEntries: 2,
        integrityHash: 'sha256_integrity_hash_tampered',
        lastVerificationDate: new Date().toISOString(),
        blockchainConsistency: {
          verified: false,
          lastBlockNumber: 500,
          hashChainValid: false,
          tamperedBlocks: [498, 499]
        },
        signatureVerification: {
          totalSignatures: 1000,
          validSignatures: 998,
          invalidSignatures: 2
        },
        tamperedEntries: [
          {
            entryId: 'tampered_001',
            originalHash: 'original_hash_001',
            currentHash: 'tampered_hash_001',
            detectedAt: new Date().toISOString()
          },
          {
            entryId: 'tampered_002',
            originalHash: 'original_hash_002',
            currentHash: 'tampered_hash_002',
            detectedAt: new Date().toISOString()
          }
        ]
      }
    })

    const tamperedResult = await workflowOrchestrator.executeAuditIntegrityCheck()

    expect(tamperedResult.success).toBe(true)
    
    const tamperedVerification = tamperedResult.data
    expect(tamperedVerification?.verified).toBe(false)
    expect(tamperedVerification?.corruptedEntries).toBe(2)
    expect(tamperedVerification?.blockchainConsistency.verified).toBe(false)
    expect(tamperedVerification?.blockchainConsistency.hashChainValid).toBe(false)
    expect(tamperedVerification?.signatureVerification.invalidSignatures).toBe(2)
    expect(tamperedVerification?.tamperedEntries).toHaveLength(2)
  })

  it('should handle audit query pagination and large datasets', async () => {
    // Mock paginated audit response
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        success: true,
        data: {
          entries: Array.from({ length: 100 }, (_, i) => ({
            entryId: `audit_page1_${i}`,
            eventType: 'record_accessed',
            userId: `user_${i % 10}`,
            timestamp: new Date(Date.now() - i * 60000),
            signature: `sig_${i}`,
            blockNumber: 1000 + i,
            transactionId: `tx_${1000 + i}`
          })),
          totalEntries: 250,
          hasMore: true,
          nextPageToken: 'page_2_token'
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          entries: Array.from({ length: 100 }, (_, i) => ({
            entryId: `audit_page2_${i}`,
            eventType: 'record_accessed',
            userId: `user_${i % 10}`,
            timestamp: new Date(Date.now() - (100 + i) * 60000),
            signature: `sig_${100 + i}`,
            blockNumber: 1100 + i,
            transactionId: `tx_${1100 + i}`
          })),
          totalEntries: 250,
          hasMore: true,
          nextPageToken: 'page_3_token'
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          entries: Array.from({ length: 50 }, (_, i) => ({
            entryId: `audit_page3_${i}`,
            eventType: 'record_accessed',
            userId: `user_${i % 10}`,
            timestamp: new Date(Date.now() - (200 + i) * 60000),
            signature: `sig_${200 + i}`,
            blockNumber: 1200 + i,
            transactionId: `tx_${1200 + i}`
          })),
          totalEntries: 250,
          hasMore: false,
          nextPageToken: null
        }
      })

    // Test paginated audit query
    const paginatedResult = await workflowOrchestrator.executeAuditQuery({
      eventTypes: ['record_accessed'],
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      pageSize: 100,
      includeAllPages: true
    })

    expect(paginatedResult.success).toBe(true)
    expect(paginatedResult.data?.entries).toHaveLength(250)
    expect(paginatedResult.data?.totalEntries).toBe(250)

    // Verify all entries are unique
    const entryIds = paginatedResult.data?.entries.map((entry: any) => entry.entryId) || []
    const uniqueEntryIds = new Set(entryIds)
    expect(uniqueEntryIds.size).toBe(250)

    // Verify chronological ordering across pages
    const timestamps = paginatedResult.data?.entries.map((entry: any) => new Date(entry.timestamp).getTime()) || []
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1])
    }
  })
})

describe('System Performance and Stress Testing Integration', () => {
  let apiClient: any

  beforeEach(async () => {
    const apiModule = await import('@/lib/api')
    apiClient = apiModule.apiClient
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('should handle concurrent user operations without data corruption', async () => {
    // Simulate concurrent operations from multiple users
    const concurrentOperations = [
      // Patient 1 uploads record
      () => {
        vi.mocked(apiClient.post)
          .mockResolvedValueOnce({ success: true, data: { ipfsHash: 'QmConcurrent1' } })
          .mockResolvedValueOnce({ success: true, data: { recordId: 'concurrent_record_1', transactionId: 'tx_c1' } })
        
        return workflowOrchestrator.executeRecordManagement({
          file: new File(['data1'], 'record1.pdf'),
          title: 'Concurrent Record 1',
          recordType: RecordType.DIAGNOSIS
        }, 'patient_concurrent_1', 'password1')
      },
      
      // Patient 2 uploads record
      () => {
        vi.mocked(apiClient.post)
          .mockResolvedValueOnce({ success: true, data: { ipfsHash: 'QmConcurrent2' } })
          .mockResolvedValueOnce({ success: true, data: { recordId: 'concurrent_record_2', transactionId: 'tx_c2' } })
        
        return workflowOrchestrator.executeRecordManagement({
          file: new File(['data2'], 'record2.pdf'),
          title: 'Concurrent Record 2',
          recordType: RecordType.LAB_RESULT
        }, 'patient_concurrent_2', 'password2')
      },
      
      // Patient 1 grants consent
      () => {
        vi.mocked(apiClient.get).mockResolvedValueOnce({
          success: true,
          data: { userId: 'doctor_concurrent', role: UserRole.DOCTOR }
        })
        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { consentTokenId: 'concurrent_consent_1', transactionId: 'tx_consent_c1' }
        })
        
        return workflowOrchestrator.executeConsentManagement({
          action: 'grant',
          providerId: 'doctor_concurrent',
          permissions: [{ resourceType: RecordType.DIAGNOSIS, accessLevel: 'read' }]
        }, 'patient_concurrent_1')
      },
      
      // Doctor accesses records
      () => {
        localStorageMock.getItem.mockImplementation((key) => {
          if (key === 'record_keys_doctor_concurrent') {
            return JSON.stringify([
              { recordId: 'concurrent_record_1', key: Array.from(new Uint8Array(32).fill(5)) }
            ])
          }
          return 'doctor_token'
        })
        
        vi.mocked(apiClient.get)
          .mockResolvedValueOnce({
            success: true,
            data: {
              record: { recordId: 'concurrent_record_1', patientId: 'patient_concurrent_1' },
              ipfsHash: 'QmConcurrent1',
              hasAccess: true
            }
          })
          .mockResolvedValueOnce({ success: true, data: { encryptedData: Array.from(new Uint8Array([5, 6, 7])) } })
        
        return workflowOrchestrator.executeRecordAccess(
          'concurrent_record_1',
          'doctor_concurrent',
          'doctor_password'
        )
      }
    ]

    // Execute all operations concurrently
    const results = await Promise.all(concurrentOperations.map(op => op()))

    // Verify all operations completed successfully
    results.forEach((result, index) => {
      expect(result.success).toBe(true)
    })

    // Verify no data corruption occurred
    expect(results[0].data?.recordId).toBe('concurrent_record_1')
    expect(results[1].data?.recordId).toBe('concurrent_record_2')
    expect(results[2].data?.consentTokenId).toBe('concurrent_consent_1')
    expect(results[3].data?.file).toBeInstanceOf(Blob)
  })

  it('should maintain system stability under high load', async () => {
    // Simulate high load scenario with multiple rapid operations
    const highLoadOperations = Array.from({ length: 50 }, (_, i) => {
      return async () => {
        // Mock successful responses for each operation
        vi.mocked(apiClient.post)
          .mockResolvedValueOnce({ success: true, data: { ipfsHash: `QmHighLoad${i}` } })
          .mockResolvedValueOnce({ success: true, data: { recordId: `high_load_record_${i}`, transactionId: `tx_hl_${i}` } })

        return workflowOrchestrator.executeRecordManagement({
          file: new File([`high load data ${i}`], `record${i}.pdf`),
          title: `High Load Record ${i}`,
          recordType: RecordType.CONSULTATION_NOTE
        }, `patient_load_${i % 10}`, `password${i % 10}`)
      }
    })

    // Execute operations in batches to simulate realistic load
    const batchSize = 10
    const batches = []
    for (let i = 0; i < highLoadOperations.length; i += batchSize) {
      batches.push(highLoadOperations.slice(i, i + batchSize))
    }

    const allResults = []
    for (const batch of batches) {
      const batchResults = await Promise.all(batch.map(op => op()))
      allResults.push(...batchResults)
      
      // Small delay between batches to simulate realistic timing
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Verify all operations completed successfully
    expect(allResults).toHaveLength(50)
    allResults.forEach((result, index) => {
      expect(result.success).toBe(true)
      expect(result.data?.recordId).toBe(`high_load_record_${index}`)
    })

    // Verify no duplicate record IDs
    const recordIds = allResults.map(result => result.data?.recordId)
    const uniqueRecordIds = new Set(recordIds)
    expect(uniqueRecordIds.size).toBe(50)
  })
})