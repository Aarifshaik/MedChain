# Test Existing Chaincode and Create Admin
# This script works with the already deployed chaincode version 1.0

param(
    [string]$ChannelName = "healthcare-channel",
    [string]$ChaincodeName = "healthcare-chaincode"
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

Write-Host "Testing Existing Chaincode and Creating Admin" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check current status
Write-Status "Checking current chaincode status..." "Info"
$currentStatus = docker exec fabric-network-cli-1 peer lifecycle chaincode querycommitted --channelID $ChannelName 2>&1
Write-Host "Current status: $currentStatus"

# Test if chaincode is working by trying to create admin
Write-Status "Attempting to create admin user in existing chaincode..." "Info"
$createResult = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c '{\"function\":\"UserContract:createAdminUser\",\"Args\":[]}' 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "Admin user creation successful!" "Success"
    
    # Test admin user query
    Write-Status "Testing admin user query..." "Info"
    $queryResult = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"UserContract:getUser\",\"Args\":[\"admin\"]}' 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 SUCCESS! ADMIN USER WORKING IN EXISTING CHAINCODE! 🎉" -ForegroundColor Green
        Write-Host "=======================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ Using existing chaincode version 1.0" -ForegroundColor Green
        Write-Host "✅ Admin user created successfully" -ForegroundColor Green
        Write-Host "✅ Admin user query working" -ForegroundColor Green
        Write-Host ""
        Write-Host "Admin user data from blockchain:" -ForegroundColor Cyan
        Write-Host $queryResult -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Remove fallback from auth service" -ForegroundColor White
        Write-Host "2. Test login: .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken" -ForegroundColor White
        Write-Host "3. Register users: .\blockchain-auth.ps1 -Action register -UserId <user> -Role <role>" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Status "Admin user query failed: $queryResult" "Error"
    }
} else {
    Write-Status "Admin creation failed: $createResult" "Error"
    
    # Try to query if admin already exists
    Write-Status "Checking if admin already exists..." "Info"
    $existingQuery = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"UserContract:getUser\",\"Args\":[\"admin\"]}' 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 ADMIN ALREADY EXISTS! 🎉" -ForegroundColor Green
        Write-Host "===========================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Admin user data from blockchain:" -ForegroundColor Cyan
        Write-Host $existingQuery -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Remove fallback from auth service" -ForegroundColor White
        Write-Host "2. Test login: .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken" -ForegroundColor White
        Write-Host "3. Register users: .\blockchain-auth.ps1 -Action register -UserId <user> -Role <role>" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Status "Admin does not exist and creation failed: $existingQuery" "Error"
    }
}