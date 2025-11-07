# Healthcare DLT Authentication System

## Overview

The Healthcare DLT system uses a **two-step quantum-resistant authentication** process with post-quantum cryptographic (PQC) algorithms including CRYSTALS-Kyber and CRYSTALS-Dilithium.

## 🔐 Authentication Flow

### 1. Registration Process

#### Step 1: Choose User Role
Navigate to `/auth/register` and select your role:
- **Patient**: Access and manage personal health records
- **Doctor**: Manage patient records and provide medical services  
- **Laboratory**: Upload and manage test results
- **Insurer**: Process insurance claims and coverage
- **Auditor**: Audit system compliance and access logs
- **System Admin**: Manage system users and configurations

#### Step 2: Fill Registration Form
Complete the role-specific registration form with:

**Basic Information (All Roles):**
- User ID (unique identifier)
- First Name & Last Name
- Email Address
- Phone Number
- Password (minimum 8 characters)

**Role-Specific Information:**
- **Doctor/Lab/Insurer/Auditor**: License Number, Institution, Credentials
- **Patient**: Date of Birth, Emergency Contact
- **System Admin**: Institution, Experience

#### Step 3: Key Generation
The system automatically generates quantum-resistant key pairs:
- **Kyber Public/Private Key**: For encryption/decryption
- **Dilithium Public/Private Key**: For digital signatures

#### Step 4: Approval Process
- **Patients**: Approved by licensed doctors
- **Healthcare Professionals**: Approved by system administrators
- **System Admins**: Approved by existing admins

### 2. Login Process

#### Step 1: Navigate to Login
Go to `/auth/login` and enter your credentials:
- User ID
- Password

#### Step 2: Two-Step Authentication
The system performs a secure two-step authentication:

1. **Get Nonce**: System generates a unique nonce (number used once)
2. **Sign Nonce**: Your private key signs the nonce
3. **Verify Signature**: System verifies the signature with your public key

#### Step 3: Access Dashboard
Upon successful authentication, you're redirected to your role-specific dashboard.

## 🔑 Key Management

### Key Generation
- Keys are generated using **CRYSTALS-Kyber** (encryption) and **CRYSTALS-Dilithium** (signatures)
- Private keys are encrypted with your password and stored locally
- Public keys are stored on the blockchain for verification

### Key Storage
- **Private Keys**: Encrypted and stored in browser's local storage
- **Public Keys**: Stored on the blockchain for verification
- **Key Backup**: Download your key backup file during registration

### Key Security
- Keys use **post-quantum cryptography** resistant to quantum computer attacks
- Private keys are never transmitted over the network
- Password is used only for local key encryption/decryption

## 👥 Default Users

For testing and initial setup, the system includes default users:

### System Administrator
- **User ID**: `admin`
- **Password**: `Healthcare@2024!`
- **Role**: System Admin
- **Permissions**: Full system access, user management

### Default Doctor
- **User ID**: `doctor1`
- **Password**: `Doctor@2024!`
- **Role**: Doctor
- **License**: MD123456
- **Specialization**: General Medicine

### Default Patient
- **User ID**: `patient1`
- **Password**: `Patient@2024!`
- **Role**: Patient
- **DOB**: 1990-01-01

> **⚠️ Security Note**: Change default passwords in production environments!

## 🌐 API Endpoints

### Authentication Endpoints

#### 1. Get Nonce
```http
POST /api/auth/nonce
Content-Type: application/json

{
  "userId": "your_user_id"
}
```

**Response:**
```json
{
  "nonce": "abc123...",
  "expiresAt": "2024-11-06T12:00:00.000Z",
  "expiresIn": 300
}
```

#### 2. Authenticate
```http
POST /api/auth/authenticate
Content-Type: application/json

{
  "userId": "your_user_id",
  "nonce": "abc123...",
  "signature": "signed_nonce_data"
}
```

**Response:**
```json
{
  "user": {
    "userId": "your_user_id",
    "role": "doctor",
    "personalInfo": {...},
    "professionalInfo": {...}
  },
  "token": "jwt_token_here"
}
```

#### 3. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "userId": "new_user_id",
  "role": "doctor",
  "publicKeys": {
    "kyberPublicKey": "kyber_public_key_data",
    "dilithiumPublicKey": "dilithium_public_key_data"
  },
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123"
  },
  "professionalInfo": {
    "licenseNumber": "MD123456",
    "specialization": "Cardiology",
    "institution": "City Hospital"
  }
}
```

#### 4. Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer your_jwt_token
```

