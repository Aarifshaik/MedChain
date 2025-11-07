# Healthcare DLT Core - Production Setup Guide

## 🚀 Quick Start (Local Production Environment)

This guide will help you set up and run the complete Healthcare DLT Core system locally with all features working.

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**

### 1. Install Dependencies

```bash
# Install all dependencies for root, frontend, and middleware
npm run install:all
```

### 2. Environment Configuration

#### Middleware Environment (.env)
Create `middleware/.env`:
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# Blockchain Configuration (Mock for local development)
BLOCKCHAIN_NETWORK_CONFIG=local
BLOCKCHAIN_CHANNEL=healthcare-channel
BLOCKCHAIN_CHAINCODE=healthcare-records

# IPFS Configuration (Mock for local development)
IPFS_NODE_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080

# Security
ALLOWED_IPS=127.0.0.1,::1,localhost
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

#### Frontend Environment (.env.local)
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Healthcare DLT Core
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 3. Start the System

```bash
# Start both frontend and middleware concurrently
npm run dev
```

This will start:
- **Frontend**: http://localhost:3000
- **Middleware API**: http://localhost:3001

### 4. System Features Available

#### ✅ **User Registration & Authentication**
- **Patients**: Can register and manage their medical records
- **Doctors**: Can register, access patient records with consent
- **Laboratories**: Can upload lab results
- **Insurers**: Can access records for claims processing
- **System Admins**: Can manage users and view audit trails
- **Auditors**: Can access compliance reports

#### ✅ **Medical Record Management**
- Upload encrypted medical records
- Secure storage simulation (IPFS mock)
- Blockchain metadata storage simulation
- Record access with consent validation

#### ✅ **Consent Management**
- Grant consent to healthcare providers
- Revoke consent
- Time-based consent expiration
- Role-based access control

#### ✅ **Audit Trail & Compliance**
- Comprehensive audit logging
- Compliance report generation
- Audit trail integrity verification
- Regulatory compliance metrics

#### ✅ **Post-Quantum Cryptography**
- Client-side key generation (Kyber + Dilithium simulation)
- Secure local key storage
- Digital signatures for all operations
- End-to-end encryption

### 5. Test User Accounts

The system includes mock user accounts for testing:

```javascript
// Test Users (use these IDs for login)
{
  'patient_001': { role: 'patient', status: 'approved' },
  'doctor_001': { role: 'doctor', status: 'approved' },
  'admin_001': { role: 'system_admin', status: 'approved' }
}
```

### 6. API Endpoints

#### Authentication
- `POST /api/auth/nonce` - Generate authentication nonce
- `POST /api/auth/register` - Register new user
- `POST /api/auth/authenticate` - Authenticate user
- `GET /api/auth/profile` - Get user profile

#### Medical Records
- `POST /api/records/upload` - Upload medical record
- `GET /api/records/:recordId` - Access medical record

#### Consent Management
- `POST /api/consent/grant` - Grant consent
- `POST /api/consent/:tokenId/revoke` - Revoke consent
- `GET /api/consent/status` - Get active consents

#### Audit & Compliance
- `GET /api/audit/trail` - Get audit trail
- `GET /api/audit/compliance-report` - Generate compliance report
- `GET /api/audit/verify-integrity` - Verify audit integrity

### 7. Frontend Routes

- `/` - Landing page
- `/auth/login` - User login
- `/auth/register` - User registration
- `/dashboard/patient` - Patient dashboard
- `/dashboard/doctor` - Doctor dashboard
- `/dashboard/admin` - Admin dashboard
- `/records` - Medical records management
- `/consent` - Consent management
- `/audit` - Audit trail (admin/auditor only)
- `/compliance` - Compliance reports (admin/auditor only)

### 8. Development Workflow

#### Running Tests
```bash
# Run middleware integration tests
cd middleware && npm test

# Run frontend integration tests
cd frontend && npm test
```

#### Building for Production
```bash
# Build both frontend and middleware
npm run build
```

#### Monitoring Logs
- **Middleware logs**: Check console output for API requests and blockchain operations
- **Frontend logs**: Check browser console for client-side operations
- **Audit logs**: Available through `/api/audit/trail` endpoint

### 9. System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Middleware    │    │   Blockchain    │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (Simulated)   │
│   Port: 3000    │    │   Port: 3001    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PQC Crypto    │    │   IPFS Storage  │    │   Audit Trail   │
│   (Client-side) │    │   (Simulated)   │    │   (Blockchain)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 10. Production Deployment Notes

For actual production deployment:

1. **Replace Mock Services**: Implement real Hyperledger Fabric and IPFS connections
2. **Security Hardening**: Use real PQC libraries, secure key management
3. **Database**: Add persistent storage for session management
4. **Monitoring**: Implement comprehensive logging and monitoring
5. **Load Balancing**: Add load balancers for high availability
6. **SSL/TLS**: Configure HTTPS for all communications

### 11. Troubleshooting

#### Common Issues:

**Port Already in Use**:
```bash
# Kill processes on ports 3000 and 3001
npx kill-port 3000 3001
```

**Dependencies Issues**:
```bash
# Clean install
rm -rf node_modules frontend/node_modules middleware/node_modules
npm run install:all
```

**Environment Variables**:
- Ensure `.env` files are created in correct locations
- Check that all required environment variables are set

### 12. Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check that ports 3000 and 3001 are available

---

## 🎉 You're Ready!

Your Healthcare DLT Core system is now running with full functionality:
- ✅ User registration and authentication
- ✅ Medical record management
- ✅ Consent management
- ✅ Audit trails and compliance
- ✅ Post-quantum cryptography
- ✅ Complete end-to-end workflows

Visit http://localhost:3000 to start using the system!