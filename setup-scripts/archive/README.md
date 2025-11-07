# Archive Directory

This directory contains old, unused, or deprecated scripts that were moved during the project cleanup and organization.

## Archived Files

### Deployment Scripts (Deprecated)
- `cleanup-chaincode.ps1` - Old chaincode cleanup utility
- `deploy-all-orgs.ps1` - Original multi-org deployment (had line ending issues)
- `deploy-all-orgs-fixed.ps1` - Fixed version (superseded by deploy-v13-simple.ps1)
- `deploy-single-org.ps1` - Single organization deployment (not needed)
- `deploy-updated-chaincode.ps1` - Old chaincode update script
- `upgrade-to-latest.ps1` - Chaincode upgrade script (had Windows line ending issues)

### Test Scripts (Moved to Development)
- `test-admin-creation.ps1` - Admin user creation tests
- `test-admin-query.ps1` - Admin user query tests  
- `test-existing-chaincode.ps1` - Existing chaincode tests
- `test-real-admin.ps1` - Real admin user tests

### Documentation (Outdated)
- `MOCKED.md` - Documentation about mocked components (no longer relevant)
- `FIXES_APPLIED.md` - List of fixes applied during development
- `SAMPLE_AUTH.md` - Sample authentication documentation

### Initialization Scripts (Superseded)
- `init-blockchain.ps1` - Old blockchain initialization script

## Why These Were Archived

### Line Ending Issues
Several PowerShell scripts had Windows CRLF line ending issues when executed in Docker containers running Linux. These caused bash parsing errors like:
```
Error: invalid argument "2\r" for "--sequence" flag
```

### Superseded Functionality
- Newer, cleaner scripts replaced complex multi-file approaches
- Consolidated functionality into fewer, more reliable scripts
- Removed redundant or experimental code

### Mock Logic Removal
- All mock authentication and fallback logic was removed
- System now uses 100% blockchain-based authentication
- Mock-related documentation is no longer relevant

## Current Active Scripts

### Installation (setup-scripts/installation/)
- `deploy-chaincode.ps1` - Clean chaincode deployment
- `docker-compose.yml` - Network configuration
- `generate-certs.ps1` - Certificate generation
- `create-channel.ps1` - Channel creation

### Development (setup-scripts/development/)
- `blockchain-auth.ps1` - Authentication testing
- `test-blockchain-auth.ps1` - Automated auth tests
- `test-rate-limit.ps1` - API performance tests

## Recovery Instructions

If you need to recover any archived script:

1. **Check if current scripts meet your needs first**
2. **Review the archived script for compatibility issues**
3. **Fix any line ending issues** if copying back:
   ```powershell
   # Convert CRLF to LF for Docker compatibility
   (Get-Content script.ps1) -join "`n" | Set-Content script.ps1 -NoNewline
   ```
4. **Test thoroughly** before using in production

## Lessons Learned

1. **Windows line endings** cause issues in Linux containers
2. **Simpler scripts** are more reliable than complex ones
3. **Mock logic** should be removed early in production systems
4. **File organization** improves maintainability
5. **Clear documentation** prevents confusion about script purposes

---

**Note**: These files are kept for historical reference only. Use the current scripts in the installation/ and development/ directories for active development.