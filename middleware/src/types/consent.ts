export interface ConsentPermission {
  resourceType: 'diagnosis' | 'prescription' | 'lab_result' | 'imaging' | 'consultation_note';
  accessLevel: 'read' | 'write';
  conditions?: string[];
}

export interface ConsentToken {
  tokenId: string;
  patientId: string;
  providerId: string;
  permissions: ConsentPermission[];
  expirationTime?: string;
  isActive: boolean;
  createdAt: string;
  revokedAt?: string;
  signature: string;
}

export interface ConsentGrantRequest {
  patientId: string;
  providerId: string;
  permissions: ConsentPermission[];
  expirationTime?: string;
  patientSignature: string;
}

export interface ConsentRevocationRequest {
  consentTokenId: string;
  patientSignature: string;
}

export interface AccessValidationRequest {
  providerId: string;
  patientId: string;
  resourceType: string;
}

export interface AccessValidationResult {
  accessGranted: boolean;
  providerId: string;
  patientId: string;
  resourceType: string;
  consentTokenId?: string;
  permissions: ConsentPermission[];
  message: string;
}

export interface ConsentGrantResponse {
  success: boolean;
  consentToken: {
    tokenId: string;
    providerId: string;
    permissions: ConsentPermission[];
    expirationTime?: string;
    createdAt: string;
  };
  message: string;
  timestamp: string;
}

export interface ConsentRevocationResponse {
  success: boolean;
  message: string;
  consentTokenId: string;
  revokedAt: string;
  timestamp: string;
}

export interface ConsentTokenResponse {
  consentToken: {
    tokenId: string;
    patientId: string;
    providerId: string;
    permissions: ConsentPermission[];
    expirationTime?: string;
    isActive: boolean;
    createdAt: string;
    revokedAt?: string;
  };
  timestamp: string;
}

export interface PatientConsentsResponse {
  patientId: string;
  consents: Array<{
    tokenId: string;
    providerId: string;
    permissions: ConsentPermission[];
    expirationTime?: string;
    isActive: boolean;
    createdAt: string;
    revokedAt?: string;
  }>;
  totalCount: number;
  timestamp: string;
}

export interface ProviderConsentsResponse {
  providerId: string;
  consents: Array<{
    tokenId: string;
    patientId: string;
    permissions: ConsentPermission[];
    expirationTime?: string;
    isActive: boolean;
    createdAt: string;
    revokedAt?: string;
  }>;
  totalCount: number;
  timestamp: string;
}

export interface ConsentStatusResponse {
  patientId: string;
  providerId: string;
  summary: {
    totalConsents: number;
    activeConsents: number;
    revokedConsents: number;
    resourcePermissions: Record<string, string[]>;
  };
  activeConsents: Array<{
    tokenId: string;
    permissions: ConsentPermission[];
    expirationTime?: string;
    createdAt: string;
  }>;
  timestamp: string;
}

export interface ConsentCacheStats {
  totalEntries: number;
  consentTokens: number;
  accessValidations: number;
}