# Healthcare DLT Blockchain Initialization Script
# Initializes the blockchain network and creates the admin user

param(
    [switch]$Force,
    [switch]$VerboseOutput
)

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

function Test-DockerContainers {
    try {
        $containers = docker ps --filter "name=healthcare" --format "{{.Names}}" 2>$null
        if ($containers) {
            Write-Status "Found running Healthcare DLT containers:" "Success"
            $containers | ForEach-Object { Write-Status "  - $_" "Info" }
            return $true
        } else {
            Write-Status "No Healthcare DLT containers found" "Warning"
            return $false
        }
    } catch {
        Write-Status "Docker not available or not running" "Error"
        return $false
    }
}

function Initialize-Chaincode {
    try {
        Write-Status "Initializing chaincode contracts..." "Info"
        
        # Navigate to fabric-network directory
        Push-Location "fabric-network"
        
        try {
            # Check if chaincode is already deployed
            $chaincodeCheck = docker exec fabric-network-cli-1 peer lifecycle chaincode querycommitted --channelID healthcare-channel --name healthcare-chaincode 2>$null
            
            if ($chaincodeCheck -and -not $Force) {
                Write-Status "Chaincode already deployed. Use -Force to redeploy." "Warning"
                return $true
            }
            
            # Deploy chaincode if not already deployed or if Force is specified
            if (-not $chaincodeCheck -or $Force) {
                Write-Status "Deploying chaincode..." "Info"
                
                # Package chaincode
                & ".\scripts\deploy-chaincode.ps1" -Mode package
                if ($LASTEXITCODE -ne 0) {
                    throw "Chaincode packaging failed"
                }
                
                # Install chaincode
                & ".\scripts\deploy-chaincode.ps1" -Mode install
                if ($LASTEXITCODE -ne 0) {
                    throw "Chaincode installation failed"
                }
                
                # Approve and commit chaincode
                & ".\scripts\deploy-chaincode.ps1" -Mode approve
                if ($LASTEXITCODE -ne 0) {
                    throw "Chaincode approval failed"
                }
                
                & ".\scripts\deploy-chaincode.ps1" -Mode commit
                if ($LASTEXITCODE -ne 0) {
                    throw "Chaincode commit failed"
                }
                
                Write-Status "Chaincode deployed successfully" "Success"
            }
            
            # Initialize the ledger (this will create the admin user)
            Write-Status "Initializing ledger with admin user..." "Info"
            
            $initResult = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C healthcare-channel -n healthcare-chaincode -c '{"function":"UserContract:initLedger","Args":[]}' 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Status "Ledger initialized successfully" "Success"
                Write-Status "Admin user created in blockchain" "Success"
                return $true
            } else {
                Write-Status "Ledger initialization failed: $initResult" "Error"
                return $false
            }
            
        } finally {
            Pop-Location
        }
        
    } catch {
        Write-Status "Chaincode initialization failed: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Test-AdminUser {
    try {
        Write-Status "Testing admin user in blockchain..." "Info"
        
        Push-Location "fabric-network"
        
        try {
            $queryResult = docker exec fabric-network-cli-1 peer chaincode query -C healthcare-channel -n healthcare-chaincode -c '{"function":"UserContract:getUser","Args":["admin"]}' 2>&1
            
            if ($LASTEXITCODE -eq 0 -and $queryResult -notlike "*Error*") {
                $adminData = $queryResult | ConvertFrom-Json
                Write-Status "Admin user found in blockchain:" "Success"
                Write-Status "  User ID: $($adminData.userId)" "Info"
                Write-Status "  Role: $($adminData.role)" "Info"
                Write-Status "  Status: $($adminData.registrationStatus)" "Info"
                Write-Status "  Created: $($adminData.createdAt)" "Info"
                return $true
            } else {
                Write-Status "Admin user not found or query failed: $queryResult" "Error"
                return $false
            }
            
        } finally {
            Pop-Location
        }
        
    } catch {
        Write-Status "Admin user test failed: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Test-MiddlewareConnection {
    try {
        Write-Status "Testing middleware connection to blockchain..." "Info"
        
        $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 10
        
        if ($health.services.blockchain.status -eq "healthy") {
            Write-Status "Middleware connected to blockchain successfully" "Success"
            return $true
        } else {
            Write-Status "Middleware blockchain connection status: $($health.services.blockchain.status)" "Warning"
            Write-Status "Details: $($health.services.blockchain.details.message)" "Info"
            return $false
        }
        
    } catch {
        Write-Status "Middleware connection test failed: $($_.Exception.Message)" "Warning"
        Write-Status "Make sure the middleware server is running" "Info"
        return $false
    }
}

# Main Script Logic
Write-Host "Healthcare DLT Blockchain Initialization" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check if Docker containers are running
if (-not (Test-DockerContainers)) {
    Write-Status "Please start the Healthcare DLT network first:" "Error"
    Write-Status "  cd fabric-network" "Info"
    Write-Status "  docker-compose up -d" "Info"
    exit 1
}

# Initialize chaincode and create admin user
if (Initialize-Chaincode) {
    Write-Status "Blockchain initialization completed successfully" "Success"
    
    # Wait a moment for the transaction to be committed
    Start-Sleep -Seconds 3
    
    # Test admin user
    if (Test-AdminUser) {
        Write-Status "Admin user verification successful" "Success"
        
        # Test middleware connection
        Test-MiddlewareConnection | Out-Null
        
        Write-Host ""
        Write-Host "BLOCKCHAIN INITIALIZATION COMPLETE!" -ForegroundColor Green
        Write-Host "===================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Admin user created successfully in blockchain:" -ForegroundColor Yellow
        Write-Host "  User ID: admin" -ForegroundColor White
        Write-Host "  Role: system_admin" -ForegroundColor White
        Write-Host "  Status: approved" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Start the middleware server (if not already running)" -ForegroundColor White
        Write-Host "2. Login as admin: .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken" -ForegroundColor White
        Write-Host "3. Register new users: .\blockchain-auth.ps1 -Action register -UserId <user> -Role <role>" -ForegroundColor White
        Write-Host "4. Approve registrations: .\blockchain-auth.ps1 -Action admin-approve -ApproveUserId <user>" -ForegroundColor White
        Write-Host ""
        
    } else {
        Write-Status "Admin user verification failed" "Error"
        exit 1
    }
    
} else {
    Write-Status "Blockchain initialization failed" "Error"
    exit 1
}