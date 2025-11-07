import { BlockchainService } from '../services/blockchainService.js';
import { getBlockchainConfig, validateBlockchainConfig } from '../config/blockchain.js';
import { logger } from './logger.js';

class BlockchainManager {
  private static instance: BlockchainManager;
  private blockchainService: BlockchainService | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): BlockchainManager {
    if (!BlockchainManager.instance) {
      BlockchainManager.instance = new BlockchainManager();
    }
    return BlockchainManager.instance;
  }

  /**
   * Initialize blockchain service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      logger.info('Initializing Blockchain Manager...');

      // Get and validate configuration
      const config = getBlockchainConfig();
      validateBlockchainConfig(config);

      // Create blockchain service instance
      this.blockchainService = new BlockchainService(config);

      // Initialize the service
      await this.blockchainService.initialize();

      this.isInitialized = true;
      logger.info('Blockchain Manager initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Blockchain Manager:', error);
      this.blockchainService = null;
      this.isInitialized = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Get blockchain service instance
   */
  public getBlockchainService(): BlockchainService {
    if (!this.isInitialized || !this.blockchainService) {
      throw new Error('Blockchain Manager not initialized. Call initialize() first.');
    }
    return this.blockchainService;
  }

  /**
   * Check if blockchain service is available
   */
  public isServiceAvailable(): boolean {
    return this.isInitialized && this.blockchainService !== null;
  }

  /**
   * Perform health check
   */
  public async healthCheck(): Promise<{ status: string; details: any }> {
    if (!this.isServiceAvailable()) {
      return {
        status: 'unavailable',
        details: { message: 'Blockchain service not initialized' }
      };
    }

    return this.blockchainService!.healthCheck();
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      if (this.blockchainService) {
        await this.blockchainService.disconnect();
        this.blockchainService = null;
      }
      this.isInitialized = false;
      this.initializationPromise = null;
      logger.info('Blockchain Manager shutdown completed');
    } catch (error) {
      logger.error('Error during Blockchain Manager shutdown:', error);
    }
  }

  /**
   * Retry initialization with exponential backoff
   */
  public async retryInitialization(maxRetries: number = 3): Promise<void> {
    let retries = 0;
    let delay = 1000; // Start with 1 second

    while (retries < maxRetries) {
      try {
        await this.initialize();
        return;
      } catch (error) {
        retries++;
        logger.warn(`Blockchain initialization attempt ${retries} failed:`, error);

        if (retries >= maxRetries) {
          logger.error('Max retries reached for blockchain initialization');
          throw error;
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;

        // Reset state for retry
        this.isInitialized = false;
        this.initializationPromise = null;
        this.blockchainService = null;
      }
    }
  }
}

// Export singleton instance
export const blockchainManager = BlockchainManager.getInstance();

// Setup graceful shutdown handlers
export const setupBlockchainShutdownHandlers = (): void => {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down blockchain service gracefully...`);
    try {
      await blockchainManager.shutdown();
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
};