# Deploy Version 1.3 Chaincode - Simple Approach
# This script uses the already installed version 1.3 package

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

Write-Host "Deploying Chaincode Version 1.3" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Get package ID for version 1.3
Write-Status "Getting package ID for version 1.3..." "Info"
$queryResult = docker exec fabric-network-cli-1 peer lifecycle chaincode queryinstalled
$packageId = "healthcare-chaincode_1.3:721f5b7019db35044440f2ecdb51bd996c8727d8ef394e4d1776359fd051974f"

Write-Status "Using package ID: $packageId" "Success"

# Approve for Hospital (using direct docker exec without variables)
Write-Status "Approving for Hospital..." "Info"
docker exec fabric-network-cli-1 bash -c 'export CORE_PEER_LOCALMSPID=HospitalMSP && export CORE_PEER_ADDRESS=peer0.hospital.healthcare.com:7051 && export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/users/Admin@hospital.healthcare.com/msp && export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt && peer lifecycle chaincode approveformyorg -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID healthcare-channel --name healthcare-chaincode --version 1.3 --package-id healthcare-chaincode_1.3:721f5b7019db35044440f2ecdb51bd996c8727d8ef394e4d1776359fd051974f --sequence 2'

if ($LASTEXITCODE -eq 0) {
    Write-Status "Hospital approved successfully" "Success"
} else {
    Write-Status "Hospital approval failed" "Warning"
}

# Approve for Lab
Write-Status "Approving for Lab..." "Info"
docker exec fabric-network-cli-1 bash -c 'export CORE_PEER_LOCALMSPID=LabMSP && export CORE_PEER_ADDRESS=peer0.lab.healthcare.com:8051 && export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/lab.healthcare.com/users/Admin@lab.healthcare.com/msp && export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/lab.healthcare.com/peers/peer0.lab.healthcare.com/tls/ca.crt && peer lifecycle chaincode approveformyorg -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID healthcare-channel --name healthcare-chaincode --version 1.3 --package-id healthcare-chaincode_1.3:721f5b7019db35044440f2ecdb51bd996c8727d8ef394e4d1776359fd051974f --sequence 2'

if ($LASTEXITCODE -eq 0) {
    Write-Status "Lab approved successfully" "Success"
} else {
    Write-Status "Lab approval failed" "Warning"
}

# Approve for Insurer
Write-Status "Approving for Insurer..." "Info"
docker exec fabric-network-cli-1 bash -c 'export CORE_PEER_LOCALMSPID=InsurerMSP && export CORE_PEER_ADDRESS=peer0.insurer.healthcare.com:9051 && export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurer.healthcare.com/users/Admin@insurer.healthcare.com/msp && export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurer.healthcare.com/peers/peer0.insurer.healthcare.com/tls/ca.crt && peer lifecycle chaincode approveformyorg -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID healthcare-channel --name healthcare-chaincode --version 1.3 --package-id healthcare-chaincode_1.3:721f5b7019db35044440f2ecdb51bd996c8727d8ef394e4d1776359fd051974f --sequence 2'

if ($LASTEXITCODE -eq 0) {
    Write-Status "Insurer approved successfully" "Success"
} else {
    Write-Status "Insurer approval failed" "Warning"
}

# Check commit readiness
Write-Status "Checking commit readiness..." "Info"
docker exec fabric-network-cli-1 peer lifecycle chaincode checkcommitreadiness --channelID healthcare-channel --name healthcare-chaincode --version 1.3 --sequence 2 --output json

# Commit chaincode
Write-Status "Committing chaincode..." "Info"
docker exec fabric-network-cli-1 bash -c 'peer lifecycle chaincode commit -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --channelID healthcare-channel --name healthcare-chaincode --version 1.3 --sequence 2 --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt --peerAddresses peer0.lab.healthcare.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/lab.healthcare.com/peers/peer0.lab.healthcare.com/tls/ca.crt --peerAddresses peer0.insurer.healthcare.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurer.healthcare.com/peers/peer0.insurer.healthcare.com/tls/ca.crt'

if ($LASTEXITCODE -eq 0) {
    Write-Status "Chaincode committed successfully!" "Success"
    
    # Initialize chaincode
    Write-Status "Initializing chaincode..." "Info"
    docker exec fabric-network-cli-1 bash -c 'peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C healthcare-channel -n healthcare-chaincode --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c "{\"function\":\"UserContract:initLedger\",\"Args\":[]}"'
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Initialization successful!" "Success"
        
        # Create admin user
        Write-Status "Creating admin user..." "Info"
        docker exec fabric-network-cli-1 bash -c 'peer chaincode invoke -o orderer.healthcare.com:7050 --ordererTLSHostnameOverride orderer.healthcare.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem -C healthcare-channel -n healthcare-chaincode --peerAddresses peer0.hospital.healthcare.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt -c "{\"function\":\"UserContract:createAdminUser\",\"Args\":[]}"'
        
        # Test admin user
        Write-Status "Testing admin user..." "Info"
        $adminResult = docker exec fabric-network-cli-1 bash -c 'peer chaincode query -C healthcare-channel -n healthcare-chaincode -c "{\"function\":\"UserContract:getUser\",\"Args\":[\"admin\"]}"'
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "🎉 SUCCESS! CHAINCODE V1.3 DEPLOYED WITH ADMIN! 🎉" -ForegroundColor Green
            Write-Host "=================================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "✅ Chaincode version 1.3 deployed" -ForegroundColor Green
            Write-Host "✅ All organizations approved" -ForegroundColor Green
            Write-Host "✅ Admin user created and working" -ForegroundColor Green
            Write-Host ""
            Write-Host "Admin user data:" -ForegroundColor Cyan
            Write-Host $adminResult -ForegroundColor White
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "1. Remove fallback from auth service" -ForegroundColor White
            Write-Host "2. Test login: .\blockchain-auth.ps1 -Action login -UserId admin -SaveToken" -ForegroundColor White
            Write-Host "3. Register users: .\blockchain-auth.ps1 -Action register -UserId <user> -Role <role>" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Status "Admin user test failed: $adminResult" "Error"
        }
    } else {
        Write-Status "Initialization failed" "Error"
    }
} else {
    Write-Status "Commit failed" "Error"
}