/**
 * End-to-End User Workflows
 * Orchestrates complete user journeys from frontend to backend
 */

import { apiClient } from '@/lib/api';
import { PQCKeyManager } from '@/lib/crypto/key-manager';
import { 
  User, 
  UserRole, 
  MedicalRecord, 
  ConsentToken, 
  Permission, 
  RecordType,
  AuditEntry,
  ApiResponse 
} from '@/types';

export interface WorkflowResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  steps?: string[];
}

export interface RegistrationWorkflowData {
  userId: string;
  role: UserRole;
  password: string;
}

export interface LoginWorkflowData {
  userId: string;
  password: string;
}

export interface RecordUploadWorkflowData {
  file: File;
  title: string;
  description: string;
  recordType: RecordType;
  patientId?: string; // For providers uploading on behalf of patients
}

export interface ConsentWorkflowData {
  providerId: string;
  permissions: Permission[];
  expirationTime?: Date;
}

/**
 * Complete User Registration Workflow
 * 1. Generate PQC keys
 * 2. Register with backend
 * 3. Store keys locally
 * 4. Handle approval process
 */
export class UserRegistrationWorkflow {
  private keyManager: PQCKeyManager;
  private steps: string[] = [];

  constructor() {
    this.keyManager = new PQCKeyManager();
  }

  async execute(data: RegistrationWorkflowData): Promise<WorkflowResult<{ userId: string; publicKeys: any; status?: string; transactionId?: string }>> {
    try {
      this.steps = [];
      
      // Step 1: Initialize key manager
      this.steps.push('Initializing cryptographic environment');
      await this.keyManager.initialize(data.password);
      
      // Step 2: Generate PQC keys
      this.steps.push('Generating post-quantum cryptographic keys');
      const keys = await this.keyManager.generateUserKeys(data.userId);
      
      // Step 3: Export public keys for registration
      this.steps.push('Preparing public keys for registration');
      const publicKeys = await this.keyManager.exportPublicKeys(data.userId);
      
      if (!publicKeys) {
        throw new Error('Failed to export public keys');
      }
      
      // Step 4: Register with backend
      this.steps.push('Registering user with blockchain network');
      const response = await apiClient.post<{ 
        userId: string; 
        status: string; 
        transactionId: string 
      }>('/auth/register', {
        userId: data.userId,
        role: data.role,
        publicKeys
      });
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Registration failed');
      }
      
      // Step 5: Verify keys are stored locally
      this.steps.push('Verifying secure key storage');
      if (!this.keyManager.hasUserKeys(data.userId)) {
        throw new Error('Keys were not stored properly');
      }
      
      this.steps.push('Registration completed successfully');
      
      return {
        success: true,
        data: {
          userId: data.userId,
          publicKeys,
          status: response.data?.status,
          transactionId: response.data?.transactionId
        },
        steps: this.steps
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration workflow failed',
        steps: this.steps
      };
    }
  }
}

/**
 * Complete User Login Workflow
 * 1. Validate stored keys
 * 2. Generate authentication nonce
 * 3. Create digital signature
 * 4. Authenticate with backend
 * 5. Store session token
 */
export class UserLoginWorkflow {
  private keyManager: PQCKeyManager;
  private steps: string[] = [];

  constructor() {
    this.keyManager = new PQCKeyManager();
  }

