import { EventEmitter } from 'events';
import { z } from 'zod';
import { PlatformSDK } from '../platforms/platform-sdk';
import { PaymentProcessor } from '../payments/payment-processor';
import { ContentEvaluator } from '../ai/content-evaluator';
import { SeiBlockchainService } from '../blockchain/simple-blockchain';
import { logger } from '../utils/logger';

export enum AgentState {
  IDLE = 'IDLE',
  MONITORING = 'MONITORING',
  EVALUATING = 'EVALUATING',
  TIPPING = 'TIPPING',
  LEARNING = 'LEARNING'
}

export const TipDecisionSchema = z.object({
  contentId: z.string(),
  platform: z.enum(['twitter', 'discord', 'linkedin']),
  creator: z.string(),
  qualityScore: z.number().min(0).max(100),
  tipAmount: z.number().positive(),
  reason: z.string(),
  timestamp: z.date()
});

export type TipDecision = z.infer<typeof TipDecisionSchema>;

interface AgentConfig {
  dailyBudget: number;
  minQualityScore: number;
  maxTipAmount: number;
  platforms: string[];
  preferences: {
    topics: string[];
    creators: string[];
    keywords: string[];
  };
}

export class SocialTippingAgent extends EventEmitter {
  private state: AgentState = AgentState.IDLE;
  private config: AgentConfig;
  private platformSDK: PlatformSDK;
  private paymentProcessor: PaymentProcessor;
  private contentEvaluator: ContentEvaluator;
  private blockchain: SeiBlockchainService;
  private dailySpent: number = 0;
  private tipHistory: TipDecision[] = [];
  private isInitialized: boolean = false;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.platformSDK = new PlatformSDK(config.platforms);
    this.paymentProcessor = new PaymentProcessor();
    this.contentEvaluator = new ContentEvaluator();
    this.blockchain = new SeiBlockchainService('social-tipping-agent', {
      privateKey: process.env.SEI_PRIVATE_KEY!,
      rpcUrl: process.env.SEI_RPC_URL || 'https://evm-rpc.arctic-1.seinetwork.io',
      chainId: process.env.SEI_CHAIN_ID || 'arctic-1'
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    logger.info('Initializing Social Tipping Agent...');
    
    try {
      // Initialize blockchain connection
      await this.blockchain.initialize();
      
      // Initialize payment processor
      await this.paymentProcessor.initialize();
      
      // Connect to social platforms
      await this.platformSDK.connectAll();
      
      // Load AI models
      await this.contentEvaluator.loadModels();
      
      this.state = AgentState.IDLE;
      this.isInitialized = true;
      logger.info('Agent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize agent:', error);
      throw error;
    }
  }

  async startMonitoring(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.state !== AgentState.IDLE) {
      throw new Error(`Cannot start monitoring from state: ${this.state}`);
    }

    this.state = AgentState.MONITORING;
    this.emit('stateChange', this.state);

    // Set up content stream from all platforms
    this.platformSDK.on('newContent', async (content) => {
      await this.processContent(content);
    });

    // Start platform monitoring
    await this.platformSDK.startMonitoring({
      keywords: this.config.preferences.keywords,
      creators: this.config.preferences.creators
    });

    logger.info('Started monitoring social platforms');
  }

  private async processContent(content: any): Promise<void> {
    this.state = AgentState.EVALUATING;
    this.emit('stateChange', this.state);

    try {
      // Evaluate content quality
      const evaluation = await this.contentEvaluator.evaluate(content, {
        topics: this.config.preferences.topics,
        minQuality: this.config.minQualityScore
      });

      if (evaluation.qualityScore >= this.config.minQualityScore) {
        await this.executeTip(content, evaluation);
      }
    } catch (error) {
      logger.error('Error processing content:', error);
    } finally {
      this.state = AgentState.MONITORING;
      this.emit('stateChange', this.state);
    }
  }

