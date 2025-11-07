import { Wallets } from 'fabric-network';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createWallet() {
    try {
        // Create wallet
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if appUser already exists
        const userIdentity = await wallet.get('appUser');
        if (userIdentity) {
            console.log('appUser identity already exists in wallet');
            return;
        }

        // Read admin certificate and private key
        const adminCertPath = path.join(__dirname, '../fabric-network/organizations/peerOrganizations/hospital.healthcare.com/users/Admin@hospital.healthcare.com/msp/signcerts/Admin@hospital.healthcare.com-cert.pem');
        const adminKeyPath = path.join(__dirname, '../fabric-network/organizations/peerOrganizations/hospital.healthcare.com/users/Admin@hospital.healthcare.com/msp/keystore');
        
        const adminCert = fs.readFileSync(adminCertPath, 'utf8');
        
        // Find the private key file
        const keyFiles = fs.readdirSync(adminKeyPath);
        const keyFile = keyFiles.find(file => file.endsWith('_sk'));
        const adminKey = fs.readFileSync(path.join(adminKeyPath, keyFile), 'utf8');

        // Create identity for appUser using admin credentials
        const identity = {
            credentials: {
                certificate: adminCert,
                privateKey: adminKey,
            },
            mspId: 'HospitalMSP',
            type: 'X.509',
        };

        // Put identity in wallet
        await wallet.put('appUser', identity);
        console.log('Successfully created appUser identity in wallet');

    } catch (error) {
        console.error('Failed to create wallet:', error);
    }
}

createWallet();