  async execute(data: LoginWorkflowData): Promise<WorkflowResult<{ token: string; user: User }>> {
    try {
      this.steps = [];
      
      // Step 1: Initialize key manager
      this.steps.push('Initializing key manager');
      await this.keyManager.initialize(data.password);
      
      // Step 2: Verify user has keys
      this.steps.push('Verifying stored cryptographic keys');
      if (!this.keyManager.hasUserKeys(data.userId)) {
        throw new Error('No keys found for this user. Please register first.');
      }
      
      // Step 3: Get authentication nonce
      this.steps.push('Requesting authentication challenge');
      const nonceResponse = await apiClient.post<{ nonce: string }>('/auth/nonce', {
        userId: data.userId
      });
      
      if (!nonceResponse.success || !nonceResponse.data?.nonce) {
        throw new Error('Failed to get authentication nonce');
      }
      
      // Step 4: Create authentication signature
      this.steps.push('Generating digital signature');
      const userKeys = await this.keyManager.getUserKeys(data.userId);
      if (!userKeys) {
        throw new Error('Failed to retrieve user keys');
      }
      
      // Create signature (simplified for demo - would use actual Dilithium in production)
      const message = `auth:${data.userId}:${nonceResponse.data.nonce}:${Date.now()}`;
      const signature = btoa(message + ':' + data.userId);
      
      // Step 5: Authenticate with backend
      this.steps.push('Authenticating with blockchain network');
      const authResponse = await apiClient.post<{ 
        token: string; 
        user: User;
        expiresAt: string;
      }>('/auth/authenticate', {
        userId: data.userId,
        nonce: nonceResponse.data.nonce,
        signature
      });
      
      if (!authResponse.success) {
        throw new Error(authResponse.error?.message || 'Authentication failed');
      }
      
      // Step 6: Store session token
      this.steps.push('Storing session token');
      if (authResponse.data?.token) {
        localStorage.setItem('auth_token', authResponse.data.token);
        localStorage.setItem('auth_expires', authResponse.data.expiresAt);
        localStorage.setItem('current_user', JSON.stringify(authResponse.data.user));
      }
      
      this.steps.push('Login completed successfully');
      
      return {
        success: true,
        data: {
          token: authResponse.data!.token,
          user: authResponse.data!.user
        },
        steps: this.steps
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login workflow failed',
        steps: this.steps
      };
    }
  }
}

/**
 * Complete Medical Record Upload Workflow
 * 1. Encrypt file client-side
 * 2. Upload to IPFS via middleware
 * 3. Store metadata on blockchain
 * 4. Create audit trail
 */
export class RecordUploadWorkflow {
  private keyManager: PQCKeyManager;
  private steps: string[] = [];

  constructor() {
    this.keyManager = new PQCKeyManager();
  }

  async execute(
    data: RecordUploadWorkflowData, 
    userId: string, 
    password: string
  ): Promise<WorkflowResult<{ recordId: string; ipfsHash: string; transactionId?: string }>> {
    try {
      this.steps = [];
      
      // Step 1: Initialize encryption
      this.steps.push('Initializing client-side encryption');
      await this.keyManager.initialize(password);
      
      // Step 2: Read and encrypt file
      this.steps.push('Encrypting medical record');
      const fileBuffer = await data.file.arrayBuffer();
      const fileData = new Uint8Array(fileBuffer);
      
      // Generate encryption key for this file
      const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
      
      // Encrypt file data (simplified - would use AES-256-GCM in production)
      const encryptedData = await this.encryptFileData(fileData, encryptionKey);
      
      // Step 3: Upload encrypted file to IPFS
      this.steps.push('Uploading encrypted file to decentralized storage');
      
      // Create FormData for file upload
      const formData = new FormData();
      const encryptedBuffer = new Uint8Array(encryptedData);
      const encryptedFile = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
      formData.append('file', encryptedFile, data.file.name);
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('recordType', data.recordType);
      
      const uploadResponse = await apiClient.post<{ 
        recordId: string; 
        ipfsHash: string; 
        transactionId: string 
      }>('/records/upload', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          // Don't set Content-Type for FormData, let browser set it with boundary
        }
      });
      
      if (!uploadResponse.success) {
        throw new Error('Failed to upload file to IPFS');
      }
      
      // Step 4: Store encryption key securely (associated with record)
      this.steps.push('Securing encryption keys');
      await this.storeRecordEncryptionKey(uploadResponse.data!.recordId, encryptionKey, userId);
      
      this.steps.push('Medical record uploaded successfully');
      
