# Mocked Components Documentation

This document provides a comprehensive overview of all mocked components, services, and functionalities across the Healthcare DLT system including middleware, frontend, and blockchain (fabric-network) layers.

## Overview

The Healthcare DLT system uses extensive mocking for development and testing purposes. This allows for rapid development and testing without requiring full production infrastructure.

## 🔐 Post-Quantum Cryptography (PQC) Mocking

### CRYSTALS-Kyber (Key Encapsulation)
- **Location**: `frontend/src/lib/crypto/pqc-wrapper.ts`
- **Mock Implementation**: 
  - Simulated key generation using deterministic timestamps and random seeds
  - Mock encapsulation/decapsulation operations
  - Base64 encoded mock keys: `kyber_${variant}_public_${timestamp}_${randomSeed}`
- **Variants Mocked**: Kyber-512, Kyber-768, Kyber-1024
- **Usage**: Client-side key exchange simulation

### CRYSTALS-Dilithium (Digital Signatures)
- **Location**: `frontend/src/lib/crypto/pqc-wrapper.ts`
- **Mock Implementation**:
  - Deterministic signature generation using SHA-256 hash
  - Mock verification using expected signature comparison
  - Base64 encoded mock keys: `dilithium_${variant}_public_${timestamp}_${randomSeed}`
- **Variants Mocked**: Dilithium-2, Dilithium-3, Dilithium-5
- **Usage**: Digital signature simulation for authentication and data integrity

### PQC Key Management
- **Location**: `frontend/src/lib/crypto/key-manager.ts`
- **Mock Features**:
  - Local storage encryption using AES-GCM
  - Password-based key derivation (PBKDF2)
  - Secure key storage and retrieval simulation
  - Key pair generation for users

## 🔗 Blockchain & Hyperledger Fabric Mocking

### Blockchain Service
- **Location**: `middleware/src/services/blockchainService.ts`
- **Mock Implementation**: 
  - In-memory user storage instead of actual blockchain
  - Simulated transaction submission and ledger queries
  - Mock contract interactions (UserContract, ConsentContract, RecordContract, AuditContract)
- **Test Mocks**: `middleware/src/__tests__/setup.ts`
  - `blockchainService.initialize()` - Returns resolved promise
  - `blockchainService.submitTransaction()` - Returns mock transaction result
  - `blockchainService.queryLedger()` - Returns mock query result

### Smart Contracts (Chaincode)
- **Location**: `fabric-network/chaincode/`
- **Mock Structure**:
  - Modular chaincode architecture with base contract
  - UserContract, ConsentContract, RecordContract, AuditContract placeholders
  - Package configuration for deployment simulation
- **Status**: Structural implementation ready, business logic mocked

### Fabric Network Configuration
- **Location**: `fabric-network/docker-compose.yml`
- **Mock Network**:
  - Three-organization setup (Hospital, Lab, Insurer)
  - Peer nodes with chaincode execution simulation
  - Certificate authority and orderer services
- **Environment Variables**: Mock blockchain configuration in `.env` files

## 📁 IPFS (InterPlanetary File System) Mocking

### IPFS Service
- **Location**: `middleware/src/services/ipfsService.ts`
- **Mock Implementation**:
  - Helia-based IPFS simulation
  - Mock file upload/download operations
  - Simulated CID generation and pinning
- **Test Mocks**: `middleware/src/__tests__/setup.ts`
  - `ipfsService.uploadFile()` - Returns mock hash 'QmMockHash123'
  - `ipfsService.retrieveFile()` - Returns mock file data buffer
  - `ipfsService.pinFile()` - Returns true

### IPFS Configuration
- **Environment Variables**:
  - `IPFS_NODE_URL=http://localhost:5001` (Mock)
  - `IPFS_GATEWAY_URL=http://localhost:8080` (Mock)
- **Usage**: Off-chain encrypted medical data storage simulation

## 🔐 Authentication & Authorization (NOW REAL!)

### ✅ **Real Blockchain Authentication Service**
- **Location**: `middleware/src/services/authService.ts`
- **Real Features**:
  - Queries users from actual Hyperledger Fabric blockchain
  - Real user registration on blockchain via chaincode
  - JWT token generation and verification
  - Blockchain-based signature validation
- **Admin User**: Pre-created in blockchain during initialization (`admin`)

