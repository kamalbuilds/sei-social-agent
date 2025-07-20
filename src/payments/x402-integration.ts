import { EventEmitter } from 'events';

export interface PaymentRequirement {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  outputSchema?: object | null;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: object | null;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: any; // Scheme-dependent
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  amount?: number;
  payer?: string;
  timestamp?: number;
  error?: string;
}

export interface PaymentResponse {
  success: boolean;
  error?: string;
  txHash?: string;
  networkId?: string;
}

export interface StreamResult {
  streamId: string;
  active: boolean;
  totalPaid: number;
  rate: number;
  startTime: number;
}

export interface RevenueConfig {
  models: RevenueModel[];
  paymentMethods: string[];
  withdrawalRules: WithdrawalRules;
  facilitator?: FacilitatorConfig;
}

export interface RevenueModel {
  type: 'content' | 'service' | 'subscription' | 'commission';
  rate: number;
  currency: string;
  billingCycle: 'per_use' | 'hourly' | 'daily' | 'monthly';
  description: string;
  metadata?: Record<string, any>;
}

export interface WithdrawalRules {
  minimumBalance: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  destinationAddress: string;
  autoWithdraw: boolean;
  gasBuffer: number;
}

export interface FacilitatorConfig {
  url: string;
  apiKey?: string;
  supportedSchemes: string[];
  supportedNetworks: string[];
}

export interface EarningsReport {
  totalEarnings: number;
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  topRevenueStreams: RevenueStreamSummary[];
  pendingPayments: number;
  withdrawableBalance: number;
}

export interface RevenueStreamSummary {
  source: string;
  type: string;
  amount: number;
  frequency: string;
  lastPayment: number;
}

export interface PaymentService {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing: 'one_time' | 'subscription' | 'per_use';
  availability: 'public' | 'private' | 'premium';
  requirements?: string[];
}

export class PaymentSystem extends EventEmitter {
  private config: RevenueConfig;
  private services: Map<string, PaymentService> = new Map();
  private activeStreams: Map<string, PaymentStream> = new Map();
  private earnings: EarningsTracker;
  private facilitator?: X402Facilitator;
  private walletAddress: string;

  constructor(config: RevenueConfig, walletAddress: string) {
    super();
    this.config = config;
    this.walletAddress = walletAddress;
    this.earnings = new EarningsTracker();
    
    if (config.facilitator) {
      this.facilitator = new X402Facilitator(config.facilitator);
    }
    
    this.initializeServices();
  }

  private initializeServices(): void {
    // Initialize default services based on revenue models
    for (const model of this.config.models) {
      const service: PaymentService = {
        id: `${model.type}_service`,
        name: this.generateServiceName(model),
        description: this.generateServiceDescription(model),
        price: model.rate,
        currency: model.currency,
        billing: model.billingCycle === 'per_use' ? 'one_time' : 
                model.billingCycle === 'monthly' ? 'subscription' : 'per_use',
        availability: 'public'
      };
      
      this.services.set(service.id, service);
    }
  }

  private generateServiceName(model: RevenueModel): string {
    const names = {
      content: 'Content Creation Service',
      service: 'AI Assistant Service', 
      subscription: 'Premium Agent Access',
      commission: 'Performance-Based Service'
    };
    return names[model.type] || 'AI Service';
  }

  private generateServiceDescription(model: RevenueModel): string {
    const descriptions = {
      content: 'Custom content creation including text, images, and analysis',
      service: 'AI-powered assistance and automation services',
      subscription: 'Unlimited access to premium agent capabilities',
      commission: 'Results-driven service with performance-based pricing'
    };
    return descriptions[model.type] || 'AI-powered service';
  }

  /**
   * Set up payment requirement for a specific service
   */
  async setupPaymentRequirement(serviceId: string, customPrice?: number): Promise<PaymentRequirement> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const requirement: PaymentRequirement = {
      scheme: 'exact',
      network: 'sei-mainnet',
      maxAmountRequired: (customPrice || service.price).toString(),
      resource: `/services/${serviceId}`,
      description: service.description,
      mimeType: 'application/json',
      outputSchema: this.getServiceOutputSchema(service),
      payTo: this.walletAddress,
      maxTimeoutSeconds: 300,
      asset: this.getAssetAddress(service.currency),
      extra: {
        name: service.name,
        serviceType: service.billing,
        metadata: service.requirements
      }
    };

