#!/usr/bin/env tsx

import { SeiBlockchainService } from '../src/blockchain/sei-integration';
import { logger } from '../src/utils/logger';
import 'dotenv/config';

async function deploy() {
  logger.info('Starting deployment process...');

  const blockchain = new SeiBlockchainService('social-tipping-agent', {
    privateKey: process.env.SEI_PRIVATE_KEY!,
    rpcUrl: process.env.SEI_RPC_URL || 'https://evm-rpc.arctic-1.seinetwork.io',
    chainId: 'arctic-1'
  });

  try {
    // Initialize blockchain connection
    await blockchain.initialize();
    
    // Get current balance
    const balance = await blockchain.getBalance();
    logger.info(`Wallet balance: ${balance} SEI`);

    // Register agent on blockchain
    const registry = await blockchain.registerAgent({
      name: 'Social Tipping Agent',
      description: 'AI-powered social media tipping agent',
      agent_type: 'social'
    });
    logger.info(`Agent registered with ID: ${registry.agentId}`);

    // Save agent registry to environment
    logger.info('Update your .env file with:');
    logger.info(`AGENT_ID=${registry.agentId}`);
    logger.info(`AGENT_CONTRACT_ADDRESS=${registry.contractAddress}`);
    
    logger.info('Deployment completed successfully!');
  } catch (error) {
    logger.error('Deployment failed:', error);
    process.exit(1);
  }
}

deploy().catch(console.error);