#!/usr/bin/env tsx

import { SeiBlockchain } from '../src/blockchain/sei-integration';
import { logger } from '../src/utils/logger';
import 'dotenv/config';

async function deploy() {
  logger.info('Starting deployment process...');

  const blockchain = new SeiBlockchain();

  try {
    // Connect to Sei network
    await blockchain.connect();
    
    // Get current balance
    const balance = await blockchain.getBalance();
    logger.info(`Wallet balance: ${balance.sei} SEI`);

    // Deploy agent contract
    const contractAddress = await blockchain.deployAgentContract();
    logger.info(`Contract deployed at: ${contractAddress}`);

    // Save contract address to environment
    logger.info('Update your .env file with:');
    logger.info(`AGENT_CONTRACT_ADDRESS=${contractAddress}`);

    // Disconnect
    await blockchain.disconnect();
    
    logger.info('Deployment completed successfully!');
  } catch (error) {
    logger.error('Deployment failed:', error);
    process.exit(1);
  }
}

deploy().catch(console.error);