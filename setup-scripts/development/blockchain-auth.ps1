# Healthcare DLT Blockchain Authentication System
# Real blockchain-based user registration and authentication

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("login", "register", "profile", "logout", "refresh", "admin-approve", "admin-stats", "list-pending", "help")]
    [string]$Action,
    
    [string]$UserId,
    [string]$Password,
    [string]$Role,
    [string]$FirstName,
    [string]$LastName,
    [string]$Email,
    [string]$Phone,
    [string]$LicenseNumber,
    [string]$Institution,
    [string]$Specialization,
    [string]$OrganizationId,
    [string]$ApproveUserId,
    [string]$Token,
    [string]$BaseUrl = "http://localhost:3001/api",
    [switch]$SaveToken,
    [switch]$VerboseOutput
)

# Global variables
$script:TokenFile = "blockchain-auth-token.txt"
$script:UserFile = "current-blockchain-user.json"

# Helper Functions
function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = switch ($Type) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        default { "White" }
    }
    Write-Host "[$Type] $Message" -ForegroundColor $color
}

function Save-AuthData {
    param([string]$Token, [object]$User)
    if ($SaveToken) {
        $Token | Out-File -FilePath $script:TokenFile -Encoding UTF8
        $User | ConvertTo-Json | Out-File -FilePath $script:UserFile -Encoding UTF8
        Write-Status "Authentication data saved to files" "Success"
    }
}

function Load-Token {
    if ($Token) {
        return $Token
    }
    if (Test-Path $script:TokenFile) {
        return Get-Content $script:TokenFile -Raw
    }
    return $null
}

function Get-AuthHeaders {
    param([string]$AuthToken)
    return @{
        "Authorization" = "Bearer $AuthToken"
        "Content-Type" = "application/json"
    }
}

function Test-Connection {
    try {
        $health = Invoke-RestMethod -Uri "$BaseUrl/../health" -Method GET -TimeoutSec 5
        Write-Status "Connected to Healthcare DLT API" "Success"
        Write-Status "Blockchain Status: $($health.services.blockchain.status)" "Info"
        return $true
    } catch {
        Write-Status "Cannot connect to API at $BaseUrl" "Error"
        Write-Status "Make sure the middleware server is running" "Warning"
        return $false
    }
}

function Generate-MockPQCKeys {
    param([string]$UserId)
    
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $randomSeed = Get-Random -Maximum 999999
    
    return @{
        kyberPublicKey = "kyber_key_${UserId}_${timestamp}_${randomSeed}"
        dilithiumPublicKey = "dilithium_key_${UserId}_${timestamp}_${randomSeed}"
    }
}

function Generate-MockSignature {
    param([string]$Data, [string]$UserId)
    
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $message = "${Data}:${UserId}:${timestamp}"
    return "blockchain_signature_" + [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($message))
}

