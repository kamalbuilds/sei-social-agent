import { X402Client, X402PaymentRequest, X402PaymentResponse } from './x402-client';
import { logger } from '../utils/logger';

interface PaymentRequest {
  recipient: string;
  amount: number;
  currency: string;
  memo?: string;
}

interface PaymentResponse {
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  fee: number;
  explorerUrl: string;
}

export class PaymentProcessor {
  private x402Client: X402Client;
  private totalFees: number = 0;
  private isInitialized: boolean = false;

  constructor() {
    this.x402Client = new X402Client({
      facilitatorUrl: process.env.X402_FACILITATOR_URL || 'http://localhost:3001',
      privateKey: process.env.SEI_PRIVATE_KEY,
      network: process.env.SEI_NETWORK === 'mainnet' ? 'sei-pacific' : 'sei-arctic'
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    logger.info('Initializing x402 payment processor...');

    try {
      await this.x402Client.initialize();
      this.isInitialized = true;
      
      const walletAddress = this.x402Client.getWalletAddress();
      logger.info(`Payment wallet address: ${walletAddress}`);
      
      const balance = await this.x402Client.getBalance();
      logger.info(`Wallet balance: ${balance} SEI`);
      
      logger.info('Payment processor initialized');
    } catch (error) {
      logger.error('Failed to initialize payment processor:', error);
      throw error;
    }
  }

  async sendTip(request: PaymentRequest): Promise<PaymentResponse> {
    logger.info(`Processing tip: ${request.amount} ${request.currency} to ${request.recipient}`);

    try {
      // Step 1: Verify recipient address
      const recipientAddress = await this.resolveRecipientAddress(request.recipient);

      // Step 2: Calculate fees
      const fee = this.calculateFee(request.amount);
      const totalAmount = request.amount + fee;

      // Step 3: Create payment via x402 protocol
      const paymentData = {
        from: this.wallet?.address,
        to: recipientAddress,
        amount: request.amount,
        currency: request.currency,
        memo: request.memo || 'Social tip via Sei Tipping Agent',
        sessionToken: this.sessionToken
      };

      // Step 4: Send payment through facilitator
      const response = await axios.post(
        `${this.facilitatorUrl}/settle`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
            'X-402-Payment-Required': 'true',
            'Content-Type': 'application/json'
          }
        }
      );

      // Step 5: Process response
      if (response.status === 200 && response.data.transactionHash) {
        this.totalFees += fee;
        
        const paymentResponse: PaymentResponse = {
          transactionHash: response.data.transactionHash,
          status: 'confirmed',
          timestamp: new Date(),
          fee,
          explorerUrl: this.getExplorerUrl(response.data.transactionHash)
        };

        logger.info(`Tip sent successfully: ${paymentResponse.transactionHash}`);
        return paymentResponse;
      } else {
        throw new Error('Payment failed: Invalid response from facilitator');
      }

    } catch (error: any) {
      logger.error('Payment failed:', error);
      
      // Handle specific x402 errors
      if (error.response?.status === 402) {
        throw new Error('Insufficient balance for payment');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded, please try again later');
      }
      
      throw error;
    }
  }

  private async resolveRecipientAddress(recipient: string): Promise<string> {
    // If it's already a valid address, return it
    if (this.isValidAddress(recipient)) {
      return recipient;
    }

    // Try to resolve username to address via platform APIs
    try {
      const response = await axios.get(
        `${this.facilitatorUrl}/resolve/${recipient}`
      );
      
      if (response.data.address) {
        return response.data.address;
      }
    } catch (error) {
      logger.warn(`Could not resolve recipient ${recipient}, using as-is`);
    }

    return recipient;
  }

  private isValidAddress(address: string): boolean {
    // Check for Sei address format
    if (address.startsWith('sei1') && address.length === 43) {
      return true;
    }
    
    // Check for Ethereum address format
    if (address.startsWith('0x') && address.length === 42) {
      return ethers.isAddress(address);
    }
    
    return false;
  }

  private calculateFee(amount: number): number {
    // x402 protocol fee: 0.5% with minimum of $0.001
    const percentageFee = amount * 0.005;
    const minimumFee = 0.001;
    
    return Math.max(percentageFee, minimumFee);
  }

  private getExplorerUrl(txHash: string): string {
    const chainId = process.env.SEI_CHAIN_ID || 'atlantic-2';
    
    if (chainId === 'pacific-1') {
      return `https://seitrace.com/tx/${txHash}`;
    } else {
      return `https://seitrace.com/tx/${txHash}?chain=atlantic-2`;
    }
  }

  async getBalance(): Promise<{ sei: number; usd: number }> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Get balance from Sei network
      const provider = new ethers.JsonRpcProvider(process.env.SEI_RPC_URL);
      const balance = await provider.getBalance(this.wallet.address);
      
      // Convert from wei to SEI
      const seiBalance = parseFloat(ethers.formatEther(balance));
      
      // Get USD price (mock for now, integrate with price oracle)
      const usdPrice = await this.getSeiUsdPrice();
      
      return {
        sei: seiBalance,
        usd: seiBalance * usdPrice
      };
    } catch (error) {
      logger.error('Failed to get balance:', error);
      throw error;
    }
  }

  private async getSeiUsdPrice(): Promise<number> {
    // In production, fetch from CoinGecko or similar
    // For now, return mock price
    return 0.50; // $0.50 per SEI
  }

  async withdraw(address: string, amount: number): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      const provider = new ethers.JsonRpcProvider(process.env.SEI_RPC_URL);
      const walletWithProvider = this.wallet.connect(provider);
      
      const tx = await walletWithProvider.sendTransaction({
        to: address,
        value: ethers.parseEther(amount.toString())
      });
      
      await tx.wait();
      
      logger.info(`Withdrawal successful: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      logger.error('Withdrawal failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Clean up session
    if (this.sessionToken) {
      try {
        await axios.post(
          `${this.facilitatorUrl}/session/close`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );
      } catch (error) {
        logger.warn('Error closing session:', error);
      }
    }

    this.sessionToken = undefined;
    logger.info('Payment processor disconnected');
  }

  getStats(): any {
    return {
      totalFees: this.totalFees,
      sessionActive: !!this.sessionToken,
      walletAddress: this.wallet?.address
    };
  }
}