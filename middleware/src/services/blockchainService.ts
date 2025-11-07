import { Gateway, Network, Contract, Transaction } from 'fabric-network';
import { Wallet, Wallets } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';

export interface TransactionResult {
  transactionId: string;
  result: any;
  timestamp: Date;
  isSuccessful: boolean;
}

export interface QueryResult {
  result: any;
  timestamp: Date;
}

export interface BlockchainConfig {
  channelName: string;
  chaincodeName: string;
  connectionProfilePath: string;
  walletPath: string;
  userId: string;
  orgMSPId: string;
}

export class BlockchainService {
  private gateway: Gateway | null = null;
  private network: Network | null = null;
  private contracts: Map<string, Contract> = new Map();
  private wallet: Wallet | null = null;
  private config: BlockchainConfig;
  private isConnected: boolean = false;

  constructor(config: BlockchainConfig) {
    this.config = config;
  }

  /**
   * Initialize the blockchain service and establish connection
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Blockchain Service...');

      // Load connection profile
      const connectionProfile = await this.loadConnectionProfile();
      
      // Initialize wallet
      this.wallet = await this.initializeWallet();
      
      // Create gateway instance
      this.gateway = new Gateway();
      
      // Connect to gateway with fixed discovery settings
      await this.gateway.connect(connectionProfile, {
        wallet: this.wallet,
        identity: this.config.userId,
        discovery: { 
          enabled: false,  // Disable discovery to avoid gRPC issues
          asLocalhost: true 
        },
        eventHandlerOptions: {
          commitTimeout: 300,
          strategy: null
        }
      });

      // Get network
      this.network = await this.gateway.getNetwork(this.config.channelName);
      
      // Initialize contracts
      await this.initializeContracts();
      
      this.isConnected = true;
      logger.info('Blockchain Service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Blockchain Service:', error);
      throw new Error(`Blockchain initialization failed: ${error}`);
    }
  }

  /**
   * Load connection profile from file
   */
  private async loadConnectionProfile(): Promise<any> {
    try {
      const profilePath = path.resolve(this.config.connectionProfilePath);
      const profileData = fs.readFileSync(profilePath, 'utf8');
      return JSON.parse(profileData);
    } catch (error) {
      logger.error('Failed to load connection profile:', error);
      throw new Error(`Connection profile loading failed: ${error}`);
    }
  }

  /**
   * Initialize wallet for user identity
   */
  private async initializeWallet(): Promise<Wallet> {
    try {
      const walletPath = path.resolve(this.config.walletPath);
      const wallet = await Wallets.newFileSystemWallet(walletPath);
      
      // Check if user identity exists in wallet
      const identity = await wallet.get(this.config.userId);
      if (!identity) {
        throw new Error(`User identity ${this.config.userId} not found in wallet`);
      }
      
      logger.info(`Wallet initialized for user: ${this.config.userId}`);
      return wallet;
      
    } catch (error) {
      logger.error('Failed to initialize wallet:', error);
      throw new Error(`Wallet initialization failed: ${error}`);
    }
  }

  /**
   * Initialize smart contracts
   */
  private async initializeContracts(): Promise<void> {
    if (!this.network) {
      throw new Error('Network not initialized');
    }

    try {
      // Initialize different contract modules
      const contractNames = [
        'UserContract',
        'ConsentContract', 
        'RecordContract',
        'AuditContract'
      ];

      for (const contractName of contractNames) {
        const contract = this.network.getContract(this.config.chaincodeName, contractName);
        this.contracts.set(contractName, contract);
        logger.info(`Contract ${contractName} initialized`);
      }
      
    } catch (error) {
      logger.error('Failed to initialize contracts:', error);
      throw new Error(`Contract initialization failed: ${error}`);
    }
  }

