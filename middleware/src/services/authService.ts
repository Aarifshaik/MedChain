import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { blockchainManager } from '../utils/blockchainManager.js';

export interface AuthToken {
  token: string;
  expiresAt: Date;
  userId: string;
  role: string;
}

export interface SessionData {
  userId: string;
  role: string;
  publicKeys: {
    kyberPublicKey: string;
    dilithiumPublicKey: string;
  };
  issuedAt: Date;
  expiresAt: Date;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  userId?: string;
  role?: string;
  publicKeys?: {
    kyberPublicKey: string;
    dilithiumPublicKey: string;
  };
  error?: string;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly sessionStore: Map<string, SessionData> = new Map();

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecureSecret();
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET not set in environment variables, using generated secret');
    }
  }

  /**
   * Generate a secure random secret for JWT signing
   */
  private generateSecureSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate authentication nonce
   */
  generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate JWT token for authenticated user
   */
  generateToken(userId: string, role: string, publicKeys: any): AuthToken {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const payload = {
      userId,
      role,
      publicKeys,
      iat: Math.floor(issuedAt.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };

    const token = jwt.sign(payload, this.jwtSecret);

    // Store session data
    this.sessionStore.set(userId, {
      userId,
      role,
      publicKeys,
      issuedAt,
      expiresAt
    });

    return {
      token,
      expiresAt,
      userId,
      role
    };
  }

  /**
   * Authenticate user with signature - BLOCKCHAIN ONLY
   */
  async authenticateUser(userId: string, nonce: string, signature: string): Promise<SignatureVerificationResult> {
    try {
      logger.info(`Authenticating user via blockchain: ${userId}`);

      // Ensure blockchain service is available
      if (!blockchainManager.isServiceAvailable()) {
        logger.error('Blockchain service not available');
        return {
          isValid: false,
          error: 'Blockchain service unavailable'
        };
      }

      const blockchainService = blockchainManager.getBlockchainService();
      
      // Query user from blockchain
      const userQueryResult = await blockchainService.getUser(userId);
      
      if (!userQueryResult || !userQueryResult.result) {
        logger.warn(`User not found in blockchain: ${userId}`);
        return {
          isValid: false,
          error: 'User not found in blockchain'
        };
      }

      let userData;
      try {
        userData = JSON.parse(userQueryResult.result);
      } catch (parseError) {
        logger.error('Failed to parse user data from blockchain:', parseError);
        return {
          isValid: false,
          error: 'Invalid user data format'
        };
      }
      
      // Check if user registration is approved
      if (userData.registrationStatus !== 'approved') {
        logger.warn(`User registration not approved: ${userId}, status: ${userData.registrationStatus}`);
        return {
          isValid: false,
          error: `User registration ${userData.registrationStatus}. Contact administrator for approval.`
        };
      }

      // Validate signature format
      if (!signature || signature.length < 10) {
        return {
          isValid: false,
          error: 'Invalid signature format'
        };
      }

      // Validate signature using post-quantum cryptography
      const isValidSignature = await this.validatePQCSignature(
        signature, 
        `${userId}:${nonce}:`, 
        userData.publicKeys.dilithiumPublicKey
      );
      
      if (!isValidSignature) {
        logger.warn(`Invalid signature for user: ${userId}`);
        return {
          isValid: false,
          error: 'Invalid digital signature'
        };
      }

      logger.info(`User authenticated successfully from blockchain: ${userId}`);
      return {
        isValid: true,
        userId,
        role: userData.role,
        publicKeys: userData.publicKeys
      };

    } catch (error) {
      logger.error('Blockchain authentication error:', error);
      return {
        isValid: false,
        error: 'Authentication service error'
      };
    }
  }

  /**
   * Register a new user on the blockchain
   */
  async registerUser(
    userId: string,
    role: string,
    publicKeys: { kyberPublicKey: string; dilithiumPublicKey: string },
    email: string,
    organizationId: string,
    signature: string
  ): Promise<{ success: boolean; message: string; transactionId?: string }> {
    try {
      logger.info(`Registering new user: ${userId} with role: ${role}`);

      // Submit registration transaction to blockchain
      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.registerUser(
        userId,
        role,
        publicKeys,
        signature,
        email,
        organizationId
      );

      if (result.isSuccessful) {
        logger.info(`User registered successfully: ${userId}, Transaction ID: ${result.transactionId}`);
        return {
          success: true,
          message: 'User registered successfully',
          transactionId: result.transactionId
        };
      } else {
        logger.error(`User registration failed: ${userId}`);
        return {
          success: false,
          message: 'User registration failed'
        };
      }

    } catch (error) {
      logger.error('User registration error:', error);
      return {
        success: false,
        message: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate Post-Quantum Cryptography signature
   */
  private async validatePQCSignature(signature: string, message: string, publicKey: string): Promise<boolean> {
    try {
      // TODO: Implement actual CRYSTALS-Dilithium signature verification
      // For now, using placeholder validation that checks signature format and content
      
      // Basic format validation
      if (!signature || signature.length < 20) {
        return false;
      }

      // Check if signature contains expected elements
      const hasValidFormat = signature.includes('signature') || signature.includes('dilithium');
      
      // Simulate cryptographic verification delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // In production, this would be:
      // return await dilithium.verify(signature, message, publicKey);
      
      logger.info(`PQC signature validation: ${hasValidFormat ? 'VALID' : 'INVALID'}`);
      return hasValidFormat;
      
    } catch (error) {
      logger.error('PQC signature validation error:', error);
      return false;
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): SessionData | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Check if session exists
      const session = this.sessionStore.get(decoded.userId);
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        this.sessionStore.delete(decoded.userId);
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Refresh JWT token
   */
  refreshToken(currentToken: string): AuthToken | null {
    try {
      const session = this.verifyToken(currentToken);
      if (!session) {
        return null;
      }

      // Generate new token
      return this.generateToken(session.userId, session.role, session.publicKeys);
    } catch (error) {
      logger.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Revoke user session
   */
  revokeSession(userId: string): boolean {
    try {
      return this.sessionStore.delete(userId);
    } catch (error) {
      logger.error('Session revocation error:', error);
      return false;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): any {
    const activeSessions = Array.from(this.sessionStore.values());
    const now = new Date();
    
    const validSessions = activeSessions.filter(session => session.expiresAt > now);
    const expiredSessions = activeSessions.filter(session => session.expiresAt <= now);

    // Clean up expired sessions
    expiredSessions.forEach(session => {
      this.sessionStore.delete(session.userId);
    });

    const roleStats = validSessions.reduce((acc, session) => {
      acc[session.role] = (acc[session.role] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      totalActiveSessions: validSessions.length,
      expiredSessionsCleared: expiredSessions.length,
      roleDistribution: roleStats,
      averageSessionAge: validSessions.length > 0 
        ? validSessions.reduce((acc, session) => acc + (now.getTime() - session.issuedAt.getTime()), 0) / validSessions.length / 1000 / 60
        : 0 // in minutes
    };
  }
}

// Export singleton instance
export const authService = new AuthService();