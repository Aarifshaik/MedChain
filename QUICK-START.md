# Healthcare DLT - Quick Start Guide

## 🚀 For New Developers

### 1. First Time Setup (15 minutes)

```powershell
# Clone and install
git clone <repository-url>
cd MedChain
npm install

# Setup blockchain network
cd setup-scripts/installation
.\generate-certs.ps1
docker-compose up -d
.\create-channel.ps1
.\deploy-chaincode.ps1

# Start development servers
cd ../../middleware
npm run dev

# In another terminal
cd frontend
npm run dev
```

### 2. Access the Application
- Frontend: http://localhost:3000
- API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs

## 🔧 Daily Development

### Start Everything
```powershell
# Terminal 1: Blockchain (if not running)
cd setup-scripts/installation
docker-compose up -d

# Terminal 2: API
cd middleware
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

### Test Authentication
```powershell
cd setup-scripts/development
.\test-blockchain-auth.ps1
```

### Create Users
```powershell
cd setup-scripts/development

# Register new user
.\blockchain-auth.ps1 -Action register -UserId patient1 -Role patient

# Admin approves
.\blockchain-auth.ps1 -Action admin-approve -ApproveUserId patient1

# User logs in
.\blockchain-auth.ps1 -Action login -UserId patient1
```

## 🔍 Common Commands

### Check Status
```powershell
# Check Docker containers
docker ps

# Check blockchain status
docker exec fabric-network-cli-1 peer lifecycle chaincode querycommitted --channelID healthcare-channel

# View logs
docker logs fabric-network-peer0-hospital-1
```

### Troubleshooting
```powershell
cd setup-scripts/development

# Diagnose issues
.\diagnose-blockchain-state.ps1

# Fix common problems
.\fix-blockchain-state.ps1
```

### Reset Network (if needed)
```powershell
cd setup-scripts/installation
docker-compose down -v
.\generate-certs.ps1
docker-compose up -d
.\create-channel.ps1
.\deploy-chaincode.ps1
```

## 📁 Where to Find Things

- **Setup Scripts**: `setup-scripts/installation/` and `setup-scripts/development/`
- **Blockchain Network**: `fabric-network/`
- **API Code**: `middleware/src/`
- **Frontend Code**: `frontend/src/`
- **Documentation**: `docs/`
- **Smart Contracts**: `fabric-network/chaincode/healthcare/`

## 📚 Learn More

- [Full README](README.md) - Complete project documentation
- [Project Structure](docs/PROJECT-STRUCTURE.md) - File organization
- [Installation Guide](setup-scripts/installation/README.md) - Detailed setup
- [Development Guide](setup-scripts/development/README.md) - Development workflow
- [Authentication Guide](docs/AUTH_README.md) - Auth system details

## 🆘 Need Help?

1. Check the logs: `docker logs <container-name>`
2. Run diagnostics: `.\diagnose-blockchain-state.ps1`
3. Check documentation in `docs/` folder
4. Review the main [README.md](README.md)
