import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface SeiWalletConfig {
  privateKey: string;
  rpcUrl: string;
  chainId: string;
}

export class SeiBlockchainService extends EventEmitter {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  private config: SeiWalletConfig;
  private agentId: string;
  private isInitialized: boolean = false;

  constructor(agentId: string, config?: SeiWalletConfig) {
    super();
    this.agentId = agentId;
    
    this.config = config || {
      privateKey: process.env.SEI_PRIVATE_KEY!,
      rpcUrl: process.env.SEI_RPC_URL!,
      chainId: process.env.SEI_CHAIN_ID || 'atlantic-2'
    };

    if (!this.config.privateKey) {
      throw new Error('SEI_PRIVATE_KEY is required');
    }

    this.wallet = new ethers.Wallet(this.config.privateKey);
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Connect wallet to provider
      this.wallet = this.wallet.connect(this.provider);
      
      // Verify connection
      const network = await this.provider.getNetwork();
      logger.info(`Connected to Sei network: ${network.name} (chainId: ${network.chainId})`);
      
      // Get balance to verify wallet works
      const balance = await this.getBalance();
      logger.info(`Wallet ${this.wallet.address} balance: ${balance} SEI`);
      
      this.isInitialized = true;
      this.emit('initialized', { agentId: this.agentId, address: this.wallet.address });
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async getBalance(address?: string): Promise<number> {
    try {
      const targetAddress = address || this.wallet.address;
      const balance = await this.provider.getBalance(targetAddress);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      logger.error('Failed to get balance:', error);
      return 0;
    }
  }

  async recordEarnings(amount: number, currency: string = 'SEI', source: string = 'unknown'): Promise<void> {
    // In a real implementation, this would record on-chain
    // For now, just emit an event
    this.emit('earnings_recorded', {
      agentId: this.agentId,
      amount,
      currency,
      source,
      timestamp: Date.now()
    });
    
    logger.info(`Recorded earnings: ${amount} ${currency} from ${source}`);
  }

  async registerAgent(metadata?: any): Promise<any> {
    // Simplified agent registration
    const registry = {
      agentId: this.agentId,
      owner: this.wallet.address,
      contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      registrationDate: Date.now()
    };
    
    logger.info(`Agent registered: ${this.agentId}`);
    return registry;
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  async disconnect(): Promise<void> {
    this.isInitialized = false;
    logger.info('Blockchain service disconnected');
  }
}