#### 5. Logout
```http
POST /api/auth/logout
Authorization: Bearer your_jwt_token
```

## 🔒 Security Features

### Post-Quantum Cryptography
- **CRYSTALS-Kyber**: NIST-standardized key encapsulation mechanism
- **CRYSTALS-Dilithium**: NIST-standardized digital signature algorithm
- **Quantum-Resistant**: Secure against both classical and quantum attacks

### Authentication Security
- **Nonce-Based**: Prevents replay attacks
- **Time-Limited**: Nonces expire in 5 minutes
- **Rate Limited**: Prevents brute force attacks
- **JWT Tokens**: Secure session management

### Data Protection
- **Local Key Storage**: Private keys never leave your device
- **Password Encryption**: Keys encrypted with user password
- **TLS/HTTPS**: All communications encrypted in transit
- **Audit Logging**: All authentication attempts logged

## 🚨 Error Handling

### Common Error Codes

#### Authentication Errors
- `INVALID_NONCE`: Nonce is invalid or expired
- `NONCE_EXPIRED`: Nonce has expired (>5 minutes)
- `NONCE_MISMATCH`: Nonce doesn't match user
- `AUTHENTICATION_FAILED`: Invalid signature or credentials
- `BLOCKCHAIN_UNAVAILABLE`: Blockchain service unavailable

#### Registration Errors
- `REGISTRATION_FAILED`: User registration failed
- `VALIDATION_ERROR`: Invalid input data
- `USER_EXISTS`: User ID already exists
- `INVALID_KEYS`: Invalid public key format

#### Network Errors
- `NETWORK_ERROR`: Connection failed
- `TIMEOUT_ERROR`: Request timed out
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable

## 🔧 Troubleshooting

### Login Issues

#### "No keys found for this user"
- **Cause**: User hasn't registered or keys not stored locally
- **Solution**: Register first or upload key backup file

#### "Authentication failed"
- **Cause**: Invalid signature or expired nonce
- **Solution**: Try logging in again to get fresh nonce

#### "Blockchain service unavailable"
- **Cause**: Blockchain network is down
- **Solution**: Wait for service restoration or contact admin

### Registration Issues

#### "Kyber public key is required"
- **Cause**: Key generation failed or keys not properly formatted
- **Solution**: Retry registration or check browser compatibility

#### "Validation failed"
- **Cause**: Missing or invalid form data
- **Solution**: Check all required fields are filled correctly

### Network Issues

#### "Unable to connect to authentication server"
- **Cause**: Network connectivity issues
- **Solution**: Check internet connection and try again

## 📱 Frontend Integration

### Using the Auth Context

```typescript
import { useAuth } from '@/contexts/auth-context';

function LoginComponent() {
  const { login, isLoading, error } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
      // Redirect to dashboard
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
}
```

### API Client Usage

```typescript
import { apiClient } from '@/lib/api';

// Get nonce
const nonceResponse = await apiClient.getNonce('user123');

// Authenticate
const authResponse = await apiClient.authenticate({
  userId: 'user123',
  nonce: nonceResponse.data.nonce,
  signature: 'signed_data'
});
```

## 🔄 Development Workflow

### 1. Start Services
```bash
# Start blockchain network
cd fabric-network
docker-compose up -d

# Start middleware
cd middleware
npm run dev

# Start frontend
cd frontend
npm run dev
```

### 2. Test Authentication
1. Open `http://localhost:3000/auth/login`
2. Use default credentials (admin/Healthcare@2024!)
3. Verify successful login and dashboard access

### 3. Test Registration
1. Open `http://localhost:3000/auth/register`
2. Select role and fill form
3. Generate keys and submit registration
4. Check approval status

## 📋 Production Checklist

### Security
- [ ] Change all default passwords
- [ ] Enable HTTPS/TLS encryption
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Configure secure key storage

### Infrastructure
- [ ] Deploy blockchain network
- [ ] Set up load balancers
- [ ] Configure monitoring
- [ ] Set up backup systems
- [ ] Configure disaster recovery

### Testing
- [ ] Test all authentication flows
- [ ] Verify key generation/storage
- [ ] Test error handling
- [ ] Performance testing
- [ ] Security penetration testing

## 📞 Support

For technical support or questions:
- **Documentation**: Check this README and inline code comments
- **Logs**: Check browser console and server logs for errors
- **Default Users**: Use provided default credentials for testing
- **Network Status**: Verify blockchain and middleware services are running

---

**Last Updated**: November 6, 2024
**Version**: 1.0.0
**Compatibility**: Node.js 18+, Modern browsers with WebCrypto API