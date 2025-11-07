import { BlockchainConfig } from '../services/blockchainService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getBlockchainConfig = (): BlockchainConfig => {
  const config: BlockchainConfig = {
    channelName: process.env.FABRIC_CHANNEL_NAME || 'healthcare-channel',
    chaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'healthcare-chaincode',
    connectionProfilePath: process.env.FABRIC_CONNECTION_PROFILE || 
      path.resolve(__dirname, '../../../fabric-network/connection-profiles/connection-middleware.json'),
    walletPath: process.env.FABRIC_WALLET_PATH || 
      path.resolve(__dirname, '../../wallet'),
    userId: process.env.FABRIC_USER_ID || 'appUser',
    orgMSPId: process.env.FABRIC_ORG_MSP_ID || 'HospitalMSP'
  };

  return config;
};

export const validateBlockchainConfig = (config: BlockchainConfig): void => {
  const requiredFields = [
    'channelName',
    'chaincodeName', 
    'connectionProfilePath',
    'walletPath',
    'userId',
    'orgMSPId'
  ];

  for (const field of requiredFields) {
    if (!config[field as keyof BlockchainConfig]) {
      throw new Error(`Missing required blockchain configuration: ${field}`);
    }
  }
};