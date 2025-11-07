import { logger } from '../utils/logger.js';
import { blockchainManager } from '../utils/blockchainManager.js';

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

export class ConsentService {
  private consentCache: Map<string, ConsentToken> = new Map();
  private cacheExpiryTime: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Setup periodic cache cleanup
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 1000); // Run every minute
  }

  /**
   * Grant consent for data access
   */
  async grantConsent(request: ConsentGrantRequest): Promise<ConsentToken> {
    try {
      logger.info('Granting consent', {
        patientId: request.patientId,
        providerId: request.providerId,
        permissionsCount: request.permissions.length
      });

      // Validate permissions
      this.validatePermissions(request.permissions);

      // Submit transaction to blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.submitTransaction(
        'ConsentContract',
        'grantConsent',
        [
          request.patientId,
          request.providerId,
          JSON.stringify(request.permissions),
          request.expirationTime || '',
          request.patientSignature
        ]
      );

      if (!result.isSuccessful) {
        throw new Error('Failed to grant consent on blockchain');
      }

      // Parse the result to get consent token details
      const consentData = JSON.parse(result.result);
      const consentToken: ConsentToken = {
        tokenId: consentData.tokenId,
        patientId: consentData.patientId,
        providerId: consentData.providerId,
        permissions: consentData.permissions,
        expirationTime: consentData.expirationTime,
        isActive: true,
        createdAt: consentData.createdAt,
        signature: request.patientSignature
      };

      // Cache the consent token
      this.cacheConsentToken(consentToken);

      logger.info('Consent granted successfully', {
        tokenId: consentToken.tokenId,
        transactionId: result.transactionId
      });

      return consentToken;

    } catch (error) {
      logger.error('Failed to grant consent:', error);
      throw new Error(`Consent granting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revoke existing consent
   */
  async revokeConsent(request: ConsentRevocationRequest): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Revoking consent', {
        consentTokenId: request.consentTokenId
      });

      // Submit transaction to blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.submitTransaction(
        'ConsentContract',
        'revokeConsent',
        [
          request.consentTokenId,
          request.patientSignature
        ]
      );

      if (!result.isSuccessful) {
        throw new Error('Failed to revoke consent on blockchain');
      }

      // Remove from cache
      this.consentCache.delete(request.consentTokenId);

      logger.info('Consent revoked successfully', {
        consentTokenId: request.consentTokenId,
        transactionId: result.transactionId
      });

      return {
        success: true,
        message: 'Consent revoked successfully'
      };

    } catch (error) {
      logger.error('Failed to revoke consent:', error);
      throw new Error(`Consent revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate access permissions for a healthcare provider
   */
  async validateAccess(request: AccessValidationRequest): Promise<AccessValidationResult> {
    try {
      logger.info('Validating access', {
        providerId: request.providerId,
        patientId: request.patientId,
        resourceType: request.resourceType
      });

      // Check cache first
      const cachedResult = this.getCachedAccessValidation(request);
      if (cachedResult) {
        logger.info('Access validation result from cache', {
          providerId: request.providerId,
          patientId: request.patientId,
          accessGranted: cachedResult.accessGranted
        });
        return cachedResult;
      }

      // Query blockchain for access validation
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.queryLedger(
        'ConsentContract',
        'validateAccess',
        [
          request.providerId,
          request.patientId,
          request.resourceType
        ]
      );

      const validationResult: AccessValidationResult = JSON.parse(result.result);

      // Cache the result for future queries
      this.cacheAccessValidation(request, validationResult);

      logger.info('Access validation completed', {
        providerId: request.providerId,
        patientId: request.patientId,
        resourceType: request.resourceType,
        accessGranted: validationResult.accessGranted
      });

      return validationResult;

    } catch (error) {
      logger.error('Failed to validate access:', error);
      throw new Error(`Access validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get consent token details
   */
  async getConsentToken(tokenId: string): Promise<ConsentToken> {
    try {
      // Check cache first
      const cachedToken = this.consentCache.get(tokenId);
      if (cachedToken && this.isCacheValid(tokenId)) {
        return cachedToken;
      }

      // Query blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.queryLedger(
        'ConsentContract',
        'getConsentToken',
        [tokenId]
      );

      const consentToken: ConsentToken = JSON.parse(result.result);

      // Cache the token
      this.cacheConsentToken(consentToken);

      return consentToken;

    } catch (error) {
      logger.error('Failed to get consent token:', error);
      throw new Error(`Failed to retrieve consent token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all consent tokens for a patient
   */
  async getPatientConsents(patientId: string): Promise<ConsentToken[]> {
    try {
      logger.info('Getting patient consents', { patientId });

      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.queryLedger(
        'ConsentContract',
        'getPatientConsents',
        [patientId]
      );

      const consents: ConsentToken[] = JSON.parse(result.result);

      // Cache the tokens
      consents.forEach(consent => this.cacheConsentToken(consent));

      logger.info('Retrieved patient consents', {
        patientId,
        consentCount: consents.length
      });

      return consents;

    } catch (error) {
      logger.error('Failed to get patient consents:', error);
      throw new Error(`Failed to retrieve patient consents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all consent tokens for a provider
   */
  async getProviderConsents(providerId: string): Promise<ConsentToken[]> {
    try {
      logger.info('Getting provider consents', { providerId });

      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.queryLedger(
        'ConsentContract',
        'getProviderConsents',
        [providerId]
      );

      const consents: ConsentToken[] = JSON.parse(result.result);

      // Cache the tokens
      consents.forEach(consent => this.cacheConsentToken(consent));

      logger.info('Retrieved provider consents', {
        providerId,
        consentCount: consents.length
      });

      return consents;

    } catch (error) {
      logger.error('Failed to get provider consents:', error);
      throw new Error(`Failed to retrieve provider consents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate consent permissions structure
   */
  private validatePermissions(permissions: ConsentPermission[]): void {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new Error('Permissions must be a non-empty array');
    }

    const validResourceTypes = ['diagnosis', 'prescription', 'lab_result', 'imaging', 'consultation_note'];
    const validAccessLevels = ['read', 'write'];

    for (const permission of permissions) {
      if (!permission.resourceType || !validResourceTypes.includes(permission.resourceType)) {
        throw new Error(`Invalid resource type: ${permission.resourceType}`);
      }
      if (!permission.accessLevel || !validAccessLevels.includes(permission.accessLevel)) {
        throw new Error(`Invalid access level: ${permission.accessLevel}`);
      }
    }
  }

  /**
   * Cache consent token
   */
  private cacheConsentToken(token: ConsentToken): void {
    this.consentCache.set(token.tokenId, {
      ...token,
      cachedAt: Date.now()
    } as any);
  }

  /**
   * Cache access validation result
   */
  private cacheAccessValidation(request: AccessValidationRequest, result: AccessValidationResult): void {
    const cacheKey = `access:${request.providerId}:${request.patientId}:${request.resourceType}`;
    this.consentCache.set(cacheKey, {
      ...result,
      cachedAt: Date.now()
    } as any);
  }

  /**
   * Get cached access validation result
   */
  private getCachedAccessValidation(request: AccessValidationRequest): AccessValidationResult | null {
    const cacheKey = `access:${request.providerId}:${request.patientId}:${request.resourceType}`;
    const cached = this.consentCache.get(cacheKey) as any;
    
    if (cached && this.isCacheValid(cacheKey)) {
      return cached as AccessValidationResult;
    }
    
    return null;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(key: string): boolean {
    const cached = this.consentCache.get(key) as any;
    if (!cached || !cached.cachedAt) {
      return false;
    }
    
    return (Date.now() - cached.cachedAt) < this.cacheExpiryTime;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, value] of this.consentCache.entries()) {
      const cached = value as any;
      if (cached.cachedAt && (now - cached.cachedAt) > this.cacheExpiryTime) {
        this.consentCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired consent cache entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.consentCache.clear();
    logger.info('Consent cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    consentTokens: number;
    accessValidations: number;
  } {
    let consentTokens = 0;
    let accessValidations = 0;

    for (const key of this.consentCache.keys()) {
      if (key.startsWith('access:')) {
        accessValidations++;
      } else {
        consentTokens++;
      }
    }

    return {
      totalEntries: this.consentCache.size,
      consentTokens,
      accessValidations
    };
  }
}

// Export singleton instance
export const consentService = new ConsentService();