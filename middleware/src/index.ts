import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { auditLogger } from './middleware/auditLogger.js';
import { 
  generalRateLimit, 
  securityHeaders, 
  validateRequestSize, 
  requestTimeout,
  ipWhitelist 
} from './middleware/security.js';
import { sanitizeRequest } from './middleware/validation.js';
import { initializeIPFS, setupIPFSShutdownHandlers } from './utils/ipfsInitializer.js';
import { blockchainManager, setupBlockchainShutdownHandlers } from './utils/blockchainManager.js';
// import { initializeDefaultUsers } from './utils/defaultUsers.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID']
}));

// IP whitelist (configure via environment variable)
const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [];
app.use(ipWhitelist(allowedIPs));

// Request timeout
app.use(requestTimeout(30000)); // 30 second timeout

// Rate limiting
app.use(generalRateLimit);

// Request size validation
app.use(validateRequestSize);

// Body parsing middleware
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request sanitization
app.use(sanitizeRequest);

// Audit logging middleware
app.use(auditLogger);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    let blockchainHealth;
    
    try {
      blockchainHealth = await blockchainManager.healthCheck();
    } catch (error) {
      // In development mode, blockchain might not be available
      blockchainHealth = {
        status: 'mock',
        details: { message: 'Running in development mode with mock blockchain' }
      };
    }
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: { status: 'healthy' },
        blockchain: blockchainHealth,
        ipfs: { status: 'mock', message: 'Running in development mode' },
        auth: { status: 'healthy' }
      },
      rateLimits: {
        general: process.env.GENERAL_RATE_LIMIT_MAX || '1000',
        auth: process.env.AUTH_RATE_LIMIT_MAX || '100',
        window: process.env.RATE_LIMIT_WINDOW_MS || '900000'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import API routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import storageRoutes from './routes/storage.js';
import consentRoutes from './routes/consent-simple.js';
import recordRoutes from './routes/records-simple.js';
import auditRoutes from './routes/audit-simple.js';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api', (req, res) => {
  res.json({
    message: 'Healthcare DLT Core Middleware API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      admin: '/api/admin',
      records: '/api/records',
      consent: '/api/consent',
      audit: '/api/audit',
      storage: '/api/storage'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize IPFS service
    await initializeIPFS();
    
    // Initialize default users
    // await initializeDefaultUsers();
    
    // Initialize blockchain service with retry logic
    try {
      await blockchainManager.retryInitialization(3);
      logger.info('Blockchain service initialized successfully');
    } catch (error) {
      logger.warn('Blockchain service initialization failed, server will start without blockchain connectivity:', error);
      // Continue starting server even if blockchain fails - allows for graceful degradation
    }
    
    // Setup graceful shutdown handlers
    setupIPFSShutdownHandlers();
    setupBlockchainShutdownHandlers();
    
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Healthcare DLT Middleware server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { app as default };