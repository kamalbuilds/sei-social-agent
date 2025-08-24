import { X402Client } from './x402-client';
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
  private paymentHistory: PaymentResponse[] = [];

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
    if (!this.isInitialized) {
      await this.initialize();
    }

    logger.info(`Processing tip: ${request.amount} ${request.currency} to ${request.recipient}`);

    try {
      // Validate recipient address
      const recipientAddress = await this.resolveRecipientAddress(request.recipient);

      // Calculate fees
      const fee = this.calculateFee(request.amount);

      // Send payment via x402
      const x402Response = await this.x402Client.sendPayment({
        recipient: recipientAddress,
        amount: request.amount,
        currency: request.currency || 'SEI',
        memo: request.memo || 'Social tip via Sei Tipping Agent'
      });

      // Create response
      const paymentResponse: PaymentResponse = {
        transactionHash: x402Response.transactionHash,
        status: x402Response.status,
        timestamp: x402Response.timestamp,
        fee: x402Response.fee,
        explorerUrl: this.getExplorerUrl(x402Response.transactionHash)
      };

      // Update tracking
      this.totalFees += fee;
      this.paymentHistory.push(paymentResponse);

      logger.info(`Tip sent successfully: ${paymentResponse.transactionHash}`);
      return paymentResponse;

    } catch (error: any) {
      logger.error('Payment failed:', error);
      
      const failedResponse: PaymentResponse = {
        transactionHash: '',
        status: 'failed',
        timestamp: new Date(),
        fee: 0,
        explorerUrl: ''
      };

      this.paymentHistory.push(failedResponse);
      throw error;
    }
  }

  private async resolveRecipientAddress(recipient: string): Promise<string> {
    // If it's already a valid address, return it
    if (this.isValidAddress(recipient)) {
      return recipient;
    }

    // For social media handles, try to resolve from our registry
    // In production, this would query a mapping service
    logger.info(`Resolving recipient address for: ${recipient}`);
    
    // For now, return as-is and let the payment processor handle it
    return recipient;
  }

  private isValidAddress(address: string): boolean {
    // Check for Sei address format (sei1...)
    if (address.startsWith('sei1') && address.length === 43) {
      return true;
    }
    
    // Check for Ethereum/EVM address format (0x...)
    if (address.startsWith('0x') && address.length === 42) {
      return true;
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
    const network = process.env.SEI_NETWORK === 'mainnet' ? 'pacific-1' : 'arctic-1';
    return `https://seitrace.com/tx/${txHash}?chain=${network}`;
  }

  async getBalance(): Promise<{ sei: number; usd: number }> {
    try {
      const seiBalance = await this.x402Client.getBalance();
      
      // Get USD price (mock for now, integrate with price oracle)
      const usdPrice = await this.getSeiUsdPrice();
      
      return {
        sei: seiBalance,
        usd: seiBalance * usdPrice
      };
    } catch (error) {
      logger.error('Failed to get balance:', error);
      return { sei: 0, usd: 0 };
    }
  }

  private async getSeiUsdPrice(): Promise<number> {
    // In production, fetch from CoinGecko or similar
    // For now, return mock price
    return 0.50; // $0.50 per SEI
  }

  async withdraw(address: string, amount: number): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Use x402 client to send a direct transfer
      const response = await this.x402Client.sendPayment({
        recipient: address,
        amount,
        currency: 'SEI',
        memo: 'Withdrawal from Social Tipping Agent'
      });
      
      logger.info(`Withdrawal successful: ${response.transactionHash}`);
      return response.transactionHash;
    } catch (error) {
      logger.error('Withdrawal failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Clean up any resources
    this.isInitialized = false;
    logger.info('Payment processor disconnected');
  }

  getStats(): any {
    return {
      totalFees: this.totalFees,
      sessionActive: this.isInitialized,
      walletAddress: this.x402Client.getWalletAddress(),
      totalPayments: this.paymentHistory.length,
      successfulPayments: this.paymentHistory.filter(p => p.status === 'confirmed').length,
      failedPayments: this.paymentHistory.filter(p => p.status === 'failed').length
    };
  }

  getPaymentHistory(): PaymentResponse[] {
    return this.paymentHistory;
  }
}