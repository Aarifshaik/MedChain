# Generate certificates for Healthcare DLT Network
# This script generates all required certificates and genesis block

Write-Host "=========================================="
Write-Host "Healthcare DLT Certificate Generation"
Write-Host "=========================================="

# Check if cryptogen is available
try {
    cryptogen version | Out-Null
    Write-Host "✓ cryptogen is available"
} catch {
    Write-Error "cryptogen not found. Please install Hyperledger Fabric binaries first."
    Write-Host "Run: .\install-fabric.ps1"
    exit 1
}

# Check if configtxgen is available
try {
    configtxgen --version | Out-Null
    Write-Host "✓ configtxgen is available"
} catch {
    Write-Error "configtxgen not found. Please install Hyperledger Fabric binaries first."
    exit 1
}

# Clean up existing certificates
Write-Host "Cleaning up existing certificates..."
if (Test-Path "organizations\peerOrganizations") {
    Remove-Item -Recurse -Force "organizations\peerOrganizations"
}
if (Test-Path "organizations\ordererOrganizations") {
    Remove-Item -Recurse -Force "organizations\ordererOrganizations"
}

# Generate certificates
Write-Host "Generating certificates..."

Write-Host "- Generating orderer certificates..."
cryptogen generate --config="organizations\cryptogen\crypto-config-orderer.yaml" --output="organizations"

Write-Host "- Generating hospital certificates..."
cryptogen generate --config="organizations\cryptogen\crypto-config-hospital.yaml" --output="organizations"

Write-Host "- Generating lab certificates..."
cryptogen generate --config="organizations\cryptogen\crypto-config-lab.yaml" --output="organizations"

Write-Host "- Generating insurer certificates..."
cryptogen generate --config="organizations\cryptogen\crypto-config-insurer.yaml" --output="organizations"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to generate certificates"
    exit 1
}

# Create channel-artifacts directory
if (!(Test-Path "channel-artifacts")) {
    New-Item -ItemType Directory -Path "channel-artifacts"
}

# Set environment variable for configtx
$env:FABRIC_CFG_PATH = "$(Get-Location)\configtx"

# Generate genesis block
Write-Host "Generating genesis block..."
configtxgen -profile HealthcareOrdererGenesis -channelID system-channel -outputBlock "channel-artifacts\genesis.block"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to generate genesis block"
    exit 1
}

# Write-Host "✓ Certificates and genesis block generated successfully!"
# Write-Host ""
# Write-Host "Next steps:"
# Write-Host "1. Start the network: docker-compose up -d"
# Write-Host "2. Create channel: .\create-channel.ps1"
# Write-Host ""