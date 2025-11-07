# Diagnose Blockchain State Database Issues
# This script helps identify and fix state database consistency problems

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

Write-Host "Blockchain State Database Diagnostic" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Step 1: Check chaincode status
Write-Status "Checking chaincode deployment status..." "Info"
$chaincodeStatus = docker exec fabric-network-cli-1 peer lifecycle chaincode querycommitted --channelID $ChannelName 2>&1
Write-Host $chaincodeStatus

# Step 2: Test user registration with immediate query
Write-Status "Testing user registration and immediate query..." "Info"
$testUserId = "diagtest$(Get-Random -Maximum 9999)"

# Register user
Write-Status "Registering test user: $testUserId" "Info"
$registerResult = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c "{\"function\":\"UserContract:registerUser\",\"Args\":[\"$testUserId\",\"patient\",\"test_kyber\",\"test_dilithium\",\"test@example.com\",\"hospital\",\"test_signature\"]}" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "Registration successful!" "Success"
    Write-Host "Result: $registerResult"
    
    # Wait for state propagation
    Write-Status "Waiting for state propagation (5 seconds)..." "Info"
    Start-Sleep -Seconds 5
    
    # Try to query the user
    Write-Status "Querying registered user..." "Info"
    $queryResult = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c "{\"function\":\"UserContract:getUser\",\"Args\":[\"$testUserId\"]}" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Query successful!" "Success"
        Write-Host "User data: $queryResult"
    } else {
        Write-Status "Query failed: $queryResult" "Error"
        
        # Try alternative query methods
        Write-Status "Trying alternative query approaches..." "Info"
        
        # Method 1: Query without contract prefix
        $altQuery1 = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c "{\"function\":\"getUser\",\"Args\":[\"$testUserId\"]}" 2>&1
        Write-Status "Alternative query 1 result: $altQuery1" "Warning"
        
        # Method 2: Try to query all users
        $allUsers = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c "{\"function\":\"UserContract:queryByRange\",\"Args\":[\"user:\",\"user:~\"]}" 2>&1
        Write-Status "All users query result: $allUsers" "Warning"
    }
} else {
    Write-Status "Registration failed: $registerResult" "Error"
}

# Step 3: Check state database directly
Write-Status "Checking state database containers..." "Info"
$couchdbContainers = docker ps --filter "name=couchdb" --format "table {{.Names}}\t{{.Status}}"
if ($couchdbContainers) {
    Write-Host "CouchDB containers:"
    Write-Host $couchdbContainers
} else {
    Write-Status "No CouchDB containers found - using default LevelDB" "Warning"
}

# Step 4: Test admin user creation and query
Write-Status "Testing admin user creation..." "Info"
$adminCreate = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c "{\"function\":\"UserContract:createAdminUser\",\"Args\":[]}" 2>&1

Write-Status "Admin creation result: $adminCreate" "Info"

# Wait and query admin
Start-Sleep -Seconds 3
$adminQuery = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c "{\"function\":\"UserContract:getUser\",\"Args\":[\"admin\"]}" 2>&1
Write-Status "Admin query result: $adminQuery" "Info"

# Step 5: Recommendations
Write-Host ""
Write-Host "DIAGNOSIS SUMMARY" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

if ($queryResult -and $LASTEXITCODE -eq 0) {
    Write-Status "✅ State database is working correctly" "Success"
    Write-Status "✅ User registration and queries are functional" "Success"
} else {
    Write-Status "❌ State database consistency issue detected" "Error"
    Write-Host ""
    Write-Host "POSSIBLE CAUSES:" -ForegroundColor Yellow
    Write-Host "1. State database synchronization delay"
    Write-Host "2. Transaction not properly committed"
    Write-Host "3. Query function name mismatch"
    Write-Host "4. State database corruption"
    Write-Host ""
    Write-Host "RECOMMENDED FIXES:" -ForegroundColor Yellow
    Write-Host "1. Add delay between registration and query"
    Write-Host "2. Implement retry logic in blockchain service"
    Write-Host "3. Check chaincode function names"
    Write-Host "4. Restart blockchain network if needed"
}

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. If queries fail, run: .\fix-blockchain-state.ps1"
Write-Host "2. Test with middleware: cd ../../middleware && npm run test"
Write-Host "3. Check logs: docker logs fabric-network-peer0-hospital-1"