    this.emit('payment_requirement_created', { serviceId, requirement });
    return requirement;
  }

  /**
   * Accept a payment and process the service request
   */
  async acceptPayment(paymentPayload: PaymentPayload): Promise<PaymentResult> {
    try {
      // Validate payment payload
      const validation = await this.validatePayment(paymentPayload);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Process payment through facilitator or directly
      let result: PaymentResult;
      if (this.facilitator) {
        result = await this.facilitator.settlePayment(paymentPayload);
      } else {
        result = await this.processDirectPayment(paymentPayload);
      }

      if (result.success) {
        // Record earnings
        await this.earnings.recordPayment({
          amount: result.amount!,
          currency: paymentPayload.payload.currency || 'SEI',
          source: paymentPayload.payload.serviceId || 'unknown',
          timestamp: Date.now(),
          transactionHash: result.transactionHash!,
          payer: result.payer!
        });

        // Emit success event
        this.emit('payment_received', result);
      }

      return result;
    } catch (error) {
      this.emit('payment_error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Make a payment to another service
   */
  async makePayment(endpoint: string, amount: number, currency: string = 'SEI'): Promise<PaymentResponse> {
    try {
      // Get payment requirements from endpoint
      const requirements = await this.fetchPaymentRequirements(endpoint);
      
      // Create payment payload
      const payload = await this.createPaymentPayload(requirements, amount, currency);
      
      // Submit payment
      const response = await this.submitPayment(endpoint, payload);
      
      if (response.success) {
        this.emit('payment_sent', { endpoint, amount, txHash: response.txHash });
      }
      
      return response;
    } catch (error) {
      this.emit('payment_error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * Start a payment stream for ongoing services
   */
  async streamPayment(serviceId: string, rate: number, duration?: number): Promise<StreamResult> {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stream = new PaymentStream(streamId, serviceId, rate, duration);
    this.activeStreams.set(streamId, stream);
    
    // Start the payment stream
    await stream.start();
    
    stream.on('payment', (payment) => {
      this.earnings.recordPayment(payment);
      this.emit('stream_payment', { streamId, payment });
    });
    
    stream.on('ended', () => {
      this.activeStreams.delete(streamId);
      this.emit('stream_ended', { streamId });
    });
    
    this.emit('stream_started', { streamId, serviceId, rate });
    
    return {
      streamId,
      active: true,
      totalPaid: 0,
      rate,
      startTime: Date.now()
    };
  }

  /**
   * Add a new service offering
   */
  addService(service: PaymentService): void {
    this.services.set(service.id, service);
    this.emit('service_added', service);
  }

  /**
   * Remove a service offering
   */
  removeService(serviceId: string): boolean {
    const deleted = this.services.delete(serviceId);
    if (deleted) {
      this.emit('service_removed', { serviceId });
    }
    return deleted;
  }

  /**
   * Update service pricing or configuration
   */
  updateService(serviceId: string, updates: Partial<PaymentService>): void {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }
    
    Object.assign(service, updates);
    this.emit('service_updated', { serviceId, updates });
  }

  /**
   * Get earnings report
   */
  async getEarningsReport(): Promise<EarningsReport> {
    return await this.earnings.generateReport();
  }

  /**
   * Withdraw accumulated earnings
   */
  async withdrawEarnings(amount?: number): Promise<PaymentResponse> {
    const available = await this.earnings.getWithdrawableBalance();
    const withdrawAmount = amount || available;
    
    if (withdrawAmount > available) {
      return {
        success: false,
        error: 'Insufficient balance'
      };
    }
    
    // Process withdrawal through blockchain
    const result = await this.processWithdrawal(withdrawAmount);
    
    if (result.success) {
      await this.earnings.recordWithdrawal(withdrawAmount, result.txHash!);
      this.emit('withdrawal_completed', { amount: withdrawAmount, txHash: result.txHash });
    }
    
    return result;
  }

  /**
   * Get all available services
   */
  getServices(): PaymentService[] {
    return Array.from(this.services.values());
  }

  /**
   * Get active payment streams
   */
  getActiveStreams(): StreamResult[] {
    return Array.from(this.activeStreams.values()).map(stream => ({
      streamId: stream.id,
      active: stream.isActive(),
      totalPaid: stream.getTotalPaid(),
      rate: stream.getRate(),
      startTime: stream.getStartTime()
    }));
  }

  /**
   * Stop a payment stream
   */
  async stopStream(streamId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      await stream.stop();
      this.activeStreams.delete(streamId);
      this.emit('stream_stopped', { streamId });
    }
  }

  // Private helper methods
  private async validatePayment(payload: PaymentPayload): Promise<{isValid: boolean, error?: string}> {
    // Implement payment validation logic
    if (payload.x402Version !== 1) {
      return { isValid: false, error: 'Unsupported x402 version' };
    }
    
    if (!payload.scheme || !payload.network) {
      return { isValid: false, error: 'Invalid payment scheme or network' };
    }
    
    return { isValid: true };
  }

  private async processDirectPayment(payload: PaymentPayload): Promise<PaymentResult> {
    // Implement direct payment processing
    // This would interact with the Sei blockchain directly
    return {
      success: true,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      amount: parseFloat(payload.payload.amount),
      payer: payload.payload.from,
      timestamp: Date.now()
    };
  }

  private async fetchPaymentRequirements(endpoint: string): Promise<PaymentRequirement> {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.status === 402) {
      const data = await response.json();
      return data.accepts[0]; // Use first payment requirement
    }
    
    throw new Error('Endpoint does not require payment');
  }

  private async createPaymentPayload(requirements: PaymentRequirement, amount: number, currency: string): Promise<PaymentPayload> {
    // Create payment payload based on scheme
    return {
      x402Version: 1,
      scheme: requirements.scheme,
      network: requirements.network,
      payload: {
        amount: amount.toString(),
        currency,
        to: requirements.payTo,
        asset: requirements.asset,
        timestamp: Date.now()
      }
    };
  }

  private async submitPayment(endpoint: string, payload: PaymentPayload): Promise<PaymentResponse> {
    const paymentHeader = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-PAYMENT': paymentHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const paymentResponse = response.headers.get('X-PAYMENT-RESPONSE');
      if (paymentResponse) {
        const decoded = JSON.parse(Buffer.from(paymentResponse, 'base64').toString());
        return decoded;
      }
    }
    
    return { success: false, error: 'Payment failed' };
  }

  private async processWithdrawal(amount: number): Promise<PaymentResponse> {
    // Implement withdrawal to external address
    return {
      success: true,
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      networkId: 'sei-mainnet'
    };
  }

  private getServiceOutputSchema(service: PaymentService): object {
    // Return appropriate output schema based on service type
    const schemas = {
      content: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          metadata: { type: 'object' }
        }
      },
      service: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          status: { type: 'string' }
        }
      }
    };
    
    return schemas[service.billing as keyof typeof schemas] || schemas.service;
  }

  private getAssetAddress(currency: string): string {
    // Map currency to asset contract address
    const assets = {
      'SEI': '0x...',  // SEI native token
      'USDC': '0x...', // USDC contract address
      'USDT': '0x...'  // USDT contract address
    };
    
    return assets[currency as keyof typeof assets] || assets.SEI;
  }
}

