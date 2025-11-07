# Deploy Chaincode to All Organizations - FIXED VERSION
# Hospital, Lab, and Insurer

param(
    [string]$ChannelName = "healthcare-channel",
    [string]$ChaincodeName = "healthcare-chaincode",
    [string]$ChaincodeVersion = "1.3",
    [int]$ChaincodeSequence = 2
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

Write-Host "Healthcare DLT Multi-Organization Chaincode Deployment - FIXED" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

# First, let's check what's currently deployed
Write-Status "Checking current chaincode status..." "Info"
$currentStatus = docker exec fabric-network-cli-1 peer lifecycle chaincode querycommitted --channelID $ChannelName 2>&1
Write-Host "Current status: $currentStatus"

# Step 1: Package chaincode
Write-Status "Packaging chaincode version $ChaincodeVersion..." "Info"
$packageResult = docker exec fabric-network-cli-1 peer lifecycle chaincode package ${ChaincodeName}-v${ChaincodeVersion}.tar.gz --path ./chaincode --lang node --label ${ChaincodeName}_${ChaincodeVersion} 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Status "Packaging failed: $packageResult" "Error"
    exit 1
}
Write-Status "Chaincode packaged successfully" "Success"

# Step 2: Install on all peers
$orgs = @(
    @{ Name = "Hospital"; MSP = "HospitalMSP"; Address = "peer0.hospital.healthcare.com:7051" },
    @{ Name = "Lab"; MSP = "LabMSP"; Address = "peer0.lab.healthcare.com:8051" },
    @{ Name = "Insurer"; MSP = "InsurerMSP"; Address = "peer0.insurer.healthcare.com:9051" }
)

foreach ($org in $orgs) {
    Write-Status "Installing chaincode on $($org.Name) peer..." "Info"
    
    # Fixed: Use proper Linux paths and single command
    $installResult = docker exec fabric-network-cli-1 bash -c "
        export CORE_PEER_LOCALMSPID=$($org.MSP)
        export CORE_PEER_ADDRESS=$($org.Address)
        export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/$($org.Name.ToLower()).healthcare.com/users/Admin@$($org.Name.ToLower()).healthcare.com/msp
        export CORE_PEER_TLS_ENABLED=true
        export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/$($org.Name.ToLower()).healthcare.com/peers/peer0.$($org.Name.ToLower()).healthcare.com/tls/ca.crt
        peer lifecycle chaincode install ${ChaincodeName}-v${ChaincodeVersion}.tar.gz
    " 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Installed successfully on $($org.Name)" "Success"
    } else {
        Write-Status "Installation on $($org.Name): $installResult" "Warning"
    }
}

# Step 3: Get package ID
Write-Status "Getting package ID..." "Info"
$queryResult = docker exec fabric-network-cli-1 peer lifecycle chaincode queryinstalled 2>&1
$packageId = ($queryResult | Select-String "${ChaincodeName}_${ChaincodeVersion}:([a-f0-9]+)" | ForEach-Object { $_.Matches[0].Groups[0].Value })
if ($packageId) {
    Write-Status "Package ID: $packageId" "Success"
} else {
    Write-Status "Could not find package ID" "Error"
    Write-Host "Query result: $queryResult"
    exit 1
}

# Step 4: Approve from all organizations
foreach ($org in $orgs) {
    Write-Status "Approving chaincode for $($org.Name)..." "Info"
    
    # Fixed: Use proper Linux paths and single command
    $approveResult = docker exec fabric-network-cli-1 bash -c "
        export CORE_PEER_LOCALMSPID=$($org.MSP)
        export CORE_PEER_ADDRESS=$($org.Address)
        export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/$($org.Name.ToLower()).healthcare.com/users/Admin@$($org.Name.ToLower()).healthcare.com/msp
        export CORE_PEER_TLS_ENABLED=true
        export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/$($org.Name.ToLower()).healthcare.com/peers/peer0.$($org.Name.ToLower()).healthcare.com/tls/ca.crt
        peer lifecycle chaincode approveformyorg -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID $ChannelName --name $ChaincodeName --version $ChaincodeVersion --package-id $packageId --sequence $ChaincodeSequence
    " 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Approved successfully for $($org.Name)" "Success"
    } else {
        Write-Status "Approval for $($org.Name): $approveResult" "Warning"
    }
}

# Step 5: Check commit readiness
Write-Status "Checking commit readiness..." "Info"
$readinessResult = docker exec fabric-network-cli-1 peer lifecycle chaincode checkcommitreadiness --channelID $ChannelName --name $ChaincodeName --version $ChaincodeVersion --sequence $ChaincodeSequence --output json 2>&1
Write-Status "Commit readiness: $readinessResult" "Info"

# Step 6: Commit chaincode
Write-Status "Committing chaincode with all organizations..." "Info"
$commitResult = docker exec fabric-network-cli-1 bash -c "
    peer lifecycle chaincode commit -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID $ChannelName --name $ChaincodeName --version $ChaincodeVersion --sequence $ChaincodeSequence --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt --peerAddresses peer0.lab.healthcare.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/lab.healthcare.com/peers/peer0.lab.healthcare.com/tls/ca.crt --peerAddresses peer0.insurer.healthcare.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurer.healthcare.com/peers/peer0.insurer.healthcare.com/tls/ca.crt
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "Chaincode committed successfully" "Success"
} else {
    Write-Status "Commit failed: $commitResult" "Error"
    exit 1
}

# Step 7: Create admin user manually
Write-Status "Creating admin user in blockchain..." "Info"
$createResult = docker exec fabric-network-cli-1 bash -c "
    peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c '{\"function\":\"UserContract:createAdminUser\",\"Args\":[]}'
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "Admin user created successfully!" "Success"
} else {
    Write-Status "Admin creation failed: $createResult" "Error"
    exit 1
}

# Step 8: Test admin user
Write-Status "Testing admin user query..." "Info"
$queryResult = docker exec fabric-network-cli-1 bash -c "
    peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"UserContract:getUser\",\"Args\":[\"admin\"]}'
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 SUCCESS! REAL BLOCKCHAIN ADMIN USER CREATED! 🎉" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Chaincode deployed to all organizations (Hospital, Lab, Insurer)" -ForegroundColor Green
    Write-Host "✅ Admin user created in blockchain" -ForegroundColor Green
    Write-Host "✅ All three organizations participating" -ForegroundColor Green
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
    exit 1
}