function Show-Help {
    Write-Host @"
Healthcare DLT Blockchain Authentication System

USAGE:
    .\blockchain-auth.ps1 -Action <action> [parameters]

ACTIONS:
    login           - Login with blockchain user credentials
    register        - Register new user on blockchain
    profile         - Get user profile from blockchain
    logout          - Logout current user
    refresh         - Refresh authentication token
    admin-approve   - Approve pending user registration (admin only)
    admin-stats     - Get session statistics (admin only)
    list-pending    - List pending registrations (admin only)
    help            - Show this help

LOGIN:
    .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken

REGISTER:
    # Patient Registration
    .\blockchain-auth.ps1 -Action register -UserId "patient123" -Role "patient" -FirstName "John" -LastName "Doe" -Email "john@example.com" -Phone "+1-555-0123"
    
    # Doctor Registration  
    .\blockchain-auth.ps1 -Action register -UserId "doctor123" -Role "doctor" -FirstName "Jane" -LastName "Smith" -Email "jane@hospital.com" -LicenseNumber "MD123456" -Institution "City Hospital" -Specialization "Cardiology"

ADMIN OPERATIONS:
    .\blockchain-auth.ps1 -Action admin-approve -ApproveUserId "patient123"
    .\blockchain-auth.ps1 -Action admin-stats
    .\blockchain-auth.ps1 -Action list-pending

PARAMETERS:
    -UserId         User identifier
    -Role           User role (patient, doctor, laboratory, insurer, auditor, system_admin)
    -FirstName      First name
    -LastName       Last name
    -Email          Email address
    -Phone          Phone number
    -LicenseNumber  Professional license number
    -Institution    Institution/organization name
    -Specialization Medical specialization
    -OrganizationId Organization identifier
    -ApproveUserId  User ID to approve (admin operations)
    -Token          JWT token (if not using saved token)
    -SaveToken      Save token to file for future use
    -VerboseOutput  Show detailed output
    -BaseUrl        API base URL (default: http://localhost:3001/api)

EXAMPLES:
    # Login with admin (pre-created in blockchain)
    .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken
    
    # Register new patient
    .\blockchain-auth.ps1 -Action register -UserId "john_doe" -Role "patient" -FirstName "John" -LastName "Doe" -Email "john@example.com"
    
    # Approve patient registration (as admin)
    .\blockchain-auth.ps1 -Action admin-approve -ApproveUserId "john_doe"
    
    # Get profile from blockchain
    .\blockchain-auth.ps1 -Action profile

DEFAULT ADMIN:
    UserId: admin
    Status: Pre-created in blockchain during initialization
    Role: system_admin

"@
}

# Main Functions
function Invoke-Login {
    if (-not $UserId) {
        Write-Status "UserId is required for login" "Error"
        return
    }

    try {
        Write-Status "Logging in user: $UserId" "Info"
        
        # Step 1: Get nonce
        if ($VerboseOutput) { Write-Status "Getting authentication nonce..." "Info" }
        $nonceBody = @{ userId = $UserId } | ConvertTo-Json
        $nonceResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/nonce" -Method POST -ContentType "application/json" -Body $nonceBody
        
        if ($VerboseOutput) { Write-Status "Nonce received: $($nonceResponse.nonce.Substring(0,8))..." "Info" }

        # Step 2: Create signature for blockchain authentication
        if ($VerboseOutput) { Write-Status "Creating blockchain authentication signature..." "Info" }
        $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        $message = "${UserId}:$($nonceResponse.nonce):${timestamp}"
        $signature = Generate-MockSignature -Data $message -UserId $UserId

        # Step 3: Authenticate with blockchain
        if ($VerboseOutput) { Write-Status "Authenticating with blockchain..." "Info" }
        $authBody = @{
            userId = $UserId
            nonce = $nonceResponse.nonce
            signature = $signature
        } | ConvertTo-Json
        
        $authResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/authenticate" -Method POST -ContentType "application/json" -Body $authBody
        
        Write-Status "Login successful!" "Success"
        Write-Status "User: $($authResponse.user.userId)" "Info"
        Write-Status "Role: $($authResponse.user.role)" "Info"
        Write-Status "Token expires: $($authResponse.expiresAt)" "Info"
        
        # Save authentication data
        Save-AuthData -Token $authResponse.token -User $authResponse.user
        
        if ($VerboseOutput) {
            Write-Status "JWT Token: $($authResponse.token.Substring(0,50))..." "Info"
        }

    } catch {
        Write-Status "Login failed: $($_.Exception.Message)" "Error"
        if ($_.ErrorDetails) {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Status "Details: $($errorDetails.error.message)" "Error"
            
            if ($errorDetails.error.code -eq "AUTHENTICATION_FAILED") {
                Write-Status "User may not exist in blockchain or registration not approved" "Warning"
            }
        }
    }
}

function Invoke-Register {
    if (-not $UserId -or -not $Role) {
        Write-Status "UserId and Role are required for registration" "Error"
        return
    }

    try {
        Write-Status "Registering new user on blockchain: $UserId" "Info"
        Write-Status "Role: $Role" "Info"

        # Generate PQC keys for the user
        $publicKeys = Generate-MockPQCKeys -UserId $UserId
        
        if ($VerboseOutput) {
            Write-Status "Generated Kyber Key: $($publicKeys.kyberPublicKey.Substring(0,30))..." "Info"
            Write-Status "Generated Dilithium Key: $($publicKeys.dilithiumPublicKey.Substring(0,30))..." "Info"
        }

        # Create registration signature
        $registrationData = "${UserId}${Role}$($publicKeys.kyberPublicKey)$($publicKeys.dilithiumPublicKey)"
        $signature = Generate-MockSignature -Data $registrationData -UserId $UserId

        # Build registration payload
        $regData = @{
            userId = $UserId
            role = $Role
            publicKeys = $publicKeys
            signature = $signature
        }

        # Add email if provided
        if ($Email) {
            $regData.email = $Email
        }

        # Add organization ID if provided
        if ($OrganizationId) {
            $regData.organizationId = $OrganizationId
        }

        $regBody = $regData | ConvertTo-Json -Depth 4
        
        if ($VerboseOutput) {
            Write-Status "Registration payload:" "Info"
            Write-Host $regBody
        }

        $regResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method POST -ContentType "application/json" -Body $regBody
        
        Write-Status "Registration successful!" "Success"
        Write-Status "User ID: $($regResponse.userId)" "Info"
        Write-Status "Status: $($regResponse.status)" "Info"
        
        if ($regResponse.transactionId) {
            Write-Status "Blockchain Transaction ID: $($regResponse.transactionId)" "Info"
        }

        # Show next steps based on role
        if ($Role -eq "patient") {
            Write-Status "Next: A doctor or admin will review and approve your registration" "Warning"
        } else {
            Write-Status "Next: A system administrator will review your credentials" "Warning"
        }

        Write-Status "Use 'list-pending' action to check approval status" "Info"

    } catch {
        Write-Status "Registration failed: $($_.Exception.Message)" "Error"
        if ($_.ErrorDetails) {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Status "Details: $($errorDetails.error.message)" "Error"
        }
    }
}

function Invoke-GetProfile {
    $authToken = Load-Token
    if (-not $authToken) {
        Write-Status "No authentication token found. Please login first." "Error"
        return
    }

    try {
        Write-Status "Retrieving user profile from blockchain..." "Info"
        
        $headers = Get-AuthHeaders -AuthToken $authToken
        $profile = Invoke-RestMethod -Uri "$BaseUrl/auth/profile" -Method GET -Headers $headers
        
        Write-Status "Profile retrieved successfully!" "Success"
        Write-Host ""
        Write-Host "BLOCKCHAIN USER PROFILE:" -ForegroundColor Cyan
        Write-Host "========================" -ForegroundColor Cyan
        Write-Host "User ID: $($profile.user.userId)"
        Write-Host "Role: $($profile.user.role)"
        Write-Host "Registration Status: $($profile.user.registrationStatus)"
        Write-Host "Data Source: $($profile.dataSource)"
        
        if ($profile.user.email) {
            Write-Host "Email: $($profile.user.email)"
        }
        
        if ($profile.user.organizationId) {
            Write-Host "Organization: $($profile.user.organizationId)"
        }
        
        if ($profile.user.createdAt) {
            Write-Host "Created: $($profile.user.createdAt)"
        }
        
        if ($profile.user.approvedAt) {
            Write-Host "Approved: $($profile.user.approvedAt)"
            Write-Host "Approved By: $($profile.user.approvedBy)"
        }
        
        Write-Host ""
        Write-Host "Session Information:" -ForegroundColor Green
        Write-Host "  Issued At: $($profile.session.issuedAt)"
        Write-Host "  Expires At: $($profile.session.expiresAt)"

    } catch {
        Write-Status "Failed to retrieve profile: $($_.Exception.Message)" "Error"
        if ($_.ErrorDetails) {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Status "Details: $($errorDetails.error.message)" "Error"
        }
    }
}

function Invoke-AdminApprove {
    if (-not $ApproveUserId) {
        Write-Status "ApproveUserId is required for approval" "Error"
        return
    }

    $authToken = Load-Token
    if (-not $authToken) {
        Write-Status "No authentication token found. Please login as admin first." "Error"
        return
    }

    try {
        Write-Status "Approving user registration: $ApproveUserId" "Info"
        
        # Create approval signature
        $approvalData = "approve:${ApproveUserId}"
        $signature = Generate-MockSignature -Data $approvalData -UserId "admin"
        
        $approvalBody = @{
            userId = $ApproveUserId
            adminSignature = $signature
        } | ConvertTo-Json
        
        $headers = Get-AuthHeaders -AuthToken $authToken
        $headers["Content-Type"] = "application/json"
        
        # Note: This endpoint needs to be implemented in the middleware
        $response = Invoke-RestMethod -Uri "$BaseUrl/admin/approve-user" -Method POST -Headers $headers -Body $approvalBody
        
        Write-Status "User approved successfully!" "Success"
        Write-Status "Approved User: $($response.userId)" "Info"
        Write-Status "Transaction ID: $($response.transactionId)" "Info"

    } catch {
        Write-Status "Approval failed: $($_.Exception.Message)" "Error"
        if ($_.ErrorDetails) {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Status "Details: $($errorDetails.error.message)" "Error"
        }
    }
}

function Invoke-ListPending {
    $authToken = Load-Token
    if (-not $authToken) {
        Write-Status "No authentication token found. Please login as admin first." "Error"
        return
    }

    try {
        Write-Status "Retrieving pending registrations from blockchain..." "Info"
        
        $headers = Get-AuthHeaders -AuthToken $authToken
        
        # Note: This endpoint needs to be implemented in the middleware
        $response = Invoke-RestMethod -Uri "$BaseUrl/admin/pending-registrations" -Method GET -Headers $headers
        
        if ($response.users -and $response.users.Count -gt 0) {
            Write-Status "Pending registrations found: $($response.users.Count)" "Success"
            Write-Host ""
            Write-Host "PENDING REGISTRATIONS:" -ForegroundColor Yellow
            Write-Host "=====================" -ForegroundColor Yellow
            
            foreach ($user in $response.users) {
                Write-Host ""
                Write-Host "User ID: $($user.userId)" -ForegroundColor Green
                Write-Host "  Role: $($user.role)"
                Write-Host "  Email: $($user.email)"
                Write-Host "  Organization: $($user.organizationId)"
                Write-Host "  Created: $($user.createdAt)"
                Write-Host "  Approve: .\blockchain-auth.ps1 -Action admin-approve -ApproveUserId $($user.userId)"
            }
        } else {
            Write-Status "No pending registrations found" "Info"
        }

    } catch {
        Write-Status "Failed to retrieve pending registrations: $($_.Exception.Message)" "Error"
        if ($_.ErrorDetails) {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Status "Details: $($errorDetails.error.message)" "Error"
        }
    }
}

function Invoke-Logout {
    $authToken = Load-Token
    if (-not $authToken) {
        Write-Status "No active session found" "Warning"
        return
    }

    try {
        Write-Status "Logging out..." "Info"
        
        $headers = Get-AuthHeaders -AuthToken $authToken
        $response = Invoke-RestMethod -Uri "$BaseUrl/auth/logout" -Method POST -Headers $headers
        
        # Clean up local files
        if (Test-Path $script:TokenFile) { Remove-Item $script:TokenFile }
        if (Test-Path $script:UserFile) { Remove-Item $script:UserFile }
        
        Write-Status "Logout successful!" "Success"
        Write-Status $response.message "Info"

    } catch {
        Write-Status "Logout failed: $($_.Exception.Message)" "Error"
        # Clean up files anyway
        if (Test-Path $script:TokenFile) { Remove-Item $script:TokenFile }
        if (Test-Path $script:UserFile) { Remove-Item $script:UserFile }
    }
}

function Get-AdminStats {
    $authToken = Load-Token
    if (-not $authToken) {
        Write-Status "No authentication token found. Please login as admin first." "Error"
        return
    }

    try {
        Write-Status "Retrieving session statistics..." "Info"
        
        $headers = Get-AuthHeaders -AuthToken $authToken
        $stats = Invoke-RestMethod -Uri "$BaseUrl/auth/sessions/stats" -Method GET -Headers $headers
        
        Write-Status "Statistics retrieved successfully!" "Success"
        Write-Host ""
        Write-Host "BLOCKCHAIN SESSION STATISTICS:" -ForegroundColor Cyan
        Write-Host "==============================" -ForegroundColor Cyan
        Write-Host "Total Active Sessions: $($stats.stats.totalActiveSessions)"
        Write-Host "Expired Sessions Cleared: $($stats.stats.expiredSessionsCleared)"
        Write-Host "Average Session Age: $([math]::Round($stats.stats.averageSessionAge, 2)) minutes"
        
        Write-Host ""
        Write-Host "Role Distribution:" -ForegroundColor Yellow
        $stats.stats.roleDistribution.PSObject.Properties | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Value)"
        }
        
        Write-Host ""
        Write-Host "Timestamp: $($stats.timestamp)"

    } catch {
        Write-Status "Failed to retrieve statistics: $($_.Exception.Message)" "Error"
        if ($_.ErrorDetails) {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Status "Details: $($errorDetails.error.message)" "Error"
        }
    }
}

# Main Script Logic
Write-Host "Healthcare DLT Blockchain Authentication System" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Test connection first
if (-not (Test-Connection)) {
    exit 1
}

# Execute requested action
switch ($Action.ToLower()) {
    "login" { Invoke-Login }
    "register" { Invoke-Register }
    "profile" { Invoke-GetProfile }
    "logout" { Invoke-Logout }
    "admin-approve" { Invoke-AdminApprove }
    "admin-stats" { Get-AdminStats }
    "list-pending" { Invoke-ListPending }
    "help" { Show-Help }
    default { 
        Write-Status "Unknown action: $Action" "Error"
        Show-Help
    }
}