  /**
   * Submit a transaction to the blockchain
   */
  async submitTransaction(
    contractName: string,
    functionName: string,
    args: string[] = []
  ): Promise<TransactionResult> {
    this.ensureConnected();
    
    try {
      const contract = this.contracts.get(contractName);
      if (!contract) {
        throw new Error(`Contract ${contractName} not found`);
      }

      logger.info(`Submitting transaction: ${contractName}.${functionName}`, { args });
      
      const transaction: Transaction = contract.createTransaction(functionName);
      const result = await transaction.submit(...args);
      
      const transactionResult: TransactionResult = {
        transactionId: transaction.getTransactionId(),
        result: result.toString(),
        timestamp: new Date(),
        isSuccessful: true
      };

      logger.info(`Transaction submitted successfully: ${transactionResult.transactionId}`);
      return transactionResult;
      
    } catch (error) {
      logger.error(`Transaction submission failed: ${contractName}.${functionName}`, error);
      
      return {
        transactionId: '',
        result: null,
        timestamp: new Date(),
        isSuccessful: false
      };
    }
  }

  /**
   * Query the blockchain ledger
   */
  async queryLedger(
    contractName: string,
    functionName: string,
    args: string[] = []
  ): Promise<QueryResult> {
    this.ensureConnected();
    
    try {
      const contract = this.contracts.get(contractName);
      if (!contract) {
        throw new Error(`Contract ${contractName} not found`);
      }

      logger.info(`Querying ledger: ${contractName}.${functionName}`, { args });
      
      const result = await contract.evaluateTransaction(functionName, ...args);
      
      const queryResult: QueryResult = {
        result: result.toString(),
        timestamp: new Date()
      };

      logger.info(`Query executed successfully: ${contractName}.${functionName}`);
      return queryResult;
      
    } catch (error) {
      logger.error(`Query execution failed: ${contractName}.${functionName}`, error);
      throw new Error(`Query failed: ${error}`);
    }
  }

  /**
   * Register a new user on the blockchain
   */
  async registerUser(
    userId: string,
    role: string,
    publicKeys: { kyberPublicKey: string; dilithiumPublicKey: string },
    signature: string,
    email?: string,
    organizationId?: string
  ): Promise<TransactionResult> {
    const args = [
      userId,
      role,
      publicKeys.kyberPublicKey,
      publicKeys.dilithiumPublicKey,
      email || `${userId}@healthcare-dlt.com`,
      organizationId || 'healthcare-system',
      signature
    ];

    return this.submitTransaction('UserContract', 'registerUser', args);
  }

  /**
   * Approve user registration
   */
  async approveRegistration(
    userId: string,
    adminSignature: string
  ): Promise<TransactionResult> {
    const args = [userId, adminSignature];
    return this.submitTransaction('UserContract', 'approveRegistration', args);
  }

  /**
   * Grant consent for data access
   */
  async grantConsent(
    patientId: string,
    providerId: string,
    permissions: any[],
    expirationTime: string,
    patientSignature: string
  ): Promise<TransactionResult> {
    const args = [
      patientId,
      providerId,
      JSON.stringify(permissions),
      expirationTime,
      patientSignature
    ];

    return this.submitTransaction('ConsentContract', 'grantConsent', args);
  }

  /**
   * Revoke consent
   */
  async revokeConsent(
    consentTokenId: string,
    patientSignature: string
  ): Promise<TransactionResult> {
    const args = [consentTokenId, patientSignature];
    return this.submitTransaction('ConsentContract', 'revokeConsent', args);
  }

  /**
   * Validate access permissions
   */
  async validateAccess(
    providerId: string,
    patientId: string,
    resourceType: string
  ): Promise<QueryResult> {
    const args = [providerId, patientId, resourceType];
    return this.queryLedger('ConsentContract', 'validateAccess', args);
  }

  /**
   * Create medical record entry
   */
  async createRecord(
    recordId: string,
    patientId: string,
    ipfsHash: string,
    metadata: any,
    providerSignature: string
  ): Promise<TransactionResult> {
    const args = [
      recordId,
      patientId,
      ipfsHash,
      JSON.stringify(metadata),
      providerSignature
    ];

    return this.submitTransaction('RecordContract', 'createRecord', args);
  }

  /**
   * Access medical record
   */
  async accessRecord(
    recordId: string,
    providerId: string,
    providerSignature: string
  ): Promise<QueryResult> {
    const args = [recordId, providerId, providerSignature];
    return this.queryLedger('RecordContract', 'accessRecord', args);
  }

  /**
   * Log audit event
   */
  async logAuditEvent(
    eventType: string,
    userId: string,
    resourceId: string,
    details: any,
    signature: string
  ): Promise<TransactionResult> {
    const args = [
      eventType,
      userId,
      resourceId || '',
      JSON.stringify(details),
      signature
    ];

    return this.submitTransaction('AuditContract', 'logEvent', args);
  }