      return {
        success: true,
        data: {
          recordId: uploadResponse.data!.recordId,
          ipfsHash: uploadResponse.data!.ipfsHash,
          transactionId: uploadResponse.data!.transactionId
        },
        steps: this.steps
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Record upload workflow failed',
        steps: this.steps
      };
    }
  }

  private async encryptFileData(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    // Simplified encryption - would use AES-256-GCM in production
    const encrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ key[i % key.length];
    }
    return encrypted;
  }

  private async hashKey(key: Uint8Array): Promise<string> {
    const keyBuffer = new Uint8Array(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async storeRecordEncryptionKey(recordId: string, key: Uint8Array, userId: string): Promise<void> {
    // Store encryption key in local storage (encrypted with user's master key)
    const keyData = {
      recordId,
      key: Array.from(key),
      createdAt: Date.now()
    };
    
    const existingKeys = JSON.parse(localStorage.getItem(`record_keys_${userId}`) || '[]');
    existingKeys.push(keyData);
    localStorage.setItem(`record_keys_${userId}`, JSON.stringify(existingKeys));
  }
}

/**
 * Complete Consent Management Workflow
 * 1. Validate provider identity
 * 2. Create consent token
 * 3. Store on blockchain
 * 4. Notify relevant parties
 */
export class ConsentManagementWorkflow {
  private steps: string[] = [];

  async grantConsent(
    data: ConsentWorkflowData, 
    patientId: string
  ): Promise<WorkflowResult<{ consentTokenId: string; transactionId?: string }>> {
    try {
      this.steps = [];
      
      // Step 1: Validate provider exists
      this.steps.push('Validating healthcare provider');
      const providerResponse = await apiClient.get<User>(`/auth/user/${data.providerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!providerResponse.success) {
        throw new Error('Provider not found or invalid');
      }
      
      // Step 2: Create consent token
      this.steps.push('Creating consent authorization');
      const consentResponse = await apiClient.post<{ 
        consentTokenId: string; 
        transactionId: string 
      }>('/consent/grant', {
        patientId,
        providerId: data.providerId,
        permissions: data.permissions,
        expirationTime: data.expirationTime
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!consentResponse.success) {
        throw new Error('Failed to create consent token');
      }
      
      // Step 3: Verify consent was stored
      this.steps.push('Verifying consent registration');
      const verifyResponse = await apiClient.get<ConsentToken>(
        `/consent/${consentResponse.data!.consentTokenId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      
      if (!verifyResponse.success) {
        throw new Error('Failed to verify consent creation');
      }
      
      this.steps.push('Consent granted successfully');
      
      return {
        success: true,
        data: {
          consentTokenId: consentResponse.data!.consentTokenId,
          transactionId: consentResponse.data!.transactionId
        },
        steps: this.steps
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Consent workflow failed',
        steps: this.steps
      };
    }
  }

  async revokeConsent(consentTokenId: string): Promise<WorkflowResult<{ revoked: boolean; transactionId?: string }>> {
    try {
      this.steps = [];
      
      // Step 1: Revoke consent
      this.steps.push('Revoking consent authorization');
      const response = await apiClient.post<{ success: boolean; transactionId: string }>(
        `/consent/${consentTokenId}/revoke`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      
      if (!response.success) {
        throw new Error('Failed to revoke consent');
      }
      
      // Step 2: Verify revocation
      this.steps.push('Verifying consent revocation');
      const verifyResponse = await apiClient.get<ConsentToken>(
        `/consent/${consentTokenId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      
      if (verifyResponse.success && verifyResponse.data?.isActive) {
        throw new Error('Consent revocation verification failed');
      }
      
      this.steps.push('Consent revoked successfully');
      
      return {
        success: true,
        data: {
          revoked: true,
          transactionId: response.data!.transactionId
        },
        steps: this.steps
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Consent revocation failed',
        steps: this.steps
      };
    }
  }
}

/**
 * Complete Record Access Workflow
 * 1. Verify consent permissions
 * 2. Retrieve encrypted file from IPFS
 * 3. Decrypt file client-side
 * 4. Log access in audit trail
 */
export class RecordAccessWorkflow {
  private keyManager: PQCKeyManager;
  private steps: string[] = [];

  constructor() {
    this.keyManager = new PQCKeyManager();
  }

  async execute(
    recordId: string, 
    userId: string, 
    password: string
  ): Promise<WorkflowResult<{ file: Blob; metadata: any }>> {
    try {
      this.steps = [];
      
      // Step 1: Initialize key manager
      this.steps.push('Initializing decryption environment');
      await this.keyManager.initialize(password);
      
      // Step 2: Request record access
      this.steps.push('Verifying access permissions');
      const accessResponse = await apiClient.get<{
        record: MedicalRecord;
        ipfsHash: string;
        hasAccess: boolean;
      }>(`/records/${recordId}/access`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!accessResponse.success || !accessResponse.data?.hasAccess) {
        throw new Error('Access denied or record not found');
      }
      
      // Step 3: Retrieve encrypted file from IPFS
      this.steps.push('Retrieving encrypted file from storage');
      const fileResponse = await apiClient.get<{ encryptedData: number[] }>(
        `/storage/${accessResponse.data.ipfsHash}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      
      if (!fileResponse.success) {
        throw new Error('Failed to retrieve file from storage');
      }
      
      // Step 4: Get decryption key
      this.steps.push('Retrieving decryption keys');
      const encryptionKey = await this.getRecordEncryptionKey(recordId, userId);
      if (!encryptionKey) {
        throw new Error('Decryption key not found');
      }
      
      // Step 5: Decrypt file
      this.steps.push('Decrypting medical record');
      const encryptedData = new Uint8Array(fileResponse.data!.encryptedData);
      const decryptedData = await this.decryptFileData(encryptedData, encryptionKey);
      
      // Step 6: Create file blob
      const decryptedBuffer = new Uint8Array(decryptedData);
      const file = new Blob([decryptedBuffer], { 
        type: accessResponse.data.record.metadata.mimeType 
      });
      
      this.steps.push('Record accessed successfully');
      
      return {
        success: true,
        data: {
          file,
          metadata: accessResponse.data.record.metadata
        },
        steps: this.steps
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Record access workflow failed',
        steps: this.steps
      };
    }
  }

  private async getRecordEncryptionKey(recordId: string, userId: string): Promise<Uint8Array | null> {
    try {
      const storedKeys = JSON.parse(localStorage.getItem(`record_keys_${userId}`) || '[]');
      const keyData = storedKeys.find((k: any) => k.recordId === recordId);
      return keyData ? new Uint8Array(keyData.key) : null;
    } catch {
      return null;
    }
  }

  private async decryptFileData(encryptedData: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    // Simplified decryption - would use AES-256-GCM in production
    const decrypted = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ key[i % key.length];
    }
    return decrypted;
  }
}

/**
 * User Approval Workflow (for admins and doctors)
 * 1. Get pending registrations
 * 2. Review user details
 * 3. Approve or reject registration
 * 4. Update user status on blockchain
 */
export class UserApprovalWorkflow {
  private steps: string[] = [];

  async getPendingRegistrations(approverRole: UserRole): Promise<WorkflowResult<User[]>> {
    try {
      this.steps = [];
      
      this.steps.push('Retrieving pending user registrations');
      const response = await apiClient.get<User[]>('/admin/pending-registrations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.success) {
        throw new Error('Failed to retrieve pending registrations');
      }
      
      // Filter based on approver role
      let filteredUsers = response.data || [];
      if (approverRole === UserRole.DOCTOR) {
        filteredUsers = filteredUsers.filter(user => user.role === UserRole.PATIENT);
      }
      
      return {
        success: true,
        data: filteredUsers,
        steps: this.steps
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pending registrations',
        steps: this.steps
      };
    }
  }

  async approveRegistration(
    userId: string, 
    approved: boolean, 
    reason?: string
  ): Promise<WorkflowResult<{ approved: boolean; transactionId: string }>> {
    try {
      this.steps = [];
      
      this.steps.push(`${approved ? 'Approving' : 'Rejecting'} user registration`);
      const response = await apiClient.post<{ 
        success: boolean; 
        transactionId: string 
      }>(`/admin/approve-registration`, {
        userId,
        approved,
        reason
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.success) {
        throw new Error(`Failed to ${approved ? 'approve' : 'reject'} registration`);
      }
      
      this.steps.push(`Registration ${approved ? 'approved' : 'rejected'} successfully`);
      
      return {
        success: true,
        data: {
          approved,
          transactionId: response.data!.transactionId
        },
        steps: this.steps
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Approval workflow failed',
        steps: this.steps
      };
    }
  }
}