### ✅ **Real User Management**
- **Blockchain Storage**: Users stored in Hyperledger Fabric ledger
- **Smart Contract**: `UserContract` in chaincode handles registration/approval
- **Admin Operations**: Real blockchain transactions for user approval
- **Registration Flow**: 
  1. User registers → Stored on blockchain as 'pending'
  2. Admin approves → Blockchain transaction updates status to 'approved'
  3. User can login → Blockchain query validates user

### ❌ **What's Still Mocked in Auth**
- **Signature Verification**: Still using mock PQC signature validation
- **Test Environment**: Jest tests still mock blockchain service calls
- **PQC Key Generation**: Frontend still generates mock keys

## 🎨 Frontend Data Mocking

### Mock Data Service
- **Location**: `frontend/src/lib/mock-data.ts`
- **Mock Entities**:
  - **Users**: Mock users with PQC keys and registration status
  - **Medical Records**: Sample diagnosis and lab results with IPFS hashes
  - **Consent Tokens**: Permission-based access control simulation
  - **Audit Entries**: Blockchain transaction and access logs
  - **Dashboard Stats**: System statistics and metrics
  - **System Status**: Quantum resistance and encryption status

### Data Context Provider
- **Location**: `frontend/src/contexts/data-context.tsx`
- **Mock Features**:
  - Toggle between mock and real data sources
  - Automatic fallback to mock data on API failures
  - Visual indicators for mock data usage
  - Retry logic with exponential backoff
- **Configuration**:
  - `useMockData`: Boolean flag for mock data usage
  - `fallbackToMock`: Automatic fallback on API errors
  - `mockDataIndicator`: Visual indication of data source

## 🧪 Testing Mocks

### Jest Test Setup
- **Location**: `middleware/src/__tests__/setup.ts`
- **Global Mocks**:
  - Blockchain service operations
  - IPFS file operations
  - Cryptographic signature verification
  - Environment variables for testing

### Frontend Testing
- **Location**: `frontend/src/__tests__/setup.ts`
- **Mock Components**: Authentication context and route testing utilities

## 🔧 Development & Configuration Mocking

### Environment Configuration
- **Mock Blockchain**: `BLOCKCHAIN_NETWORK_CONFIG=local`
- **Mock IPFS**: Local node URLs for development
- **Mock JWT**: Test secrets and extended expiration times
- **Mock PQC**: Simulated post-quantum cryptography libraries

### ✅ **Real Blockchain PowerShell Scripts**
- **Real Authentication Scripts**: 
  - `blockchain-auth.ps1`: Real blockchain user registration and login
  - `init-blockchain.ps1`: Initialize blockchain with admin user
  - `test-blockchain-auth.ps1`: Test real blockchain authentication
- **Real Operations**:
  - User registration stored on blockchain
  - Admin approval via blockchain transactions
  - Login authentication queries blockchain
  - Profile data retrieved from blockchain

## 📊 System Integration Mocking

### API Layer
- **Mock Endpoints**: All middleware API endpoints return simulated data
- **Error Simulation**: Configurable error responses for testing
- **Rate Limiting**: Mock rate limiting for development testing

### Audit Trail
- **Mock Blockchain Storage**: In-memory audit log storage
- **Mock Transaction IDs**: Generated transaction identifiers
- **Mock Block Numbers**: Simulated blockchain block references

## 🚀 Production Transition Notes

### Components Requiring Real Implementation

1. **PQC Libraries**: Replace with actual liboqs or similar libraries
2. **Hyperledger Fabric**: Deploy real blockchain network
3. **IPFS Network**: Connect to production IPFS nodes
4. **Hardware Security**: Implement HSM/TPM for key storage
5. **Certificate Management**: Real PKI infrastructure
6. **Database**: Persistent storage for session management
7. **Monitoring**: Production logging and metrics collection

### Security Considerations

- All mock cryptographic operations use deterministic or simplified algorithms
- Private keys are stored in browser localStorage (development only)
- Signature verification is bypassed in test environments
- Mock users have predictable credentials and keys

## 📝 Mock Data Indicators

The system provides visual and programmatic indicators when mock data is active:

- **Frontend Banners**: Visual indicators showing mock data usage
- **API Responses**: Metadata indicating data source
- **Console Logging**: Development warnings about mock services
- **Configuration Flags**: Environment-based mock service toggles

---

**Note**: This mocking infrastructure enables rapid development and comprehensive testing while maintaining the same interfaces that will be used in production. All mock implementations follow the same API contracts as their production counterparts.