  /**
   * Get audit trail
   */
  async getAuditTrail(
    filters: any,
    auditorSignature: string
  ): Promise<QueryResult> {
    const args = [JSON.stringify(filters), auditorSignature];
    return this.queryLedger('AuditContract', 'getAuditTrail', args);
  }

  /**
   * Get user information with enhanced retry logic and proper error handling
   */
  async getUser(userId: string): Promise<QueryResult> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Querying user ${userId} (attempt ${attempt}/${maxRetries})`);
        
        const args = [userId];
        const result = await this.queryLedger('UserContract', 'getUser', args);
        
        // If we get a result, return it
        if (result && result.result) {
          logger.info(`User query successful for ${userId} on attempt ${attempt}`);
          return result;
        }
        
        // If no result but no error, treat as user not found
        if (attempt === maxRetries) {
          throw new Error(`User ${userId} not found in blockchain`);
        }
        
      } catch (error) {
        logger.warn(`User query attempt ${attempt} failed for ${userId}:`, error);
        
        // If this is the last attempt, try alternative approaches
        if (attempt === maxRetries) {
          logger.info(`Trying alternative approaches for user ${userId}`);
          
          // For admin user, try to create if not exists
          if (userId === 'admin') {
            try {
              logger.info('Attempting to create admin user via blockchain...');
              await this.submitTransaction('UserContract', 'createAdminUser', []);
              
              // Wait for state propagation
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Try query again
              const retryResult = await this.queryLedger('UserContract', 'getUser', [userId]);
              if (retryResult && retryResult.result) {
                logger.info(`Admin user created and queried successfully`);
                return retryResult;
              }
            } catch (createError) {
              logger.error(`Failed to create admin user:`, createError);
            }
          }
          
          // Final attempt - throw the original error
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw new Error(`Failed to query user ${userId} after ${maxRetries} attempts`);
  }

  /**
   * Get all pending registrations (admin only)
   */
  async getPendingRegistrations(adminSignature: string): Promise<QueryResult> {
    const args = [adminSignature];
    return this.queryLedger('UserContract', 'getPendingRegistrations', args);
  }

  /**
   * Get consent token details
   */
  async getConsentToken(tokenId: string): Promise<QueryResult> {
    const args = [tokenId];
    return this.queryLedger('ConsentContract', 'getConsentToken', args);
  }

  /**
   * Get all consent tokens for a patient
   */
  async getPatientConsents(patientId: string): Promise<QueryResult> {
    const args = [patientId];
    return this.queryLedger('ConsentContract', 'getPatientConsents', args);
  }

  /**
   * Get all consent tokens for a provider
   */
  async getProviderConsents(providerId: string): Promise<QueryResult> {
    const args = [providerId];
    return this.queryLedger('ConsentContract', 'getProviderConsents', args);
  }

  /**
   * Check if service is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.gateway || !this.network) {
      throw new Error('Blockchain service not connected. Call initialize() first.');
    }
  }

  /**
   * Disconnect from the blockchain network
   */
  async disconnect(): Promise<void> {
    try {
      if (this.gateway) {
        await this.gateway.disconnect();
        this.gateway = null;
        this.network = null;
        this.contracts.clear();
        this.isConnected = false;
        logger.info('Blockchain Service disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from blockchain:', error);
    }
  }

  /**
   * Get connection status
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Health check for blockchain connection
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'disconnected',
          details: { message: 'Service not connected' }
        };
      }

      // Simple connection test without querying chaincode
      if (this.gateway && this.network && this.contracts.size > 0) {
        return {
          status: 'healthy',
          details: {
            channelName: this.config.channelName,
            chaincodeName: this.config.chaincodeName,
            userId: this.config.userId,
            contractsLoaded: this.contracts.size,
            connected: this.isConnected
          }
        };
      } else {
        return {
          status: 'unhealthy',
          details: { message: 'Gateway or network not properly initialized' }
        };
      }
      
    } catch (error) {
      logger.error('Blockchain health check failed:', error);
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// Note: BlockchainService is managed by blockchainManager
// Do not create singleton instance here to avoid circular dependencies