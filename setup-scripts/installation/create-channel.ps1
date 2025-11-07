# Simple channel creation using orderer admin API
param(
    [string]$ChannelName = "healthcare-channel"
)

Write-Host "=========================================="
Write-Host "Creating Healthcare Channel: $ChannelName (Simple Method)"
Write-Host "=========================================="

# Set environment variable for configtx
$env:FABRIC_CFG_PATH = "$(Get-Location)\configtx"

# Generate channel configuration transaction
Write-Host "Generating channel configuration transaction..."
configtxgen -profile HealthcareChannel -outputCreateChannelTx "channel-artifacts\$ChannelName.tx" -channelID $ChannelName

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to generate channel configuration transaction"
    exit 1
}

# Copy the channel transaction to CLI container
docker cp "channel-artifacts\$ChannelName.tx" fabric-network-cli-1:/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/

# Wait for network to be ready
Write-Host "Waiting for network to be ready..."
Start-Sleep -Seconds 5

# Create channel using orderer admin API (simpler method)
Write-Host "Creating channel using orderer admin API..."
docker exec fabric-network-cli-1 osnadmin channel join --channelID $ChannelName --config-block /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/$ChannelName.tx -o orderer.healthcare.com:7053 --ca-file /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem --client-cert /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/tls/server.crt --client-key /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/tls/server.key

if ($LASTEXITCODE -ne 0) {
    Write-Host "Admin API method failed, trying traditional method..."
    
    # Try traditional method with proper certificate paths
    Write-Host "Creating channel using traditional method..."
    docker exec fabric-network-cli-1 peer channel create -o orderer.healthcare.com:7050 -c $ChannelName -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/$ChannelName.tx --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/$ChannelName.block --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create channel with both methods"
        exit 1
    }
} else {
    # If admin API worked, we need to get the genesis block
    docker exec fabric-network-cli-1 peer channel fetch 0 /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/$ChannelName.block -o orderer.healthcare.com:7050 -c $ChannelName --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem
}

# Join Hospital peer
Write-Host "Joining Hospital peer to channel..."
docker exec fabric-network-cli-1 peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/$ChannelName.block

# Join Lab peer
Write-Host "Joining Lab peer to channel..."
docker exec -e CORE_PEER_LOCALMSPID=LabMSP -e CORE_PEER_ADDRESS=peer0.lab.healthcare.com:8051 -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/lab.healthcare.com/users/Admin@lab.healthcare.com/msp -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/lab.healthcare.com/peers/peer0.lab.healthcare.com/tls/ca.crt fabric-network-cli-1 peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/$ChannelName.block

# Join Insurer peer
Write-Host "Joining Insurer peer to channel..."
docker exec -e CORE_PEER_LOCALMSPID=InsurerMSP -e CORE_PEER_ADDRESS=peer0.insurer.healthcare.com:9051 -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurer.healthcare.com/users/Admin@insurer.healthcare.com/msp -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurer.healthcare.com/peers/peer0.insurer.healthcare.com/tls/ca.crt fabric-network-cli-1 peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/$ChannelName.block

Write-Host "✓ Channel created and all peers joined successfully!"
Write-Host ""
Write-Host "Verifying channel creation..."
docker exec fabric-network-cli-1 peer channel list

Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Deploy chaincode: .\scripts\deploy-chaincode.ps1 -Mode deploy"
Write-Host "2. Test the middleware connection"
Write-Host ""