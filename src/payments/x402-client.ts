import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface X402PaymentRequest {
  recipient: string;
  amount: number;
  currency: string;
  memo?: string;
}

export interface X402PaymentResponse {
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  fee: number;
  network: string;
}

export interface X402Config {
  facilitatorUrl: string;
  privateKey: string;
  network: 'sei-pacific' | 'sei-arctic';
  chainId: number;
}

export class X402Client {
  private client: AxiosInstance;
  private wallet: ethers.Wallet;
  private config: X402Config;
  private nonce: number = 0;

  constructor(config: Partial<X402Config> = {}) {
    this.config = {
      facilitatorUrl: config.facilitatorUrl || process.env.X402_FACILITATOR_URL || 'http://localhost:3001',
      privateKey: config.privateKey || process.env.SEI_PRIVATE_KEY || '',
      network: config.network || 'sei-arctic',
      chainId: config.chainId || (config.network === 'sei-pacific' ? 1329 : 713715),
    };

    if (!this.config.privateKey) {
      throw new Error('Private key required for x402 payments');
    }

    this.wallet = new ethers.Wallet(this.config.privateKey);
    
    this.client = axios.create({
      baseURL: this.config.facilitatorUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info(`x402 Client initialized for ${this.config.network}`);
  }

  async initialize(): Promise<void> {
    try {
      // Check facilitator health
      const health = await this.client.get('/health');
      logger.info('x402 facilitator status:', health.data);

      // Get supported payment methods
      const supported = await this.client.get('/supported');
      logger.info('Supported payment schemes:', supported.data);

      // Initialize nonce
      const provider = new ethers.JsonRpcProvider(this.getRpcUrl());
      this.nonce = await provider.getTransactionCount(this.wallet.address);
    } catch (error) {
      logger.error('Failed to initialize x402 client:', error);
      throw error;
    }
  }

  async sendPayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    try {
      // Create payment payload
      const payload = await this.createPaymentPayload(request);
      
      // Create payment requirements
      const requirements = this.createPaymentRequirements(request);

      // First verify the payment
      const verifyResponse = await this.client.post('/verify', {
        paymentPayload: payload,
        paymentRequirements: requirements,
      });

      if (!verifyResponse.data.isValid) {
        throw new Error(`Payment verification failed: ${verifyResponse.data.invalidReason}`);
      }

      // Settle the payment
      const settleResponse = await this.client.post('/settle', {
        paymentPayload: payload,
        paymentRequirements: requirements,
      });

      if (!settleResponse.data.success) {
        throw new Error(`Payment settlement failed: ${settleResponse.data.errorReason}`);
      }

      return {
        transactionHash: settleResponse.data.transaction,
        status: 'confirmed',
        timestamp: new Date(),
        fee: this.calculateFee(request.amount),
        network: this.config.network,
      };
    } catch (error: any) {
      logger.error('Payment failed:', error);
      throw error;
    }
  }

  private async createPaymentPayload(request: X402PaymentRequest) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create authorization object
    const authorization = {
      from: this.wallet.address,
      to: request.recipient,
      amount: ethers.parseEther(request.amount.toString()).toString(),
      nonce: this.nonce++,
      timestamp,
      chainId: this.config.chainId,
    };

    // Sign the payload
    const message = ethers.solidityPackedKeccak256(
      ['address', 'address', 'uint256', 'uint256', 'uint256', 'uint256'],
      [
        authorization.from,
        authorization.to,
        authorization.amount,
        authorization.nonce,
        authorization.timestamp,
        authorization.chainId,
      ]
    );

    const signature = await this.wallet.signMessage(ethers.getBytes(message));

    return {
      x402Version: 1,
      scheme: 'exact',
      network: this.config.network,
      payload: {
        authorization,
        memo: request.memo || 'Social tip via Sei Agent',
      },
      signature,
    };
  }

  private createPaymentRequirements(request: X402PaymentRequest) {
    return {
      x402Version: 1,
      scheme: 'exact',
      network: this.config.network,
      requiredAmount: ethers.parseEther(request.amount.toString()).toString(),
      recipient: request.recipient,
      currency: request.currency || 'SEI',
      expiryTime: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    };
  }

  private calculateFee(amount: number): number {
    // 0.5% fee with minimum of $0.001
    const percentageFee = amount * 0.005;
    const minimumFee = 0.001;
    return Math.max(percentageFee, minimumFee);
  }

  private getRpcUrl(): string {
    // Use environment RPC URL if available
    if (process.env.SEI_RPC_URL) {
      return process.env.SEI_RPC_URL;
    }
    
    if (this.config.network === 'sei-pacific') {
      return 'https://evm-rpc.pacific-1.seinetwork.io';
    }
    return 'https://evm-rpc-testnet.sei-apis.com';
  }

  async getBalance(): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider(this.getRpcUrl());
      const balance = await provider.getBalance(this.wallet.address);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      logger.error('Failed to get balance:', error);
      return 0;
    }
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }
}