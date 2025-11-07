# Healthcare DLT Blockchain Authentication Test Script

Write-Host "=========================================="
Write-Host "Healthcare DLT Blockchain Authentication Test"
Write-Host "=========================================="

$baseUrl = "http://localhost:3001/api"

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..."
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/../health" -Method GET
    Write-Host "Health Check: $($health.status)" -ForegroundColor Green
    Write-Host "Blockchain Status: $($health.services.blockchain.status)" -ForegroundColor $(if($health.services.blockchain.status -eq "healthy") {"Green"} else {"Yellow"})
} catch {
    Write-Host "Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Admin Login
Write-Host "`n2. Testing Admin Login..."
try {
    # Get nonce
    $nonceResponse = Invoke-RestMethod -Uri "$baseUrl/auth/nonce" -Method POST -ContentType "application/json" -Body '{"userId": "admin"}'
    Write-Host "Nonce Generated: $($nonceResponse.nonce.Substring(0,8))..." -ForegroundColor Green
    
    # Create signature
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $message = "admin:$($nonceResponse.nonce):${timestamp}"
    $signature = "blockchain_signature_" + [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($message))
    
    # Authenticate
    $authBody = @{
        userId = "admin"
        nonce = $nonceResponse.nonce
        signature = $signature
    } | ConvertTo-Json
    
    $authResponse = Invoke-RestMethod -Uri "$baseUrl/auth/authenticate" -Method POST -ContentType "application/json" -Body $authBody
    Write-Host "Admin Authentication: SUCCESS" -ForegroundColor Green
    Write-Host "Admin Role: $($authResponse.user.role)" -ForegroundColor Green
    $adminToken = $authResponse.token
    
} catch {
    Write-Host "Admin Authentication Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Details: $($errorDetails.error.message)" -ForegroundColor Red
    }
    exit 1
}

# Test 3: Admin Profile
Write-Host "`n3. Testing Admin Profile Retrieval..."
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $profile = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method GET -Headers $headers
    Write-Host "Profile Retrieved: SUCCESS" -ForegroundColor Green
    Write-Host "User ID: $($profile.user.userId)" -ForegroundColor Green
    Write-Host "Role: $($profile.user.role)" -ForegroundColor Green
    Write-Host "Data Source: $($profile.dataSource)" -ForegroundColor Green
    
} catch {
    Write-Host "Profile Retrieval Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: User Registration
Write-Host "`n4. Testing User Registration..."
try {
    $testUserId = "testuser_$(Get-Random -Maximum 1000)"
    $publicKeys = @{
        kyberPublicKey = "kyber_key_${testUserId}_$(Get-Random)"
        dilithiumPublicKey = "dilithium_key_${testUserId}_$(Get-Random)"
    }
    
    $registrationData = "${testUserId}patient$($publicKeys.kyberPublicKey)$($publicKeys.dilithiumPublicKey)"
    $signature = "blockchain_signature_" + [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($registrationData))
    
    $regBody = @{
        userId = $testUserId
        role = "patient"
        publicKeys = $publicKeys
        email = "${testUserId}@test.com"
        signature = $signature
    } | ConvertTo-Json -Depth 3
    
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $regBody
    Write-Host "User Registration: SUCCESS" -ForegroundColor Green
    Write-Host "User ID: $($regResponse.userId)" -ForegroundColor Green
    Write-Host "Status: $($regResponse.status)" -ForegroundColor Green
    Write-Host "Transaction ID: $($regResponse.transactionId)" -ForegroundColor Green
    
} catch {
    Write-Host "User Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Details: $($errorDetails.error.message)" -ForegroundColor Red
    }
}

# Test 5: List Pending Registrations
Write-Host "`n5. Testing Pending Registrations List..."
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $pending = Invoke-RestMethod -Uri "$baseUrl/admin/pending-registrations" -Method GET -Headers $headers
    Write-Host "Pending Registrations Query: SUCCESS" -ForegroundColor Green
    Write-Host "Pending Count: $($pending.count)" -ForegroundColor Green
    
    if ($pending.count -gt 0) {
        Write-Host "Sample Pending User: $($pending.users[0].userId)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Pending Registrations Query Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Details: $($errorDetails.error.message)" -ForegroundColor Red
    }
}

Write-Host "`n=========================================="
Write-Host "Blockchain Authentication Test Complete"
Write-Host "=========================================="
Write-Host ""
Write-Host "Usage Examples:" -ForegroundColor Cyan
Write-Host "Login:    .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken"
Write-Host "Register: .\blockchain-auth.ps1 -Action register -UserId john_doe -Role patient -Email john@test.com"
Write-Host "Approve:  .\blockchain-auth.ps1 -Action admin-approve -ApproveUserId john_doe"
Write-Host "Profile:  .\blockchain-auth.ps1 -Action profile"
Write-Host ""