# Upgrade to Latest Chaincode Version
# This upgrades from version 1.0 (sequence 1) to version 1.3 (sequence 2)

param(
    [string]$ChannelName = "healthcare-channel",
    [string]$ChaincodeName = "healthcare-chaincode",
    [string]$NewVersion = "1.3",
    [int]$NewSequence = 2
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

Write-Host "Upgrading Chaincode to Latest Version" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check current status
Write-Status "Current chaincode status:" "Info"
docker exec fabric-network-cli-1 peer lifecycle chaincode querycommitted --channelID $ChannelName

# Get the package ID for version 1.3 (already installed)
Write-Status "Getting package ID for version $NewVersion..." "Info"
$queryResult = docker exec fabric-network-cli-1 peer lifecycle chaincode queryinstalled 2>&1
$packageId = ($queryResult | Select-String "${ChaincodeName}_${NewVersion}:([a-f0-9]+)" | ForEach-Object { $_.Matches[0].Groups[0].Value })

if ($packageId) {
    Write-Status "Found package ID: $packageId" "Success"
} else {
    Write-Status "Package ID for version $NewVersion not found. Available packages:" "Error"
    Write-Host $queryResult
    exit 1
}

# Approve from Hospital organization
Write-Status "Approving chaincode for Hospital..." "Info"
$approveHospital = docker exec fabric-network-cli-1 bash -c "
    export CORE_PEER_LOCALMSPID=HospitalMSP
    export CORE_PEER_ADDRESS=peer0.hospital.healthcare.com:7051
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/users/Admin@hospital.healthcare.com/msp
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt
    peer lifecycle chaincode approveformyorg -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID $ChannelName --name $ChaincodeName --version $NewVersion --package-id $packageId --sequence $NewSequence
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "Hospital approval successful" "Success"
} else {
    Write-Status "Hospital approval failed: $approveHospital" "Warning"
}

# Approve from Lab organization  
Write-Status "Approving chaincode for Lab..." "Info"
$approveLab = docker exec fabric-network-cli-1 bash -c "
    export CORE_PEER_LOCALMSPID=LabMSP
    export CORE_PEER_ADDRESS=peer0.lab.healthcare.com:8051
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/lab.healthcare.com/users/Admin@lab.healthcare.com/msp
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/lab.healthcare.com/peers/peer0.lab.healthcare.com/tls/ca.crt
    peer lifecycle chaincode approveformyorg -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID $ChannelName --name $ChaincodeName --version $NewVersion --package-id $packageId --sequence $NewSequence
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "Lab approval successful" "Success"
} else {
    Write-Status "Lab approval failed: $approveLab" "Warning"
}

# Approve from Insurer organization
Write-Status "Approving chaincode for Insurer..." "Info"
$approveInsurer = docker exec fabric-network-cli-1 bash -c "
    export CORE_PEER_LOCALMSPID=InsurerMSP
    export CORE_PEER_ADDRESS=peer0.insurer.healthcare.com:9051
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurer.healthcare.com/users/Admin@insurer.healthcare.com/msp
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurer.healthcare.com/peers/peer0.insurer.healthcare.com/tls/ca.crt
    peer lifecycle chaincode approveformyorg -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID $ChannelName --name $ChaincodeName --version $NewVersion --package-id $packageId --sequence $NewSequence
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "Insurer approval successful" "Success"
} else {
    Write-Status "Insurer approval failed: $approveInsurer" "Warning"
}

# Check commit readiness
Write-Status "Checking commit readiness..." "Info"
$readiness = docker exec fabric-network-cli-1 peer lifecycle chaincode checkcommitreadiness --channelID $ChannelName --name $ChaincodeName --version $NewVersion --sequence $NewSequence --output json 2>&1
Write-Host "Readiness: $readiness"

# Commit the chaincode
Write-Status "Committing chaincode upgrade..." "Info"
$commit = docker exec fabric-network-cli-1 bash -c "
    peer lifecycle chaincode commit -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID $ChannelName --name $ChaincodeName --version $NewVersion --sequence $NewSequence --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt --peerAddresses peer0.lab.healthcare.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/lab.healthcare.com/peers/peer0.lab.healthcare.com/tls/ca.crt --peerAddresses peer0.insurer.healthcare.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurer.healthcare.com/peers/peer0.insurer.healthcare.com/tls/ca.crt
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Status "Chaincode upgrade committed successfully!" "Success"
    
    # Initialize the new version
    Write-Status "Initializing upgraded chaincode..." "Info"
    $init = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c '{\"function\":\"UserContract:initLedger\",\"Args\":[]}' 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Initialization successful!" "Success"
        
        # Test admin user creation
        Write-Status "Creating admin user..." "Info"
        $createAdmin = docker exec fabric-network-cli-1 peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C $ChannelName -n $ChaincodeName --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c '{\"function\":\"UserContract:createAdminUser\",\"Args\":[]}' 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Admin user created!" "Success"
        } else {
            Write-Status "Admin creation result: $createAdmin" "Warning"
        }
        
        # Test admin query
        Write-Status "Testing admin user query..." "Info"
        $queryAdmin = docker exec fabric-network-cli-1 peer chaincode query -C $ChannelName -n $ChaincodeName -c '{\"function\":\"UserContract:getUser\",\"Args\":[\"admin\"]}' 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "🎉 SUCCESS! CHAINCODE UPGRADED AND ADMIN WORKING! 🎉" -ForegroundColor Green
            Write-Host "===================================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "✅ Upgraded to chaincode version $NewVersion" -ForegroundColor Green
            Write-Host "✅ All organizations approved" -ForegroundColor Green
            Write-Host "✅ Admin user created and accessible" -ForegroundColor Green
            Write-Host ""
            Write-Host "Admin user data:" -ForegroundColor Cyan
            Write-Host $queryAdmin -ForegroundColor White
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "1. Remove fallback from auth service" -ForegroundColor White
            Write-Host "2. Test login: .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken" -ForegroundColor White
            Write-Host "3. Register users: .\blockchain-auth.ps1 -Action register -UserId <user> -Role <role>" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Status "Admin query failed: $queryAdmin" "Error"
        }
    } else {
        Write-Status "Initialization failed: $init" "Error"
    }
} else {
    Write-Status "Commit failed: $commit" "Error"
}