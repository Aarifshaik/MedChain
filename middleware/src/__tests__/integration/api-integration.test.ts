/**
 * Middleware API Integration Tests
 * Tests complete API workflows and blockchain integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import request from 'supertest'
import { app } from '../../index'
import { blockchainService } from '../../services/blockchainService'
import { ipfsService } from '../../services/ipfsService'
import { UserRole, RecordType } from '../../types/auth'

// Test data
const testUsers = {
  patient: {
    userId: 'test_patient_001',
    role: UserRole.PATIENT,
    publicKeys: {
      kyberPublicKey: 'test_kyber_public_key_patient',
      dilithiumPublicKey: 'test_dilithium_public_key_patient'
    }
  },
  doctor: {
    userId: 'test_doctor_001', 
    role: UserRole.DOCTOR,
    publicKeys: {
      kyberPublicKey: 'test_kyber_public_key_doctor',
      dilithiumPublicKey: 'test_dilithium_public_key_doctor'
    }
  },
  admin: {
    userId: 'test_admin_001',
    role: UserRole.SYSTEM_ADMIN,
    publicKeys: {
      kyberPublicKey: 'test_kyber_public_key_admin',
      dilithiumPublicKey: 'test_dilithium_public_key_admin'
    }
  }
}

let authTokens: { [key: string]: string } = {}

describe('System Integration Tests - Complete Workflows', () => {
  beforeAll(async () => {
    // Initialize blockchain and IPFS connections
    await blockchainService.initialize()
    await ipfsService.initialize()
  })

  afterAll(async () => {
    // Cleanup connections
    await blockchainService.disconnect()
    await ipfsService.disconnect()
  })

  beforeEach(async () => {
    // Reset test state
    authTokens = {}
  })

  describe('Patient Record Management Workflow Integration', () => {
    it('should complete full patient record lifecycle: register -> login -> upload -> access', async () => {
      // Step 1: Patient Registration
      const patientRegResponse = await request(app)
        .post('/api/auth/register')
        .send({
          userId: testUsers.patient.userId,
          role: testUsers.patient.role,
          publicKeys: testUsers.patient.publicKeys
        })
        .expect(201)

      expect(patientRegResponse.body.success).toBe(true)
      expect(patientRegResponse.body.data.userId).toBe(testUsers.patient.userId)
      expect(patientRegResponse.body.data.status).toBe('pending_doctor_approval')

      // Step 2: Doctor Registration and Admin Approval
      const doctorRegResponse = await request(app)
        .post('/api/auth/register')
        .send({
          userId: testUsers.doctor.userId,
          role: testUsers.doctor.role,
          publicKeys: testUsers.doctor.publicKeys
        })
        .expect(201)

      expect(doctorRegResponse.body.data.status).toBe('pending_admin_approval')

      // Admin registration
      const adminRegResponse = await request(app)
        .post('/api/auth/register')
        .send({
          userId: testUsers.admin.userId,
          role: testUsers.admin.role,
          publicKeys: testUsers.admin.publicKeys
        })
        .expect(201)

      // Admin login
      const adminNonceResponse = await request(app)
        .post('/api/auth/nonce')
        .send({ userId: testUsers.admin.userId })
        .expect(200)

      const adminAuthResponse = await request(app)
        .post('/api/auth/authenticate')
        .send({
          userId: testUsers.admin.userId,
          nonce: adminNonceResponse.body.data.nonce,
          signature: 'mock_admin_signature'
        })
        .expect(200)

      authTokens.admin = adminAuthResponse.body.data.token

      // Admin approves doctor
      const doctorApprovalResponse = await request(app)
        .post('/api/auth/approve')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({
          userId: testUsers.doctor.userId,
          approved: true
        })
        .expect(200)

      expect(doctorApprovalResponse.body.success).toBe(true)

      // Step 3: Doctor Login and Patient Approval
      const doctorNonceResponse = await request(app)
        .post('/api/auth/nonce')
        .send({ userId: testUsers.doctor.userId })
        .expect(200)

      const doctorAuthResponse = await request(app)
        .post('/api/auth/authenticate')
        .send({
          userId: testUsers.doctor.userId,
          nonce: doctorNonceResponse.body.data.nonce,
          signature: 'mock_doctor_signature'
        })
        .expect(200)

      authTokens.doctor = doctorAuthResponse.body.data.token

      // Doctor approves patient
      const patientApprovalResponse = await request(app)
        .post('/api/auth/approve')
        .set('Authorization', `Bearer ${authTokens.doctor}`)
        .send({
          userId: testUsers.patient.userId,
          approved: true
        })
        .expect(200)

      expect(patientApprovalResponse.body.success).toBe(true)

      // Step 4: Patient Login
      const patientNonceResponse = await request(app)
        .post('/api/auth/nonce')
        .send({ userId: testUsers.patient.userId })
        .expect(200)

      const patientAuthResponse = await request(app)
        .post('/api/auth/authenticate')
        .send({
          userId: testUsers.patient.userId,
          nonce: patientNonceResponse.body.data.nonce,
          signature: 'mock_patient_signature'
        })
        .expect(200)

      authTokens.patient = patientAuthResponse.body.data.token
      expect(patientAuthResponse.body.data.user.registrationStatus).toBe('approved')

      // Step 5: Patient Uploads Medical Record
      const mockEncryptedData = Buffer.from('encrypted_medical_record_data')
      
      const recordUploadResponse = await request(app)
        .post('/api/records/upload')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .attach('file', mockEncryptedData, 'medical_record.pdf')
        .field('title', 'Test Medical Record')
        .field('description', 'Integration test medical record')
        .field('recordType', RecordType.DIAGNOSIS)
        .expect(201)

      expect(recordUploadResponse.body.success).toBe(true)
      expect(recordUploadResponse.body.data.recordId).toBeDefined()
      expect(recordUploadResponse.body.data.ipfsHash).toBeDefined()

      const recordId = recordUploadResponse.body.data.recordId
      const ipfsHash = recordUploadResponse.body.data.ipfsHash

      // Step 6: Patient Grants Consent to Doctor
      const consentResponse = await request(app)
        .post('/api/consent/grant')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .send({
          providerId: testUsers.doctor.userId,
          permissions: [
            {
              resourceType: RecordType.DIAGNOSIS,
              accessLevel: 'read'
            }
          ],
          expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201)

      expect(consentResponse.body.success).toBe(true)
      expect(consentResponse.body.data.consentTokenId).toBeDefined()

      const consentTokenId = consentResponse.body.data.consentTokenId

      // Step 7: Doctor Accesses Patient Record
      const recordAccessResponse = await request(app)
        .get(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${authTokens.doctor}`)
        .expect(200)

      expect(recordAccessResponse.body.success).toBe(true)
      expect(recordAccessResponse.body.data.record.recordId).toBe(recordId)
      expect(recordAccessResponse.body.data.ipfsHash).toBe(ipfsHash)
      expect(recordAccessResponse.body.data.hasAccess).toBe(true)

      // Step 8: Verify Audit Trail
      const auditResponse = await request(app)
        .get('/api/audit/trail')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .query({
          userId: testUsers.patient.userId,
          eventType: 'record_created,consent_granted,record_accessed'
        })
        .expect(200)

      expect(auditResponse.body.success).toBe(true)
      expect(auditResponse.body.data.entries.length).toBeGreaterThanOrEqual(3)
      
      // Verify specific audit events
      const auditEntries = auditResponse.body.data.entries
      const recordCreatedEvent = auditEntries.find((entry: any) => entry.eventType === 'record_created')
      const consentGrantedEvent = auditEntries.find((entry: any) => entry.eventType === 'consent_granted')
      const recordAccessedEvent = auditEntries.find((entry: any) => entry.eventType === 'record_accessed')

      expect(recordCreatedEvent).toBeDefined()
      expect(consentGrantedEvent).toBeDefined()
      expect(recordAccessedEvent).toBeDefined()
    })

    it('should handle record access denial when consent is revoked', async () => {
      // Setup: Use existing authenticated users from previous test
      // Patient revokes consent
      const revokeResponse = await request(app)
        .post('/api/consent/revoke')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .send({
          consentTokenId: 'existing_consent_token_id'
        })
        .expect(200)

      expect(revokeResponse.body.success).toBe(true)

      // Doctor attempts to access record - should be denied
      const accessAttemptResponse = await request(app)
        .get('/api/records/test_record_id')
        .set('Authorization', `Bearer ${authTokens.doctor}`)
        .expect(403)

      expect(accessAttemptResponse.body.success).toBe(false)
      expect(accessAttemptResponse.body.error.code).toBe('ACCESS_DENIED')
    })
  })

  describe('Consent Management Across User Roles Integration', () => {
    it('should handle multi-provider consent scenarios', async () => {
      // Setup additional healthcare providers
      const labUser = {
        userId: 'test_lab_001',
        role: UserRole.LABORATORY,
        publicKeys: {
          kyberPublicKey: 'test_kyber_public_key_lab',
          dilithiumPublicKey: 'test_dilithium_public_key_lab'
        }
      }

      const insurerUser = {
        userId: 'test_insurer_001',
        role: UserRole.INSURER,
        publicKeys: {
          kyberPublicKey: 'test_kyber_public_key_insurer',
          dilithiumPublicKey: 'test_dilithium_public_key_insurer'
        }
      }

      // Register and approve lab and insurer
      await request(app)
        .post('/api/auth/register')
        .send(labUser)
        .expect(201)

      await request(app)
        .post('/api/auth/register')
        .send(insurerUser)
        .expect(201)

      // Admin approves both
      await request(app)
        .post('/api/auth/approve')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ userId: labUser.userId, approved: true })
        .expect(200)

      await request(app)
        .post('/api/auth/approve')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ userId: insurerUser.userId, approved: true })
        .expect(200)

      // Patient grants different permissions to different providers
      const doctorConsentResponse = await request(app)
        .post('/api/consent/grant')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .send({
          providerId: testUsers.doctor.userId,
          permissions: [
            { resourceType: RecordType.DIAGNOSIS, accessLevel: 'read' },
            { resourceType: RecordType.PRESCRIPTION, accessLevel: 'write' }
          ]
        })
        .expect(201)

      const labConsentResponse = await request(app)
        .post('/api/consent/grant')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .send({
          providerId: labUser.userId,
          permissions: [
            { resourceType: RecordType.LAB_RESULT, accessLevel: 'write' }
          ]
        })
        .expect(201)

      const insurerConsentResponse = await request(app)
        .post('/api/consent/grant')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .send({
          providerId: insurerUser.userId,
          permissions: [
            { resourceType: RecordType.DIAGNOSIS, accessLevel: 'read' }
          ],
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201)

      // Verify consent status for each provider
      const consentStatusResponse = await request(app)
        .get('/api/consent/status')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .expect(200)

      expect(consentStatusResponse.body.data.activeConsents).toHaveLength(3)

      // Test role-based access validation
      const doctorConsents = consentStatusResponse.body.data.activeConsents.filter(
        (consent: any) => consent.providerId === testUsers.doctor.userId
      )
      expect(doctorConsents[0].permissions).toHaveLength(2)

      const labConsents = consentStatusResponse.body.data.activeConsents.filter(
        (consent: any) => consent.providerId === labUser.userId
      )
      expect(labConsents[0].permissions[0].resourceType).toBe(RecordType.LAB_RESULT)

      const insurerConsents = consentStatusResponse.body.data.activeConsents.filter(
        (consent: any) => consent.providerId === insurerUser.userId
      )
      expect(insurerConsents[0].expirationTime).toBeDefined()
    })

    it('should enforce time-based consent expiration', async () => {
      // Grant short-term consent (1 second)
      const shortConsentResponse = await request(app)
        .post('/api/consent/grant')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .send({
          providerId: testUsers.doctor.userId,
          permissions: [{ resourceType: RecordType.CONSULTATION_NOTE, accessLevel: 'read' }],
          expirationTime: new Date(Date.now() + 1000).toISOString()
        })
        .expect(201)

      const consentTokenId = shortConsentResponse.body.data.consentTokenId

      // Verify consent is initially active
      const initialStatusResponse = await request(app)
        .get(`/api/consent/${consentTokenId}`)
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .expect(200)

      expect(initialStatusResponse.body.data.isActive).toBe(true)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Verify consent has expired
      const expiredStatusResponse = await request(app)
        .get(`/api/consent/${consentTokenId}`)
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .expect(200)

      expect(expiredStatusResponse.body.data.isActive).toBe(false)
    })
  })

  describe('Audit Trail Generation and Compliance Reporting Integration', () => {
    it('should generate comprehensive audit trails for all system activities', async () => {
      // Perform various system activities to generate audit entries
      const activities = [
        // User registration
        () => request(app)
          .post('/api/auth/register')
          .send({
            userId: 'audit_test_user',
            role: UserRole.PATIENT,
            publicKeys: {
              kyberPublicKey: 'audit_test_kyber_key',
              dilithiumPublicKey: 'audit_test_dilithium_key'
            }
          }),
        
        // Failed login attempt
        () => request(app)
          .post('/api/auth/authenticate')
          .send({
            userId: 'nonexistent_user',
            nonce: 'fake_nonce',
            signature: 'invalid_signature'
          }),
        
        // Record upload
        () => request(app)
          .post('/api/records/upload')
          .set('Authorization', `Bearer ${authTokens.patient}`)
          .attach('file', Buffer.from('test_data'), 'test.pdf')
          .field('title', 'Audit Test Record')
          .field('recordType', RecordType.DIAGNOSIS),
        
        // Consent operations
        () => request(app)
          .post('/api/consent/grant')
          .set('Authorization', `Bearer ${authTokens.patient}`)
          .send({
            providerId: testUsers.doctor.userId,
            permissions: [{ resourceType: RecordType.DIAGNOSIS, accessLevel: 'read' }]
          })
      ]

      // Execute activities
      for (const activity of activities) {
        try {
          await activity()
        } catch (error) {
          // Some activities are expected to fail (like invalid login)
        }
      }

      // Retrieve comprehensive audit trail
      const auditResponse = await request(app)
        .get('/api/audit/trail')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .query({
          startDate: new Date(Date.now() - 60000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200)

      expect(auditResponse.body.success).toBe(true)
      expect(auditResponse.body.data.entries.length).toBeGreaterThan(0)

      // Verify audit entry structure
      const auditEntries = auditResponse.body.data.entries
      auditEntries.forEach((entry: any) => {
        expect(entry).toHaveProperty('entryId')
        expect(entry).toHaveProperty('eventType')
        expect(entry).toHaveProperty('userId')
        expect(entry).toHaveProperty('timestamp')
        expect(entry).toHaveProperty('signature')
        expect(entry).toHaveProperty('blockNumber')
        expect(entry).toHaveProperty('transactionId')
      })

      // Verify different event types are captured
      const eventTypes = auditEntries.map((entry: any) => entry.eventType)
      expect(eventTypes).toContain('user_registration')
      expect(eventTypes).toContain('login_attempt')
      expect(eventTypes).toContain('record_created')
      expect(eventTypes).toContain('consent_granted')
    })

    it('should provide filtered audit queries for compliance reporting', async () => {
      // Test user-specific audit trail
      const userAuditResponse = await request(app)
        .get('/api/audit/trail')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .query({ userId: testUsers.patient.userId })
        .expect(200)

      const userEntries = userAuditResponse.body.data.entries
      userEntries.forEach((entry: any) => {
        expect(entry.userId).toBe(testUsers.patient.userId)
      })

      // Test event type filtering
      const consentAuditResponse = await request(app)
        .get('/api/audit/trail')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .query({ eventType: 'consent_granted,consent_revoked' })
        .expect(200)

      const consentEntries = consentAuditResponse.body.data.entries
      consentEntries.forEach((entry: any) => {
        expect(['consent_granted', 'consent_revoked']).toContain(entry.eventType)
      })

      // Test date range filtering
      const dateRangeResponse = await request(app)
        .get('/api/audit/trail')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200)

      expect(dateRangeResponse.body.data.entries.length).toBeGreaterThan(0)
    })

    it('should generate compliance reports with required metrics', async () => {
      // Generate compliance report
      const complianceResponse = await request(app)
        .get('/api/audit/compliance-report')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .query({
          reportType: 'monthly',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200)

      expect(complianceResponse.body.success).toBe(true)
      
      const report = complianceResponse.body.data
      expect(report).toHaveProperty('reportId')
      expect(report).toHaveProperty('generatedAt')
      expect(report).toHaveProperty('metrics')
      
      // Verify required compliance metrics
      const metrics = report.metrics
      expect(metrics).toHaveProperty('totalUsers')
      expect(metrics).toHaveProperty('totalRecords')
      expect(metrics).toHaveProperty('totalConsents')
      expect(metrics).toHaveProperty('accessAttempts')
      expect(metrics).toHaveProperty('failedLogins')
      expect(metrics).toHaveProperty('dataBreachIncidents')
      
      // Verify audit trail integrity
      expect(metrics).toHaveProperty('auditTrailIntegrity')
      expect(metrics.auditTrailIntegrity.verified).toBe(true)
      
      // Verify consent compliance
      expect(metrics).toHaveProperty('consentCompliance')
      expect(metrics.consentCompliance.activeConsents).toBeGreaterThanOrEqual(0)
      expect(metrics.consentCompliance.expiredConsents).toBeGreaterThanOrEqual(0)
    })

    it('should ensure audit trail immutability and integrity', async () => {
      // Get current audit entries
      const initialAuditResponse = await request(app)
        .get('/api/audit/trail')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200)

      const initialEntries = initialAuditResponse.body.data.entries

      // Verify each entry has cryptographic signature
      initialEntries.forEach((entry: any) => {
        expect(entry.signature).toBeDefined()
        expect(entry.blockNumber).toBeGreaterThan(0)
        expect(entry.transactionId).toBeDefined()
      })

      // Verify audit trail integrity check
      const integrityResponse = await request(app)
        .get('/api/audit/verify-integrity')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200)

      expect(integrityResponse.body.success).toBe(true)
      expect(integrityResponse.body.data.verified).toBe(true)
      expect(integrityResponse.body.data.totalEntries).toBe(initialEntries.length)
      expect(integrityResponse.body.data.corruptedEntries).toBe(0)
    })
  })

  describe('Cross-System Error Handling and Recovery', () => {
    it('should handle blockchain network failures gracefully', async () => {
      // Simulate blockchain network failure
      jest.spyOn(blockchainService, 'submitTransaction').mockRejectedValueOnce(
        new Error('Blockchain network unavailable')
      )

      const recordUploadResponse = await request(app)
        .post('/api/records/upload')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .attach('file', Buffer.from('test_data'), 'test.pdf')
        .field('title', 'Test Record')
        .field('recordType', RecordType.DIAGNOSIS)
        .expect(503)

      expect(recordUploadResponse.body.success).toBe(false)
      expect(recordUploadResponse.body.error.code).toBe('BLOCKCHAIN_UNAVAILABLE')
    })

    it('should handle IPFS storage failures with fallback', async () => {
      // Simulate IPFS failure
      jest.spyOn(ipfsService, 'uploadFile').mockRejectedValueOnce(
        new Error('IPFS node unavailable')
      )

      const recordUploadResponse = await request(app)
        .post('/api/records/upload')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .attach('file', Buffer.from('test_data'), 'test.pdf')
        .field('title', 'Test Record')
        .field('recordType', RecordType.DIAGNOSIS)
        .expect(503)

      expect(recordUploadResponse.body.success).toBe(false)
      expect(recordUploadResponse.body.error.code).toBe('STORAGE_UNAVAILABLE')
    })

    it('should maintain system consistency during partial failures', async () => {
      // Test transaction rollback on partial failure
      jest.spyOn(blockchainService, 'submitTransaction')
        .mockResolvedValueOnce({ success: true, transactionId: 'tx_123' })
        .mockRejectedValueOnce(new Error('Secondary transaction failed'))

      const consentResponse = await request(app)
        .post('/api/consent/grant')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .send({
          providerId: testUsers.doctor.userId,
          permissions: [{ resourceType: RecordType.DIAGNOSIS, accessLevel: 'read' }]
        })
        .expect(500)

      expect(consentResponse.body.success).toBe(false)
      
      // Verify no partial state was persisted
      const consentStatusResponse = await request(app)
        .get('/api/consent/status')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .expect(200)

      // Should not contain the failed consent
      const activeConsents = consentStatusResponse.body.data.activeConsents
      const failedConsent = activeConsents.find((consent: any) => 
        consent.providerId === testUsers.doctor.userId && 
        consent.permissions[0].resourceType === RecordType.DIAGNOSIS
      )
      expect(failedConsent).toBeUndefined()
    })
  })
})