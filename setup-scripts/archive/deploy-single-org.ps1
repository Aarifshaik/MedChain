# Simple Single Organization Chaincode Deployment
# Deploy chaincode using only Hospital organization

param(
    [string]$ChannelName = "healthcare-channel",
    [string]$ChaincodeName = "healthcare-chaincode",
    [string]$ChaincodeVersion = "1.0",
    [int]$ChaincodeSequence = 1
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

Write-Host "Healthcare DLT Single-Org Chaincode Deployment" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Step 1: Package (already done, but let's ensure it exists)
Write-Status "Checking if chaincode package exists..." "Info"
$packageExists = docker exec fabric-network-cli-1 test -f healthcare-chaincode.tar.gz 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Status "Creating chaincode package..." "Info"
    $packageResult = docker exec fabric-network-cli-1 bash -c "peer lifecycle chaincode package healthcare-chaincode.tar.gz --path ./chaincode --lang node --label healthcare-chaincode_1.0" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Packaging failed: $packageResult" "Error"
        exit 1
    }
}
Write-Status "Chaincode package ready" "Success"

# Step 2: Install on Hospital peer (already done, but let's ensure)
Write-Status "Installing chaincode on Hospital peer..." "Info"
$installResult = docker exec fabric-network-cli-1 peer lifecycle chaincode install healthcare-chaincode.tar.gz 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Status "Chaincode installed successfully" "Success"
} else {
    Write-Status "Install result: $installResult" "Warning"
}

# Step 3: Get Package ID
Write-Status "Getting package ID..." "Info"
$queryResult = docker exec fabric-network-cli-1 peer lifecycle chaincode queryinstalled 2>&1
$packageId = ($queryResult | Select-String "healthcare-chaincode_1.0:([a-f0-9]+)" | ForEach-Object { $_.Matches[0].Groups[0].Value })
if ($packageId) {
    Write-Status "Package ID: $packageId" "Success"
} else {
    Write-Status "Could not find package ID" "Error"
    exit 1
}

# Step 4: Approve for Hospital organization only
Write-Status "Approving chaincode for Hospital organization..." "Info"
$approveCmd = "peer lifecycle chaincode approveformyorg -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID $ChannelName --name $ChaincodeName --version $ChaincodeVersion --package-id $packageId --sequence $ChaincodeSequence"

$approveResult = docker exec fabric-network-cli-1 bash -c $approveCmd 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Status "Approved for Hospital organization" "Success"
} else {
    Write-Status "Approval failed: $approveResult" "Error"
    exit 1
}

# Step 5: Check commit readiness
Write-Status "Checking commit readiness..." "Info"
$readinessCmd = "peer lifecycle chaincode checkcommitreadiness --channelID $ChannelName --name $ChaincodeName --version $ChaincodeVersion --sequence $ChaincodeSequence --output json"
$readinessResult = docker exec fabric-network-cli-1 bash -c $readinessCmd 2>&1
Write-Status "Commit readiness: $readinessResult" "Info"

# Step 6: Commit chaincode (single org)
Write-Status "Committing chaincode definition..." "Info"
$commitCmd = "peer lifecycle chaincode commit -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID $ChannelName --name $ChaincodeName --version $ChaincodeVersion --sequence $ChaincodeSequence --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt"

$commitResult = docker exec fabric-network-cli-1 bash -c $commitCmd 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Status "Chaincode committed successfully" "Success"
} else {
    Write-Status "Commit failed: $commitResult" "Error"
    exit 1
}

# Step 7: Initialize chaincode
Write-Status "Initializing chaincode (creating admin user)..." "Info"
$initCmd = "peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c '{\"function\":\"UserContract:initLedger\",\"Args\":[]}'"

$initResult = docker exec fabric-network-cli-1 bash -c $initCmd 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Status "Chaincode initialized successfully" "Success"
} else {
    Write-Status "Initialization failed: $initResult" "Error"
    exit 1
}

# Step 8: Test admin user
Write-Status "Testing admin user..." "Info"
$queryCmd = "peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"UserContract:getUser\",\"Args\":[\"admin\"]}'"
$queryResult = docker exec fabric-network-cli-1 bash -c $queryCmd 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 CHAINCODE DEPLOYMENT SUCCESSFUL! 🎉" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Smart contracts deployed to blockchain" -ForegroundColor Green
    Write-Host "✅ Admin user created in blockchain" -ForegroundColor Green
    Write-Host "✅ Ready for real blockchain authentication" -ForegroundColor Green
    Write-Host ""
    Write-Host "Admin user data from blockchain:" -ForegroundColor Cyan
    Write-Host $queryResult -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Test login: .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken" -ForegroundColor White
    Write-Host "2. Register users: .\blockchain-auth.ps1 -Action register -UserId <user> -Role <role>" -ForegroundColor White
    Write-Host "3. Approve users: .\blockchain-auth.ps1 -Action admin-approve -ApproveUserId <user>" -ForegroundColor White
    Write-Host ""
} else {
    Write-Status "Admin user test failed: $queryResult" "Error"
    exit 1
}