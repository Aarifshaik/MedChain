# Healthcare DLT Authentication Guide

## Overview
This guide covers all authentication operations using the current mock implementation. All operations are fully functional for development and testing purposes.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Default Users](#default-users)
3. [Terminal Authentication](#terminal-authentication)
4. [Frontend Authentication](#frontend-authentication)
5. [API Endpoints](#api-endpoints)
6. [Complete Workflows](#complete-workflows)
7. [Testing Scenarios](#testing-scenarios)

---

## System Architecture

### Components
- **Frontend**: Next.js React application (Port 3000)
- **Middleware**: Express.js API server (Port 3001)
- **Mock Blockchain**: In-memory user storage
- **Mock PQC**: Simulated post-quantum cryptography

### Authentication Flow
```
User → Frontend/Terminal → Middleware API → Mock Blockchain → Response
```

---

## Default Users

The system comes with pre-configured users for immediate testing:

| User ID | Password | Role | Status |
|---------|----------|------|--------|
| `admin` | `Healthcare@2024!` | system_admin | approved |
| `doctor1` | `Doctor@2024!` | doctor | approved |
| `patient1` | `Patient@2024!` | patient | approved |

### Legacy Test Users (also available)
- `admin_001` (system_admin)
- `doctor_001` (doctor) 
- `patient_001` (patient)

---

## Terminal Authentication

### Prerequisites
```powershell
# Ensure middleware is running
cd middleware
npm start
# Server should be running on http://localhost:3001
```

### 1. Login Process

#### Step 1: Get Authentication Nonce
```powershell
$baseUrl = "http://localhost:3001/api"

# Request nonce for user
$nonceResponse = Invoke-RestMethod -Uri "$baseUrl/auth/nonce" -Method POST -ContentType "application/json" -Body '{"userId": "admin"}'

Write-Host "Nonce: $($nonceResponse.nonce)"
Write-Host "Expires: $($nonceResponse.expiresAt)"
```

#### Step 2: Create Signature (Mock)
```powershell
# Create mock signature (in production, this would use Dilithium private key)
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$message = "admin:$($nonceResponse.nonce):${timestamp}"
$signature = "simulated_signature_" + [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($message))

Write-Host "Message: $message"
Write-Host "Signature: $signature"
```

#### Step 3: Authenticate
```powershell
$authBody = @{
    userId = "admin"
    nonce = $nonceResponse.nonce
    signature = $signature
} | ConvertTo-Json

$authResponse = Invoke-RestMethod -Uri "$baseUrl/auth/authenticate" -Method POST -ContentType "application/json" -Body $authBody

$token = $authResponse.token
Write-Host "Login successful!"
Write-Host "Token: $($token.Substring(0,20))..."
Write-Host "User: $($authResponse.user.userId)"
Write-Host "Role: $($authResponse.user.role)"
```

#### Step 4: Use Token for API Calls
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Get user profile
$profile = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method GET -Headers $headers
Write-Host "Profile: $($profile | ConvertTo-Json -Depth 3)"
```

### 2. Registration Process

#### Register New User
```powershell
$newUserId = "testuser_$(Get-Random -Maximum 1000)"

$regBody = @{
    userId = $newUserId
    role = "patient"
    publicKeys = @{
        kyberPublicKey = "mock_kyber_key_$(Get-Random)"
        dilithiumPublicKey = "mock_dilithium_key_$(Get-Random)"
    }
    personalInfo = @{
        firstName = "John"
        lastName = "Doe"
        email = "john.doe@example.com"
        phone = "+1-555-0123"
    }
} | ConvertTo-Json -Depth 3

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $regBody
    Write-Host "Registration successful!"
    Write-Host "User ID: $($regResponse.userId)"
    Write-Host "Status: $($regResponse.status)"
    Write-Host "Transaction ID: $($regResponse.transactionId)"
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Registration failed: $($errorDetails.error.message)" -ForegroundColor Red
}
```

### 3. Complete Terminal Script

Save this as `complete-auth-test.ps1`:

```powershell
# Healthcare DLT Complete Authentication Test

param(
    [string]$UserId = "admin",
    [string]$BaseUrl = "http://localhost:3001/api"
)

Write-Host "=========================================="
Write-Host "Healthcare DLT Authentication Test"
Write-Host "User: $UserId"
Write-Host "=========================================="

try {
    # Step 1: Get Nonce
    Write-Host "`n1. Getting authentication nonce..."
    $nonceBody = @{ userId = $UserId } | ConvertTo-Json
    $nonceResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/nonce" -Method POST -ContentType "application/json" -Body $nonceBody
    Write-Host "✓ Nonce received: $($nonceResponse.nonce.Substring(0,8))..."

    # Step 2: Create Signature
    Write-Host "`n2. Creating signature..."
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $message = "${UserId}:$($nonceResponse.nonce):${timestamp}"
    $signature = "simulated_signature_" + [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($message))
    Write-Host "✓ Signature created"

    # Step 3: Authenticate
    Write-Host "`n3. Authenticating..."
    $authBody = @{
        userId = $UserId
        nonce = $nonceResponse.nonce
        signature = $signature
    } | ConvertTo-Json
    
    $authResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/authenticate" -Method POST -ContentType "application/json" -Body $authBody
    $token = $authResponse.token
    Write-Host "✓ Authentication successful!"
    Write-Host "  User: $($authResponse.user.userId)"
    Write-Host "  Role: $($authResponse.user.role)"

    # Step 4: Test Authenticated Endpoints
    Write-Host "`n4. Testing authenticated endpoints..."
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    # Get profile
    $profile = Invoke-RestMethod -Uri "$BaseUrl/auth/profile" -Method GET -Headers $headers
    Write-Host "✓ Profile retrieved successfully"

    # Test other endpoints based on role
    if ($authResponse.user.role -eq "system_admin") {
        $stats = Invoke-RestMethod -Uri "$BaseUrl/auth/sessions/stats" -Method GET -Headers $headers
        Write-Host "✓ Session stats retrieved (admin only)"
    }

    Write-Host "`n=========================================="
    Write-Host "Authentication test completed successfully!"
    Write-Host "Token valid until: $($authResponse.expiresAt)"
    Write-Host "=========================================="

} catch {
    Write-Host "`n❌ Authentication failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Details: $($errorDetails.error.message)" -ForegroundColor Red
    }
}
```

---

## Frontend Authentication

### 1. Access Frontend
```
http://localhost:3000/auth/login
http://localhost:3000/auth/register
```

### 2. Login Process

#### Using Default Users
1. Navigate to `http://localhost:3000/auth/login`
2. Enter credentials:
   - **User ID**: `admin`
   - **Password**: `Healthcare@2024!`
3. Click "Sign In"
4. System will:
   - Generate mock PQC keys if not exists
   - Create mock signature
   - Authenticate with middleware
   - Store encrypted keys in localStorage
   - Redirect to dashboard

#### Login Flow Details
```javascript
// Frontend login process
1. User enters credentials
2. Check if user has stored keys in localStorage
3. If no keys: Generate mock PQC keys
4. Create authentication signature (mock)
5. Send to middleware API
6. Receive JWT token
7. Store token and redirect
```

### 3. Registration Process

#### Step-by-Step Registration
1. Navigate to `http://localhost:3000/auth/register`
2. Select user role (Patient, Doctor, etc.)
3. Fill registration form:
   - Basic info (name, email, phone)
   - Professional info (if applicable)
   - Security (password)
4. Submit registration
5. System will:
   - Generate mock PQC key pairs
   - Encrypt and store keys locally
   - Send registration to middleware
   - Show success/pending approval message

#### Registration Form Fields by Role

**Patient Registration:**
- User ID, Name, Email, Phone
- Date of Birth, Address
- Emergency Contact
- Password

**Doctor Registration:**
- User ID, Name, Email, Phone
- License Number, Specialization
- Institution, Credentials
- Experience, Password

**Other Roles:**
- Similar professional fields
- Institution/organization details
- Credentials and experience

---

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/nonce`
Generate authentication nonce
```json
Request:
{
  "userId": "admin"
}

Response:
{
  "nonce": "abc123...",
  "expiresAt": "2024-01-01T12:00:00Z",
  "expiresIn": 300
}
```

#### POST `/api/auth/authenticate`
Authenticate user with signature
```json
Request:
{
  "userId": "admin",
  "nonce": "abc123...",
  "signature": "simulated_signature_..."
}

Response:
{
  "token": "jwt_token_here",
  "expiresAt": "2024-01-01T12:00:00Z",
  "user": {
    "userId": "admin",
    "role": "system_admin"
  }
}
```

#### POST `/api/auth/register`
Register new user
```json
Request:
{
  "userId": "newuser123",
  "role": "patient",
  "publicKeys": {
    "kyberPublicKey": "mock_kyber_key",
    "dilithiumPublicKey": "mock_dilithium_key"
  },
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}

Response:
{
  "message": "User registered successfully",
  "userId": "newuser123",
  "status": "pending_approval",
  "transactionId": "tx_123"
}
```

#### GET `/api/auth/profile`
Get user profile (requires authentication)
```json
Headers:
Authorization: Bearer jwt_token_here

Response:
{
  "user": {
    "userId": "admin",
    "role": "system_admin",
    "personalInfo": {...}
  },
  "session": {
    "issuedAt": "2024-01-01T10:00:00Z",
    "expiresAt": "2024-01-01T22:00:00Z"
  }
}
```

#### POST `/api/auth/refresh`
Refresh JWT token
```json
Headers:
Authorization: Bearer current_jwt_token

Response:
{
  "token": "new_jwt_token",
  "expiresAt": "2024-01-01T22:00:00Z"
}
```

#### POST `/api/auth/logout`
Logout user
```json
Headers:
Authorization: Bearer jwt_token_here

Response:
{
  "message": "Logged out successfully"
}
```

---

## Complete Workflows

### Workflow 1: New User Registration & Login

#### Terminal Version
```powershell
# 1. Register new user
$newUser = "patient_$(Get-Random)"
$regBody = @{
    userId = $newUser
    role = "patient"
    publicKeys = @{
        kyberPublicKey = "mock_kyber_$(Get-Random)"
        dilithiumPublicKey = "mock_dilithium_$(Get-Random)"
    }
} | ConvertTo-Json -Depth 3

$regResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method POST -ContentType "application/json" -Body $regBody

# 2. Login with new user (will fail - needs approval)
# 3. Login with admin to approve (if approval system implemented)
# 4. Login with new user (should work after approval)
```

#### Frontend Version
1. Go to `/auth/register`
2. Select "Patient" role
3. Fill form and submit
4. See "Registration submitted" message
5. Go to `/auth/login`
6. Try to login (may fail if approval required)

### Workflow 2: Admin Operations

```powershell
# Login as admin
.\complete-auth-test.ps1 -UserId "admin"

# Get session statistics
$headers = @{ "Authorization" = "Bearer $token" }
$stats = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/sessions/stats" -Headers $headers
```

### Workflow 3: Multi-Role Testing

```powershell
# Test all default users
$users = @("admin", "doctor1", "patient1")
foreach ($user in $users) {
    Write-Host "Testing user: $user"
    .\complete-auth-test.ps1 -UserId $user
}
```

---

## Testing Scenarios

### Scenario 1: Basic Authentication Flow
```powershell
# Test the complete authentication flow
.\test-auth.ps1
```

### Scenario 2: Token Expiration
```powershell
# Get token
$token = "your_jwt_token"

# Wait for expiration (tokens expire in 24 hours by default)
# Or test with expired token
$headers = @{ "Authorization" = "Bearer expired_token" }
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/auth/profile" -Headers $headers
} catch {
    Write-Host "Expected: Token expired error"
}
```

### Scenario 3: Invalid Credentials
```powershell
# Test with invalid user
try {
    $nonceResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/nonce" -Method POST -ContentType "application/json" -Body '{"userId": "nonexistent"}'
    # This will work (nonce generation doesn't validate user existence)
    
    # But authentication will fail
    $authBody = @{
        userId = "nonexistent"
        nonce = $nonceResponse.nonce
        signature = "invalid_signature"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:3001/api/auth/authenticate" -Method POST -ContentType "application/json" -Body $authBody
} catch {
    Write-Host "Expected: Authentication failed"
}
```

### Scenario 4: Role-Based Access
```powershell
# Login as patient
$patientToken = "patient_jwt_token"
$headers = @{ "Authorization" = "Bearer $patientToken" }

# Try to access admin endpoint (should fail)
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/auth/sessions/stats" -Headers $headers
} catch {
    Write-Host "Expected: Insufficient permissions"
}
```

---

## Error Handling

### Common Errors and Solutions

#### 1. "Nonce expired"
```
Error: NONCE_EXPIRED
Solution: Generate new nonce (nonces expire in 5 minutes)
```

#### 2. "User not found"
```
Error: User not found
Solution: Use valid user ID (admin, doctor1, patient1) or register new user
```

#### 3. "Invalid signature"
```
Error: Invalid signature
Solution: Ensure signature is at least 10 characters (mock validation)
```

#### 4. "Blockchain unavailable"
```
Error: BLOCKCHAIN_UNAVAILABLE
Solution: This is expected in mock mode for some operations
```

#### 5. "Token expired"
```
Error: Token expired
Solution: Refresh token or login again
```

---

## Mock Implementation Details

### What's Simulated
- **Key Generation**: Base64 encoded strings with timestamps
- **Signatures**: String concatenation with base64 encoding
- **Signature Verification**: Simple length and format checks
- **Blockchain Storage**: In-memory JavaScript objects
- **User Database**: Hardcoded user objects

### What's Real
- **HTTP API**: Real REST endpoints
- **JWT Tokens**: Real JWT implementation
- **Password Hashing**: Real bcrypt (for frontend)
- **AES Encryption**: Real AES-GCM for localStorage
- **Session Management**: Real session tracking

### Security Notes
- Private keys stored encrypted in localStorage (frontend)
- JWT tokens have real expiration
- Rate limiting implemented
- Input validation on all endpoints
- CORS configured properly

---

## Next Steps

### For Development
1. Use existing mock system for all development
2. Test all user roles and workflows
3. Implement business logic on top of auth system
4. Add more sophisticated approval workflows

### For Production
1. Replace mock PQC with real libraries (liboqs)
2. Implement real Hyperledger Fabric network
3. Add proper key management system
4. Implement hardware security modules (HSM)
5. Add multi-factor authentication
6. Implement proper audit logging

---

## Quick Reference

### Start Services
```bash
# Terminal 1: Start middleware
cd middleware
npm start

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Test Authentication
```powershell
# Quick test
.\test-auth.ps1

# Detailed test
.\complete-auth-test.ps1 -UserId "admin"
```

### Access URLs
- Frontend: http://localhost:3000
- API: http://localhost:3001/api
- Health: http://localhost:3001/health

### Default Credentials
- Admin: `admin` / `Healthcare@2024!`
- Doctor: `doctor1` / `Doctor@2024!`
- Patient: `patient1` / `Patient@2024!`

---

*This guide covers the complete authentication system using mock implementations. All operations are fully functional for development and testing purposes.*