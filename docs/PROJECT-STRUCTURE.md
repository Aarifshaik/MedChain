# Healthcare DLT - Project Structure

This document describes the clean, organized structure of the Healthcare DLT project.

## 📁 Root Directory

```
MedChain/
├── .git/                    # Git repository
├── .gitignore              # Git ignore rules
├── .kiro/                  # Kiro IDE configuration
├── .vscode/                # VS Code settings
├── docs/                   # Documentation
├── fabric-network/         # Blockchain network
├── frontend/               # React frontend application
├── middleware/             # Node.js API server
├── node_modules/           # Dependencies
├── pqc-keys/              # Post-quantum cryptography keys
├── scripts/               # Cross-platform setup scripts
├── setup-scripts/         # PowerShell setup and dev tools
├── package.json           # Root package configuration
├── package-lock.json      # Dependency lock file
└── README.md             # Main project documentation
```

## 🔧 Setup Scripts Organization

### setup-scripts/installation/
Scripts for setting up the blockchain network on a new machine:
- `generate-certs.ps1` - Generate certificates for all organizations
- `create-channel.ps1` - Create the healthcare channel
- `deploy-chaincode.ps1` - Deploy smart contracts
- `docker-compose.yml` - Docker network configuration
- `README.md` - Installation guide

### setup-scripts/development/
Scripts for daily development work:
- `blockchain-auth.ps1` - User authentication management
- `test-blockchain-auth.ps1` - Test authentication flows
- `test-rate-limit.ps1` - Test API rate limiting
- `diagnose-blockchain-state.ps1` - Diagnose blockchain issues
- `fix-blockchain-state.ps1` - Fix common blockchain issues
- `README.md` - Development guide

### setup-scripts/archive/
Old and unused scripts kept for reference:
- Various deprecated scripts
- Historical fixes and tests
- `README.md` - Archive documentation

## 🏗 Fabric Network Structure

```
fabric-network/
├── bin/                      # Fabric binaries (peer, orderer, etc.)
├── builders/                 # Chaincode builders
├── chaincode/               # Smart contracts
│   └── healthcare/          # Healthcare chaincode (Go)
├── channel-artifacts/       # Channel configuration artifacts
├── config/                  # Fabric configuration files
├── configtx/               # Channel and network configuration
├── connection-profiles/    # SDK connection profiles
├── organizations/          # Crypto materials (MSP, TLS)
├── scripts/                # Network management scripts
│   ├── network.ps1         # Network lifecycle
│   ├── network.sh          # Linux version
│   ├── deploy-chaincode.ps1 # Chaincode deployment
│   └── deploy-chaincode.sh  # Linux version
├── docker-compose.yml      # Docker services
├── install-fabric-binaries.ps1 # Install Fabric tools
└── README.md              # Network documentation
```

## 📚 Documentation Structure

```
docs/
├── development/            # Development guides
├── AUTH_README.md         # Authentication system guide
├── PRODUCTION-SETUP.md    # Production setup guide
├── PROJECT-STRUCTURE.md   # This file
└── README.md             # Documentation index
```

## 🎯 Key Files

### Root Level
- `package.json` - Workspace configuration, npm scripts
- `README.md` - Main project documentation and quick start
- `.gitignore` - Git ignore patterns

### Middleware
- `middleware/package.json` - API server dependencies
- `middleware/src/` - API source code
- `middleware/.env` - Environment configuration

### Frontend
- `frontend/package.json` - Frontend dependencies
- `frontend/src/` - React application source
- `frontend/.env.local` - Frontend environment config

## 🚀 Quick Reference

### First Time Setup
```powershell
# 1. Install dependencies
npm install

# 2. Setup blockchain
cd setup-scripts/installation
.\generate-certs.ps1
docker-compose up -d
.\create-channel.ps1
.\deploy-chaincode.ps1

# 3. Start services
cd ../../middleware && npm run dev
cd ../frontend && npm run dev
```

### Daily Development
```powershell
# Start blockchain (if not running)
cd setup-scripts/installation
docker-compose up -d

# Test authentication
cd ../development
.\test-blockchain-auth.ps1

# Manage users
.\blockchain-auth.ps1 -Action register -UserId user1 -Role patient
.\blockchain-auth.ps1 -Action login -UserId user1
```

### Troubleshooting
```powershell
# Check network status
docker ps

# View logs
docker logs fabric-network-peer0-hospital-1

# Diagnose issues
cd setup-scripts/development
.\diagnose-blockchain-state.ps1

# Fix common issues
.\fix-blockchain-state.ps1
```

## 📝 Notes

- All PowerShell scripts are in `setup-scripts/`
- All blockchain network files are in `fabric-network/`
- Documentation is centralized in `docs/`
- No test or debug scripts in root directory
- Clean separation between installation and development tools
