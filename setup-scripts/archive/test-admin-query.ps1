# Test Different Ways to Query Admin User
# Try various function calls to find the admin user

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

Write-Host "Testing Different Ways to Query Admin User" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Try 1: getUser with admin
Write-Status "Trying getUser with admin..." "Info"
$result1 = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"getUser\",\"Args\":[\"admin\"]}' 2>&1
Write-Host "Result 1: $result1"

# Try 2: UserContract:getUser with admin
Write-Status "Trying UserContract:getUser with admin..." "Info"
$result2 = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"UserContract:getUser\",\"Args\":[\"admin\"]}' 2>&1
Write-Host "Result 2: $result2"

# Try 3: Check contract info
Write-Status "Trying to get contract info..." "Info"
$result3 = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"getData\",\"Args\":[\"contract:user:info\"]}' 2>&1
Write-Host "Result 3: $result3"

# Try 4: Check if we can query the user key directly
Write-Status "Trying to get user data directly..." "Info"
$result4 = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"getData\",\"Args\":[\"user:admin\"]}' 2>&1
Write-Host "Result 4: $result4"

# Try 5: List all keys with user prefix
Write-Status "Trying to list all user keys..." "Info"
$result5 = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"queryByRange\",\"Args\":[\"user:\",\"user:~\"]}' 2>&1
Write-Host "Result 5: $result5"

# Try 6: Call createAdminUser manually now that initLedger worked
Write-Status "Trying createAdminUser manually..." "Info"
$result6 = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c '{\"function\":\"createAdminUser\",\"Args\":[]}' 2>&1
Write-Host "Result 6: $result6"

# Try 7: Query admin again after manual creation
Write-Status "Trying getUser again after manual creation..." "Info"
$result7 = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"getUser\",\"Args\":[\"admin\"]}' 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 ADMIN USER FOUND! 🎉" -ForegroundColor Green
    Write-Host "=====================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Admin user data:" -ForegroundColor Cyan
    Write-Host $result7 -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Remove fallback from auth service" -ForegroundColor White
    Write-Host "2. Test login: .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken" -ForegroundColor White
    Write-Host "3. Register users: .\blockchain-auth.ps1 -Action register -UserId <user> -Role <role>" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Result 7: $result7"
    Write-Status "Admin user still not accessible through getUser function" "Error"
}