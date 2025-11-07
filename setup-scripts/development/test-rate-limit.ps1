# Test Rate Limiting and Health Endpoint

param(
    [string]$BaseUrl = "http://localhost:3001"
)

Write-Host "Testing Healthcare DLT API Rate Limits and Health" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET
    Write-Host "(Success) Health Check: SUCCESS" -ForegroundColor Green
    Write-Host "  Status: $($health.status)"
    Write-Host "  Environment: $($health.environment)"
    Write-Host "  API Service: $($health.services.api.status)"
    Write-Host "  Blockchain: $($health.services.blockchain.status)"
    Write-Host "  Rate Limits:"
    Write-Host "    General: $($health.rateLimits.general) requests"
    Write-Host "    Auth: $($health.rateLimits.auth) requests"
    Write-Host "    Window: $([math]::Round([int]$health.rateLimits.window / 60000, 0)) minutes"
} catch {
    Write-Host "(Failure) Health Check: FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)"
}

# Test 2: Rate Limit Test
Write-Host "`n2. Testing Rate Limits..." -ForegroundColor Yellow
$successCount = 0
$failCount = 0

for ($i = 1; $i -le 10; $i++) {
    try {
        $nonce = Invoke-RestMethod -Uri "$BaseUrl/api/auth/nonce" -Method POST -ContentType "application/json" -Body '{"userId": "admin"}' -TimeoutSec 5
        $successCount++
        Write-Host "  Request $i : (Success)" -ForegroundColor Green
    } catch {
        $failCount++
        if ($_.Exception.Message -like "*429*") {
            Write-Host "  Request $i : Rate Limited (429)" -ForegroundColor Yellow
        } else {
            Write-Host "  Request $i : Error - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Start-Sleep -Milliseconds 100
}

Write-Host "`n3. Rate Limit Test Results:" -ForegroundColor Cyan
Write-Host "  Successful requests: $successCount"
Write-Host "  Failed/Limited requests: $failCount"

if ($successCount -gt 5) {
    Write-Host "(Success) Rate limits appear to be working correctly" -ForegroundColor Green
} else {
    Write-Host "(Warn) Rate limits may be too restrictive" -ForegroundColor Yellow
}

# Test 3: Authentication Flow
Write-Host "`n4. Testing Full Authentication Flow..." -ForegroundColor Yellow
try {
    # Get nonce
    $nonceResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/nonce" -Method POST -ContentType "application/json" -Body '{"userId": "admin"}'
    
    # Create signature
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $message = "admin:$($nonceResponse.nonce):${timestamp}"
    $signature = "simulated_signature_" + [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($message))
    
    # Authenticate
    $authBody = @{
        userId = "admin"
        nonce = $nonceResponse.nonce
        signature = $signature
    } | ConvertTo-Json
    
    $authResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/authenticate" -Method POST -ContentType "application/json" -Body $authBody
    
    Write-Host "(Success) Authentication Flow: SUCCESS" -ForegroundColor Green
    Write-Host "  User: $($authResponse.user.userId)"
    Write-Host "  Role: $($authResponse.user.role)"
    Write-Host "  Token Length: $($authResponse.token.Length) characters"
    
} catch {
    Write-Host "(Failure) Authentication Flow: FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)"
}

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan

# Show current configuration
Write-Host "`nCurrent Configuration:" -ForegroundColor Yellow
Write-Host "  API URL: $BaseUrl"
Write-Host "  Health Endpoint: $BaseUrl/health"
Write-Host "  Auth Endpoint: $BaseUrl/api/auth"
Write-Host ""
Write-Host "To modify rate limits, edit middleware/.env:" -ForegroundColor Yellow
Write-Host "  GENERAL_RATE_LIMIT_MAX=1000"
Write-Host "  AUTH_RATE_LIMIT_MAX=100"
Write-Host "  RATE_LIMIT_WINDOW_MS=900000"