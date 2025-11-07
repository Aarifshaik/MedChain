# Cleanup Chaincode State
# This script removes existing chaincode to allow fresh deployment

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

Write-Host "Chaincode Cleanup Utility" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check current status
Write-Status "Checking current chaincode status..." "Info"
$currentStatus = docker exec fabric-network-cli-1 peer lifecycle chaincode querycommitted --channelID $ChannelName 2>&1
Write-Host "Current status: $currentStatus"

# Remove chaincode packages from CLI container
Write-Status "Cleaning up chaincode packages..." "Info"
docker exec fabric-network-cli-1 bash -c "rm -f *.tar.gz" 2>&1

# Check installed chaincodes
Write-Status "Checking installed chaincodes..." "Info"
$installedResult = docker exec fabric-network-cli-1 peer lifecycle chaincode queryinstalled 2>&1
Write-Host "Installed chaincodes: $installedResult"

Write-Status "Cleanup completed. You can now run deploy-all-orgs-fixed.ps1" "Success"