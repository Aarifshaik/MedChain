# Healthcare DLT - Installation Guide

This directory contains all the essential scripts needed to set up the Healthcare DLT system on a new development machine.

## Prerequisites

### Required Software
- **Docker Desktop** (with WSL2 backend on Windows)
- **Node.js** (v18 or higher)
- **PowerShell** (v7 or higher recommended)
- **Git**

### System Requirements
- Windows 10/11 with WSL2 enabled
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space

## Installation Steps

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd MedChain
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install middleware dependencies
cd middleware
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Set Up Environment Variables
```bash
# Copy environment templates
cp middleware/.env.example middleware/.env
cp frontend/.env.local.example frontend/.env.local

# Edit the .env files with your configuration
```

### 4. Start Blockchain Network
```powershell
# Navigate to installation directory
cd setup-scripts/installation

# Generate certificates and start network
.\generate-certs.ps1
docker-compose up -d

# Wait for network to be ready (30-60 seconds)
```

### 5. Create Channel and Deploy Chaincode
```powershell
# Create blockchain channel
.\create-channel.ps1

# Deploy smart contracts
.\deploy-chaincode.ps1
```

### 6. Start Services
```bash
# Start middleware (from project root)
cd middleware
npm run dev

# Start frontend (in new terminal)
cd frontend
npm run dev
```

## Verification

### Check Blockchain Status
```powershell
# Check if all containers are running
docker ps

# Should see containers for:
# - orderer.healthcare.com
# - peer0.hospital.healthcare.com
# - peer0.lab.healthcare.com
# - peer0.insurer.healthcare.com
# - cli
```

### Test Authentication
```bash
# Test blockchain authentication
node -e "
const { authService } = require('./middleware/dist/services/authService.js');
console.log('Auth service loaded successfully');
"
```

### Access Applications
- **Frontend**: http://localhost:3000
- **Middleware API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

## Troubleshooting

### Common Issues

1. **Docker containers not starting**
   - Ensure Docker Desktop is running
   - Check WSL2 integration is enabled
   - Restart Docker Desktop

2. **Certificate errors**
   - Re-run `.\generate-certs.ps1`
   - Ensure no antivirus is blocking certificate generation

3. **Chaincode deployment fails**
   - Check all containers are healthy: `docker ps`
   - Restart the network: `docker-compose down && docker-compose up -d`
   - Wait 60 seconds before deploying chaincode

4. **Port conflicts**
   - Ensure ports 3000, 5000, 7050, 7051, 8051, 9051 are available
   - Stop any conflicting services

### Reset Everything
```powershell
# Stop and remove all containers
docker-compose down -v
docker system prune -f

# Remove generated certificates
Remove-Item -Recurse -Force ../fabric-network/organizations
Remove-Item -Recurse -Force ../fabric-network/channel-artifacts

# Start fresh
.\generate-certs.ps1
docker-compose up -d
.\create-channel.ps1
.\deploy-chaincode.ps1
```

## File Structure

```
setup-scripts/installation/
├── README.md                 # This file
├── docker-compose.yml        # Blockchain network configuration
├── generate-certs.ps1        # Certificate generation
├── create-channel.ps1        # Channel creation
└── deploy-chaincode.ps1      # Smart contract deployment
```

## Next Steps

After successful installation:
1. Create user accounts via the frontend
2. Test authentication flows
3. Explore the API documentation
4. Set up development environment (see ../development/)

## Support

For issues during installation:
1. Check the troubleshooting section above
2. Review container logs: `docker logs <container-name>`
3. Ensure all prerequisites are met
4. Try the reset procedure if needed