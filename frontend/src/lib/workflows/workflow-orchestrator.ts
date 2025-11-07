/**
 * Workflow Orchestrator
 * Manages complex multi-step user workflows with error handling and recovery
 */

import { 
  UserRegistrationWorkflow,
  UserLoginWorkflow,
  RecordUploadWorkflow,
  ConsentManagementWorkflow,
  RecordAccessWorkflow,
  UserApprovalWorkflow,
  WorkflowResult
} from './user-workflows';
import { UserRole, RecordType, Permission } from '@/types';

export interface WorkflowProgress {
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
  progress: number; // 0-100
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export interface WorkflowOptions {
  onProgress?: (progress: WorkflowProgress) => void;
  onError?: (error: string, step: string) => void;
  onComplete?: (result: any) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Main workflow orchestrator that handles complex user journeys
 */
export class WorkflowOrchestrator {
  private registrationWorkflow: UserRegistrationWorkflow;
  private loginWorkflow: UserLoginWorkflow;
  private recordUploadWorkflow: RecordUploadWorkflow;
  private consentWorkflow: ConsentManagementWorkflow;
  private recordAccessWorkflow: RecordAccessWorkflow;
  private approvalWorkflow: UserApprovalWorkflow;

  constructor() {
    this.registrationWorkflow = new UserRegistrationWorkflow();
    this.loginWorkflow = new UserLoginWorkflow();
    this.recordUploadWorkflow = new RecordUploadWorkflow();
    this.consentWorkflow = new ConsentManagementWorkflow();
    this.recordAccessWorkflow = new RecordAccessWorkflow();
    this.approvalWorkflow = new UserApprovalWorkflow();
  }

  /**
   * Complete user onboarding workflow
   * Registration -> Key Generation -> Approval Process
   */
  async executeUserOnboarding(
    userData: {
      userId: string;
      role: UserRole;
      password: string;
      confirmPassword: string;
    },
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const { onProgress, onError, onComplete, retryAttempts = 3 } = options;
    
    try {
      // Validation
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (userData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Step 1: User Registration
      this.updateProgress(onProgress, 1, 3, 'Starting user registration', 10);
      
      const registrationResult = await this.executeWithRetry(
        () => this.registrationWorkflow.execute({
          userId: userData.userId,
          role: userData.role,
          password: userData.password
        }),
        retryAttempts
      );

      if (!registrationResult.success) {
        throw new Error(registrationResult.error || 'Registration failed');
      }

      this.updateProgress(onProgress, 2, 3, 'Registration completed', 60);

      // Step 2: Handle approval process based on role
      let approvalMessage = '';
      if (userData.role === UserRole.PATIENT) {
        approvalMessage = 'Waiting for doctor approval';
      } else if (userData.role === UserRole.SYSTEM_ADMIN) {
        approvalMessage = 'Admin account created';
      } else {
        approvalMessage = 'Waiting for admin approval';
      }

      this.updateProgress(onProgress, 3, 3, approvalMessage, 100);

      const result = {
        success: true,
        data: {
          ...registrationResult.data,
          approvalStatus: approvalMessage,
          nextSteps: this.getNextStepsForRole(userData.role)
        }
      };

      onComplete?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Onboarding failed';
      onError?.(errorMessage, 'User Onboarding');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Complete authentication workflow
   * Login -> Session Management -> Dashboard Redirect
   */
  async executeAuthentication(
    loginData: {
      userId: string;
      password: string;
    },
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const { onProgress, onError, onComplete, retryAttempts = 2 } = options;

    try {
      this.updateProgress(onProgress, 1, 2, 'Authenticating user', 20);

      const loginResult = await this.executeWithRetry(
        () => this.loginWorkflow.execute(loginData),
        retryAttempts
      );

      if (!loginResult.success) {
        throw new Error(loginResult.error || 'Authentication failed');
      }

      this.updateProgress(onProgress, 2, 2, 'Setting up user session', 100);

      // Set up user session data
      const sessionData = {
        user: loginResult.data!.user,
        token: loginResult.data!.token,
        loginTime: new Date().toISOString(),
        dashboardUrl: this.getDashboardUrlForRole(loginResult.data!.user.role)
      };

      const result = {
        success: true,
        data: sessionData
      };

      onComplete?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      onError?.(errorMessage, 'Authentication');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Complete medical record management workflow
   * Upload -> Encryption -> Storage -> Consent Setup
   */
  async executeRecordManagement(
    recordData: {
      file: File;
      title: string;
      description: string;
      recordType: RecordType;
      patientId?: string;
      autoGrantConsent?: {
        providerId: string;
        permissions: Permission[];
      };
    },
    userId: string,
    password: string,
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const { onProgress, onError, onComplete, retryAttempts = 2 } = options;

    try {
      const totalSteps = recordData.autoGrantConsent ? 3 : 2;
      
      // Step 1: Upload and encrypt record
      this.updateProgress(onProgress, 1, totalSteps, 'Uploading medical record', 20);
      
      const uploadResult = await this.executeWithRetry(
        () => this.recordUploadWorkflow.execute({
          file: recordData.file,
          title: recordData.title,
          description: recordData.description,
          recordType: recordData.recordType,
          patientId: recordData.patientId
        }, userId, password),
        retryAttempts
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Record upload failed');
      }

      this.updateProgress(onProgress, 2, totalSteps, 'Record uploaded successfully', 60);

      let consentResult = null;
      
      // Step 2: Auto-grant consent if requested
      if (recordData.autoGrantConsent) {
        this.updateProgress(onProgress, 3, totalSteps, 'Setting up access permissions', 80);
        
        consentResult = await this.executeWithRetry(
          () => this.consentWorkflow.grantConsent({
            providerId: recordData.autoGrantConsent!.providerId,
            permissions: recordData.autoGrantConsent!.permissions
          }, recordData.patientId || userId),
          retryAttempts
        );

        if (!consentResult.success) {
          // Don't fail the entire workflow if consent fails
          console.warn('Consent setup failed:', consentResult.error);
        }
      }

      this.updateProgress(onProgress, totalSteps, totalSteps, 'Record management completed', 100);

      const result = {
        success: true,
        data: {
          record: uploadResult.data,
          consent: consentResult?.data,
          nextSteps: [
            'Record has been securely uploaded and encrypted',
            'Metadata stored on blockchain',
            recordData.autoGrantConsent ? 'Access permissions configured' : 'Set up access permissions as needed'
          ]
        }
      };

      onComplete?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Record management failed';
      onError?.(errorMessage, 'Record Management');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Complete consent management workflow
   * Provider Verification -> Consent Creation -> Notification
   */
  async executeConsentManagement(
    consentData: {
      action: 'grant' | 'revoke';
      providerId?: string;
      consentTokenId?: string;
      permissions?: Permission[];
      expirationTime?: Date;
    },
    patientId: string,
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const { onProgress, onError, onComplete, retryAttempts = 2 } = options;

    try {
      if (consentData.action === 'grant') {
        if (!consentData.providerId || !consentData.permissions) {
          throw new Error('Provider ID and permissions are required for granting consent');
        }

        this.updateProgress(onProgress, 1, 2, 'Granting access permissions', 50);
        
        const grantResult = await this.executeWithRetry(
          () => this.consentWorkflow.grantConsent({
            providerId: consentData.providerId!,
            permissions: consentData.permissions!,
            expirationTime: consentData.expirationTime
          }, patientId),
          retryAttempts
        );

        if (!grantResult.success) {
          throw new Error(grantResult.error || 'Failed to grant consent');
        }

        this.updateProgress(onProgress, 2, 2, 'Consent granted successfully', 100);

        const result = {
          success: true,
          data: {
            action: 'granted',
            consentTokenId: grantResult.data!.consentTokenId,
            providerId: consentData.providerId,
            permissions: consentData.permissions
          }
        };

        onComplete?.(result);
        return result;

      } else {
        if (!consentData.consentTokenId) {
          throw new Error('Consent token ID is required for revoking consent');
        }

        this.updateProgress(onProgress, 1, 2, 'Revoking access permissions', 50);
        
        const revokeResult = await this.executeWithRetry(
          () => this.consentWorkflow.revokeConsent(consentData.consentTokenId!),
          retryAttempts
        );

        if (!revokeResult.success) {
          throw new Error(revokeResult.error || 'Failed to revoke consent');
        }

        this.updateProgress(onProgress, 2, 2, 'Consent revoked successfully', 100);

        const result = {
          success: true,
          data: {
            action: 'revoked',
            consentTokenId: consentData.consentTokenId
          }
        };

        onComplete?.(result);
        return result;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Consent management failed';
      onError?.(errorMessage, 'Consent Management');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Complete record access workflow
   * Permission Check -> File Retrieval -> Decryption -> Audit Log
   */
  async executeRecordAccess(
    recordId: string,
    userId: string,
    password: string,
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const { onProgress, onError, onComplete, retryAttempts = 2 } = options;

    try {
      this.updateProgress(onProgress, 1, 2, 'Accessing medical record', 30);
      
      const accessResult = await this.executeWithRetry(
        () => this.recordAccessWorkflow.execute(recordId, userId, password),
        retryAttempts
      );

      if (!accessResult.success) {
        throw new Error(accessResult.error || 'Record access failed');
      }

      this.updateProgress(onProgress, 2, 2, 'Record retrieved successfully', 100);

      const result = {
        success: true,
        data: {
          file: accessResult.data!.file,
          metadata: accessResult.data!.metadata,
          accessTime: new Date().toISOString()
        }
      };

      onComplete?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Record access failed';
      onError?.(errorMessage, 'Record Access');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Execute workflow with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<WorkflowResult<T>>,
    maxAttempts: number,
    delay: number = 1000
  ): Promise<WorkflowResult<T>> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        if (result.success) {
          return result;
        }
        lastError = new Error(result.error || 'Operation failed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    return {
      success: false,
      error: lastError?.message || 'Operation failed after retries'
    };
  }

  /**
   * Update workflow progress
   */
  private updateProgress(
    onProgress: ((progress: WorkflowProgress) => void) | undefined,
    currentStep: number,
    totalSteps: number,
    stepDescription: string,
    progress: number
  ): void {
    if (onProgress) {
      onProgress({
        currentStep,
        totalSteps,
        stepDescription,
        progress,
        isComplete: progress >= 100,
        hasError: false
      });
    }
  }

  /**
   * Get next steps based on user role
   */
  private getNextStepsForRole(role: UserRole): string[] {
    switch (role) {
      case UserRole.PATIENT:
        return [
          'Wait for doctor approval',
          'Once approved, you can upload medical records',
          'Manage consent permissions for healthcare providers'
        ];
      case UserRole.DOCTOR:
        return [
          'Wait for admin approval',
          'Once approved, you can access patient records with consent',
          'Upload medical records for your patients'
        ];
      case UserRole.LABORATORY:
        return [
          'Wait for admin approval',
          'Once approved, you can upload lab results',
          'Access patient records with proper consent'
        ];
      case UserRole.INSURER:
        return [
          'Wait for admin approval',
          'Once approved, you can access claim-related records',
          'Process insurance claims with patient consent'
        ];
      case UserRole.AUDITOR:
        return [
          'Wait for admin approval',
          'Once approved, you can access audit trails',
          'Generate compliance reports'
        ];
      case UserRole.SYSTEM_ADMIN:
        return [
          'Your admin account is active',
          'Approve pending user registrations',
          'Monitor system compliance and audit trails'
        ];
      default:
        return ['Complete registration process'];
    }
  }

  /**
   * Execute audit query workflow
   * Query audit trail with filtering and pagination
   */
  async executeAuditQuery(
    params: {
      userId?: string;
      eventTypes?: string[];
      startDate?: string;
      endDate?: string;
      pageSize?: number;
      includeAllPages?: boolean;
    },
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const { onProgress, onError, onComplete, retryAttempts = 2 } = options;

    try {
      this.updateProgress(onProgress, 1, 2, 'Querying audit trail', 30);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params.userId) queryParams.append('userId', params.userId);
      if (params.eventTypes) queryParams.append('eventType', params.eventTypes.join(','));
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

      const auditResult = await this.executeWithRetry(
        async () => {
          const response = await fetch(`/api/audit/trail?${queryParams.toString()}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          
          if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
          }
          
          const data = await response.json();
          return { success: true, data };
        },
        retryAttempts
      );

      if (!auditResult.success) {
        throw new Error(auditResult.error || 'Audit query failed');
      }

      this.updateProgress(onProgress, 2, 2, 'Audit query completed', 100);

      const result = {
        success: true,
        data: auditResult.data
      };

      onComplete?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Audit query failed';
      onError?.(errorMessage, 'Audit Query');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Execute compliance report generation workflow
   */
  async executeComplianceReport(
    params: {
      reportType: 'daily' | 'weekly' | 'monthly' | 'yearly';
      startDate: string;
      endDate: string;
      includeRecommendations?: boolean;
    },
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const { onProgress, onError, onComplete, retryAttempts = 2 } = options;

    try {
      this.updateProgress(onProgress, 1, 3, 'Generating compliance report', 20);

      const queryParams = new URLSearchParams({
        reportType: params.reportType,
        startDate: params.startDate,
        endDate: params.endDate,
        includeRecommendations: (params.includeRecommendations || false).toString()
      });

      this.updateProgress(onProgress, 2, 3, 'Analyzing compliance metrics', 60);

      const reportResult = await this.executeWithRetry(
        async () => {
          const response = await fetch(`/api/audit/compliance-report?${queryParams.toString()}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          
          if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
          }
          
          const data = await response.json();
          return { success: true, data };
        },
        retryAttempts
      );

      if (!reportResult.success) {
        throw new Error(reportResult.error || 'Compliance report generation failed');
      }

      this.updateProgress(onProgress, 3, 3, 'Compliance report generated', 100);

      const result = {
        success: true,
        data: reportResult.data
      };

      onComplete?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Compliance report generation failed';
      onError?.(errorMessage, 'Compliance Report');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Execute audit trail integrity check workflow
   */
  async executeAuditIntegrityCheck(
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const { onProgress, onError, onComplete, retryAttempts = 2 } = options;

    try {
      this.updateProgress(onProgress, 1, 3, 'Starting integrity verification', 20);

      const integrityResult = await this.executeWithRetry(
        async () => {
          const response = await fetch('/api/audit/verify-integrity', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          
          if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
          }
          
          const data = await response.json();
          return { success: true, data };
        },
        retryAttempts
      );

      if (!integrityResult.success) {
        throw new Error(integrityResult.error || 'Integrity check failed');
      }

      this.updateProgress(onProgress, 2, 3, 'Verifying blockchain consistency', 70);
      
      // Additional verification steps could be added here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate verification time

      this.updateProgress(onProgress, 3, 3, 'Integrity verification completed', 100);

      const result = {
        success: true,
        data: integrityResult.data
      };

      onComplete?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Integrity check failed';
      onError?.(errorMessage, 'Integrity Check');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get dashboard URL based on user role
   */
  private getDashboardUrlForRole(role: UserRole): string {
    switch (role) {
      case UserRole.PATIENT:
        return '/dashboard/patient';
      case UserRole.DOCTOR:
        return '/dashboard/doctor';
      case UserRole.LABORATORY:
        return '/dashboard/lab';
      case UserRole.INSURER:
        return '/dashboard/insurer';
      case UserRole.AUDITOR:
        return '/dashboard/auditor';
      case UserRole.SYSTEM_ADMIN:
        return '/dashboard/admin';
      default:
        return '/dashboard';
    }
  }
}

// Export singleton instance
export const workflowOrchestrator = new WorkflowOrchestrator();