// Supporting classes
class X402Facilitator {
  private config: FacilitatorConfig;

  constructor(config: FacilitatorConfig) {
    this.config = config;
  }

  async settlePayment(payload: PaymentPayload): Promise<PaymentResult> {
    const response = await fetch(`${this.config.url}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : ''
      },
      body: JSON.stringify({
        x402Version: payload.x402Version,
        paymentHeader: Buffer.from(JSON.stringify(payload)).toString('base64'),
        paymentRequirements: {} // Would include the full requirements
      })
    });

    const result = await response.json();
    
    return {
      success: result.success,
      transactionHash: result.txHash,
      amount: payload.payload.amount,
      payer: payload.payload.from,
      timestamp: Date.now(),
      error: result.error
    };
  }
}

class PaymentStream extends EventEmitter {
  public id: string;
  private serviceId: string;
  private rate: number;
  private duration?: number;
  private startTime: number = 0;
  private totalPaid: number = 0;
  private active: boolean = false;
  private interval?: NodeJS.Timeout;

  constructor(id: string, serviceId: string, rate: number, duration?: number) {
    super();
    this.id = id;
    this.serviceId = serviceId;
    this.rate = rate;
    this.duration = duration;
  }

  async start(): Promise<void> {
    this.active = true;
    this.startTime = Date.now();
    
    // Process payments at regular intervals
    this.interval = setInterval(() => {
      if (this.active) {
        this.processPayment();
      }
    }, 60000); // Every minute
    
    // Auto-stop if duration is set
    if (this.duration) {
      setTimeout(() => {
        this.stop();
      }, this.duration * 1000);
    }
  }

  async stop(): Promise<void> {
    this.active = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.emit('ended');
  }

  private processPayment(): void {
    const payment = {
      amount: this.rate / 60, // Rate per minute
      currency: 'SEI',
      source: this.serviceId,
      timestamp: Date.now(),
      transactionHash: `stream_${this.id}_${Date.now()}`,
      payer: 'stream_payer'
    };
    
    this.totalPaid += payment.amount;
    this.emit('payment', payment);
  }

  isActive(): boolean {
    return this.active;
  }

  getTotalPaid(): number {
    return this.totalPaid;
  }

  getRate(): number {
    return this.rate;
  }

  getStartTime(): number {
    return this.startTime;
  }
}

class EarningsTracker {
  private payments: PaymentRecord[] = [];
  private withdrawals: WithdrawalRecord[] = [];

  async recordPayment(payment: PaymentRecord): Promise<void> {
    this.payments.push(payment);
  }

  async recordWithdrawal(amount: number, txHash: string): Promise<void> {
    this.withdrawals.push({
      amount,
      timestamp: Date.now(),
      transactionHash: txHash
    });
  }

  async generateReport(): Promise<EarningsReport> {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const totalEarnings = this.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalWithdrawn = this.withdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    const dailyEarnings = this.payments
      .filter(p => now - p.timestamp < dayMs)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const weeklyEarnings = this.payments
      .filter(p => now - p.timestamp < weekMs)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const monthlyEarnings = this.payments
      .filter(p => now - p.timestamp < monthMs)
      .reduce((sum, p) => sum + p.amount, 0);

    const streamSummary = this.getRevenueStreamSummary();
    
    return {
      totalEarnings,
      dailyEarnings,
      weeklyEarnings,
      monthlyEarnings,
      topRevenueStreams: streamSummary,
      pendingPayments: 0, // Would track pending settlements
      withdrawableBalance: totalEarnings - totalWithdrawn
    };
  }

  async getWithdrawableBalance(): Promise<number> {
    const totalEarnings = this.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalWithdrawn = this.withdrawals.reduce((sum, w) => sum + w.amount, 0);
    return totalEarnings - totalWithdrawn;
  }

  private getRevenueStreamSummary(): RevenueStreamSummary[] {
    const streamMap = new Map<string, {total: number, count: number, lastPayment: number}>();
    
    for (const payment of this.payments) {
      const current = streamMap.get(payment.source) || {total: 0, count: 0, lastPayment: 0};
      current.total += payment.amount;
      current.count += 1;
      current.lastPayment = Math.max(current.lastPayment, payment.timestamp);
      streamMap.set(payment.source, current);
    }
    
    return Array.from(streamMap.entries()).map(([source, data]) => ({
      source,
      type: 'service', // Would determine actual type
      amount: data.total,
      frequency: `${data.count} payments`,
      lastPayment: data.lastPayment
    }));
  }
}

interface PaymentRecord {
  amount: number;
  currency: string;
  source: string;
  timestamp: number;
  transactionHash: string;
  payer: string;
}

interface WithdrawalRecord {
  amount: number;
  timestamp: number;
  transactionHash: string;
}