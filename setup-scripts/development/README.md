# Healthcare DLT - Development Guide

This directory contains scripts and tools for development and testing.

## Development Scripts

### Authentication Testing
- `blockchain-auth.ps1` - Test blockchain authentication flows
- `test-blockchain-auth.ps1` - Automated authentication tests

### Performance Testing  
- `test-rate-limit.ps1` - Test API rate limiting

## Usage Examples

### Test User Authentication
```powershell
# Test admin login
.\blockchain-auth.ps1 -Action login -UserId admin -SaveToken

# Register new user
.\blockchain-auth.ps1 -Action register -UserId doctor1 -Role doctor

# Approve user registration (admin only)
.\blockchain-auth.ps1 -Action admin-approve -ApproveUserId doctor1
```

### Run Authentication Tests
```powershell
# Run comprehensive auth tests
.\test-blockchain-auth.ps1

# Test specific scenarios
.\test-blockchain-auth.ps1 -TestType login
.\test-blockchain-auth.ps1 -TestType registration
```

### Test Rate Limiting
```powershell
# Test API rate limits
.\test-rate-limit.ps1

# Test specific endpoints
.\test-rate-limit.ps1 -Endpoint "/api/auth/login"
```

## Development Workflow

### 1. Start Development Environment
```bash
# Terminal 1: Start blockchain network
cd setup-scripts/installation
docker-compose up -d

# Terminal 2: Start middleware with hot reload
cd middleware
npm run dev

# Terminal 3: Start frontend with hot reload
cd frontend
npm run dev
```

### 2. Test Changes
```powershell
# Test authentication after code changes
cd setup-scripts/development
.\test-blockchain-auth.ps1

# Test API endpoints
.\test-rate-limit.ps1
```

### 3. Debug Issues
```bash
# Check middleware logs
cd middleware
npm run logs

# Check blockchain logs
docker logs fabric-network-cli-1
docker logs fabric-network-orderer-1
```

## Blockchain Development

### Query Blockchain Directly
```bash
# Query user from blockchain
docker exec fabric-network-cli-1 peer chaincode query \
  -C healthcare-channel \
  -n healthcare-chaincode \
  -c '{"function":"UserContract:getUser","Args":["admin"]}'

# Register user directly
docker exec fabric-network-cli-1 peer chaincode invoke \
  -o orderer.healthcare.com:7050 \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/healthcare.com/orderers/orderer.healthcare.com/msp/tlscacerts/tlsca.healthcare.com-cert.pem \
  -C healthcare-channel \
  -n healthcare-chaincode \
  --peerAddresses peer0.hospital.healthcare.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.healthcare.com/peers/peer0.hospital.healthcare.com/tls/ca.crt \
  -c '{"function":"UserContract:registerUser","Args":["testuser","patient","kyber_key","dilithium_key","test@example.com","hospital","signature"]}'
```

### Check Chaincode Status
```bash
# Check deployed chaincode
docker exec fabric-network-cli-1 peer lifecycle chaincode querycommitted --channelID healthcare-channel

# Check installed packages
docker exec fabric-network-cli-1 peer lifecycle chaincode queryinstalled
```

## API Testing

### Using curl
```bash
# Test authentication endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"admin","signature":"test_signature","nonce":"test_nonce"}'

# Test protected endpoint
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using PowerShell
```powershell
# Test API endpoints
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/nonce" -Method GET
Write-Host "Nonce: $($response.nonce)"
```

## Code Changes

### Modifying Smart Contracts
1. Edit files in `fabric-network/chaincode/lib/`
2. Increment version in deployment script
3. Redeploy chaincode:
   ```powershell
   cd setup-scripts/installation
   .\deploy-chaincode.ps1 -ChaincodeVersion "1.4" -ChaincodeSequence 3
   ```

### Modifying Middleware
- Changes are automatically reloaded with `npm run dev`
- Check logs for compilation errors
- Test endpoints after changes

### Modifying Frontend
- Changes are automatically reloaded with `npm run dev`
- Check browser console for errors
- Test UI flows after changes

## Debugging Tips

### Common Issues
1. **Authentication fails**: Check blockchain service connection
2. **API errors**: Check middleware logs and environment variables
3. **UI issues**: Check browser console and network tab
4. **Blockchain errors**: Check container logs and chaincode status

### Useful Commands
```bash
# Check all container status
docker ps -a

# View container logs
docker logs fabric-network-cli-1 -f

# Restart specific container
docker restart fabric-network-peer0-hospital-1

# Check middleware process
ps aux | grep node

# Check port usage
netstat -an | findstr :5000
```

## Performance Monitoring

### Monitor API Performance
```powershell
# Test response times
.\test-rate-limit.ps1 -Verbose

# Monitor specific endpoints
Measure-Command { Invoke-RestMethod -Uri "http://localhost:5000/api/health" }
```

### Monitor Blockchain Performance
```bash
# Check transaction throughput
docker exec fabric-network-cli-1 peer chaincode query \
  -C healthcare-channel \
  -n healthcare-chaincode \
  -c '{"function":"AuditContract:getStats","Args":[]}'
```

## Best Practices

1. **Always test authentication flows** after making changes
2. **Use proper error handling** in all API endpoints
3. **Validate input parameters** before blockchain calls
4. **Monitor performance** during development
5. **Keep blockchain and middleware logs** for debugging
6. **Test with multiple user roles** to ensure proper access control