  private async executeTip(content: any, evaluation: any): Promise<void> {
    // Check budget constraints
    if (this.dailySpent >= this.config.dailyBudget) {
      logger.warn('Daily budget exceeded, skipping tip');
      return;
    }

    // Calculate tip amount based on quality
    const tipAmount = this.calculateTipAmount(evaluation.qualityScore);
    
    if (tipAmount + this.dailySpent > this.config.dailyBudget) {
      logger.warn('Tip would exceed daily budget, skipping');
      return;
    }

    this.state = AgentState.TIPPING;
    this.emit('stateChange', this.state);

    try {
      // Execute payment
      const payment = await this.paymentProcessor.sendTip({
        recipient: content.creator.walletAddress || content.creator.id,
        amount: tipAmount,
        currency: 'SEI',
        memo: `Tip for quality content: ${content.id}`
      });

      // Record on blockchain
      await this.blockchain.recordEarnings(tipAmount, 'SEI', 'tip');

      // Update state
      this.dailySpent += tipAmount;
      
      const decision: TipDecision = {
        contentId: content.id,
        platform: content.platform,
        creator: content.creator.id,
        qualityScore: evaluation.qualityScore,
        tipAmount,
        reason: evaluation.reason,
        timestamp: new Date()
      };
      
      this.tipHistory.push(decision);
      this.emit('tipSent', decision);

      // Reply to content with tip confirmation
      await this.platformSDK.replyToContent(content, {
        message: `🎉 You've been tipped ${tipAmount} SEI for this quality content! Transaction: ${payment.transactionHash.slice(0, 8)}...`
      });

      logger.info(`Tip sent: ${tipAmount} SEI to ${content.creator.id}`);
    } catch (error) {
      logger.error('Failed to send tip:', error);
      this.emit('tipFailed', { content, error });
    }
  }

  private calculateTipAmount(qualityScore: number): number {
    // Linear scaling with quality score
    const baseAmount = 0.01; // $0.01 minimum
    const maxAmount = Math.min(this.config.maxTipAmount, 5.0); // $5 max
    
    const scaleFactor = (qualityScore - this.config.minQualityScore) / 
                       (100 - this.config.minQualityScore);
    
    return baseAmount + (maxAmount - baseAmount) * scaleFactor;
  }

  async updatePreferences(preferences: Partial<AgentConfig['preferences']>): Promise<void> {
    this.state = AgentState.LEARNING;
    this.emit('stateChange', this.state);

    // Update configuration
    this.config.preferences = {
      ...this.config.preferences,
      ...preferences
    };

    // Retrain AI models with new preferences
    await this.contentEvaluator.updatePreferences(this.config.preferences);

    this.state = AgentState.MONITORING;
    this.emit('stateChange', this.state);
  }

  async getStats(): Promise<any> {
    return {
      state: this.state,
      dailySpent: this.dailySpent,
      dailyBudget: this.config.dailyBudget,
      totalTips: this.tipHistory.length,
      averageTip: this.tipHistory.reduce((sum, t) => sum + t.tipAmount, 0) / this.tipHistory.length || 0,
      topCreators: this.getTopCreators(),
      platformBreakdown: this.getPlatformBreakdown()
    };
  }

  private getTopCreators(): any[] {
    const creatorTips = new Map<string, { count: number; total: number }>();
    
    for (const tip of this.tipHistory) {
      const current = creatorTips.get(tip.creator) || { count: 0, total: 0 };
      creatorTips.set(tip.creator, {
        count: current.count + 1,
        total: current.total + tip.tipAmount
      });
    }

    return Array.from(creatorTips.entries())
      .map(([creator, stats]) => ({ creator, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }

  private getPlatformBreakdown(): any {
    const breakdown: any = {};
    
    for (const tip of this.tipHistory) {
      breakdown[tip.platform] = (breakdown[tip.platform] || 0) + tip.tipAmount;
    }
    
    return breakdown;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down agent...');
    
    await this.platformSDK.disconnect();
    await this.paymentProcessor.disconnect();
    
    this.state = AgentState.IDLE;
    this.isInitialized = false;
    logger.info('Agent shutdown complete');
  }
}