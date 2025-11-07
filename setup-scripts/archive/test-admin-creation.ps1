# Test Admin Creation with Different Function Calls
# Try various ways to call the admin creation function

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

Write-Host "Testing Admin Creation with Different Function Calls" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Try 1: createAdminUser without contract prefix
Write-Status "Trying createAdminUser without contract prefix..." "Info"
$result1 = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c '{\"function\":\"createAdminUser\",\"Args\":[]}' 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "SUCCESS with createAdminUser!" "Success"
    Write-Host $result1
} else {
    Write-Status "Failed: $result1" "Warning"
}

# Try 2: initLedger function
Write-Status "Trying initLedger function..." "Info"
$result2 = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c '{\"function\":\"initLedger\",\"Args\":[]}' 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "SUCCESS with initLedger!" "Success"
    Write-Host $result2
} else {
    Write-Status "Failed: $result2" "Warning"
}

# Try 3: UserContract:initLedger
Write-Status "Trying UserContract:initLedger..." "Info"
$result3 = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c '{\"function\":\"UserContract:initLedger\",\"Args\":[]}' 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "SUCCESS with UserContract:initLedger!" "Success"
    Write-Host $result3
} else {
    Write-Status "Failed: $result3" "Warning"
}

# Now test if admin exists
Write-Status "Testing if admin user exists now..." "Info"
$queryResult = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"getUser\",\"Args\":[\"admin\"]}' 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 ADMIN USER FOUND! 🎉" -ForegroundColor Green
    Write-Host "=====================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Admin user data:" -ForegroundColor Cyan
    Write-Host $queryResult -ForegroundColor White
    Write-Host ""
} else {
    Write-Status "Admin still not found: $queryResult" "Error"
    
    # Try with UserContract prefix
    Write-Status "Trying getUser with UserContract prefix..." "Info"
    $queryResult2 = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"UserContract:getUser\",\"Args\":[\"admin\"]}' 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 ADMIN USER FOUND WITH PREFIX! 🎉" -ForegroundColor Green
        Write-Host "==================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Admin user data:" -ForegroundColor Cyan
        Write-Host $queryResult2 -ForegroundColor White
        Write-Host ""
    } else {
        Write-Status "Still not found with prefix: $queryResult2" "Error"
    }
}