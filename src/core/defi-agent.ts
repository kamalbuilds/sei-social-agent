import { EventEmitter } from 'events';
import { z } from 'zod';
import { PlatformSDK } from '../platforms/simple-platform';
import { PaymentProcessor } from '../payments/payment-processor';
import { ContentEvaluator } from '../ai/content-evaluator';
import { SeiDeFiService } from '../blockchain/sei-defi-service';
import { TreasuryManager, TreasuryConfig } from '../treasury/treasury-manager';
import { logger } from '../utils/logger';

export enum AgentState {
  IDLE = 'IDLE',
  MONITORING = 'MONITORING',
  EVALUATING = 'EVALUATING',
  INVESTING = 'INVESTING',
  TIPPING = 'TIPPING',
  TRADING = 'TRADING',
  REBALANCING = 'REBALANCING',
  LEARNING = 'LEARNING'
}

export const InvestmentDecisionSchema = z.object({
  contentId: z.string(),
  platform: z.enum(['twitter', 'discord', 'linkedin']),
  creator: z.string(),
  qualityScore: z.number().min(0).max(100),
  investmentType: z.enum(['tip', 'stake', 'token', 'nft']),
  amount: z.number().positive(),
  expectedReturn: z.number(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
  timestamp: z.date()
});

export type InvestmentDecision = z.infer<typeof InvestmentDecisionSchema>;

export interface CreatorProfile {
  id: string;
  username: string;
  walletAddress?: string;
  platform: string;
  contentQuality: number;
  engagementRate: number;
  totalTipsReceived: number;
  totalStaked: number;
  investmentScore: number;
  hasToken: boolean;
  tokenAddress?: string;
}

interface DeFiAgentConfig {
  // Treasury configuration
  treasury: TreasuryConfig;
  
  // Tipping configuration
  tipping: {
    dailyBudget: number;
    minQualityScore: number;
    maxTipAmount: number;
  };
  
  // Investment configuration
  investment: {
    creatorTokensEnabled: boolean;
    nftRewardsEnabled: boolean;
    stakingEnabled: boolean;
    minInvestmentScore: number;
  };
  
  // Platform configuration
  platforms: string[];
  preferences: {
    topics: string[];
    creators: string[];
    keywords: string[];
  };
}

export class DeFiAgent extends EventEmitter {
  private state: AgentState = AgentState.IDLE;
  private config: DeFiAgentConfig;
  private platformSDK: PlatformSDK;
  private paymentProcessor: PaymentProcessor;
  private contentEvaluator: ContentEvaluator;
  private defiService: SeiDeFiService;
  private treasuryManager: TreasuryManager;
  
  private creatorProfiles: Map<string, CreatorProfile> = new Map();
  private investmentHistory: InvestmentDecision[] = [];
  private dailySpent: number = 0;
  private isInitialized: boolean = false;

  constructor(config: DeFiAgentConfig) {
    super();
    this.config = config;
    
    // Initialize core services
    this.platformSDK = new PlatformSDK(config.platforms);
    this.paymentProcessor = new PaymentProcessor();
    this.contentEvaluator = new ContentEvaluator();
    
    // Initialize DeFi services
    this.defiService = new SeiDeFiService({
      privateKey: process.env.SEI_PRIVATE_KEY!,
      rpcUrl: process.env.SEI_RPC_URL!,
      chainId: process.env.SEI_CHAIN_ID || 'arctic-1'
    });
    
    this.treasuryManager = new TreasuryManager(config.treasury);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    logger.info('Initializing DeFi Agent...');
    
    try {
      // Initialize all services
      await Promise.all([
        this.defiService.initialize(),
        this.treasuryManager.initialize(),
        this.paymentProcessor.initialize(),
        this.platformSDK.connectAll(),
        this.contentEvaluator.loadModels()
      ]);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load creator profiles
      await this.loadCreatorProfiles();
      
      this.state = AgentState.IDLE;
      this.isInitialized = true;
      
      logger.info('DeFi Agent initialized successfully');
      this.emit('initialized', {
        treasury: this.treasuryManager.getMetrics(),
        wallet: this.defiService.getWalletAddress()
      });
    } catch (error) {
      logger.error('Failed to initialize DeFi Agent:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Treasury events
    this.treasuryManager.on('rebalanced', (metrics) => {
      logger.info('Treasury rebalanced:', metrics);
      this.emit('treasuryUpdate', metrics);
    });
    
    this.treasuryManager.on('rewardsHarvested', (rewards) => {
      logger.info('Rewards harvested:', rewards);
      this.reinvestRewards(rewards.total);
    });
    
    // Platform content events
    this.platformSDK.on('newContent', async (content) => {
      await this.processContent(content);
    });
  }

  private async loadCreatorProfiles(): Promise<void> {
    // Load existing creator profiles from storage
    // In production, this would load from a database
    logger.info('Loading creator profiles...');
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

    // Start platform monitoring
    await this.platformSDK.startMonitoring({
      keywords: this.config.preferences.keywords,
      creators: this.config.preferences.creators
    });

    logger.info('Started monitoring social platforms with DeFi features');
  }

  private async processContent(content: any): Promise<void> {
    this.state = AgentState.EVALUATING;
    this.emit('stateChange', this.state);

    try {
      // Evaluate content quality
      const evaluation = await this.contentEvaluator.evaluate(content, {
        topics: this.config.preferences.topics,
        minQuality: this.config.tipping.minQualityScore
      });

      // Get or create creator profile
      const creator = await this.getOrCreateCreatorProfile(content.creator);
      
      // Update creator metrics
      creator.contentQuality = 
        (creator.contentQuality * 0.8) + (evaluation.qualityScore * 0.2);
      
      // Make investment decision
      const decision = await this.makeInvestmentDecision(
        content, 
        evaluation, 
        creator
      );
      
      if (decision) {
        await this.executeInvestment(decision, content, creator);
      }
    } catch (error) {
      logger.error('Error processing content:', error);
    } finally {
      this.state = AgentState.MONITORING;
      this.emit('stateChange', this.state);
    }
  }

  private async getOrCreateCreatorProfile(
    creatorInfo: any
  ): Promise<CreatorProfile> {
    const id = `${creatorInfo.platform}_${creatorInfo.id}`;
    
    if (!this.creatorProfiles.has(id)) {
      const profile: CreatorProfile = {
        id: creatorInfo.id,
        username: creatorInfo.username,
        walletAddress: creatorInfo.walletAddress,
        platform: creatorInfo.platform,
        contentQuality: 50,
        engagementRate: 0,
        totalTipsReceived: 0,
        totalStaked: 0,
        investmentScore: 50,
        hasToken: false
      };
      
      this.creatorProfiles.set(id, profile);
    }
    
    return this.creatorProfiles.get(id)!;
  }

  private async makeInvestmentDecision(
    content: any,
    evaluation: any,
    creator: CreatorProfile
  ): Promise<InvestmentDecision | null> {
    // Calculate investment score
    const investmentScore = this.calculateInvestmentScore(
      evaluation.qualityScore,
      creator.contentQuality,
      creator.engagementRate
    );
    
    creator.investmentScore = investmentScore;
    
    // Skip if below minimum score
    if (investmentScore < this.config.investment.minInvestmentScore) {
      return null;
    }
    
    // Determine investment type based on score and creator status
    let investmentType: 'tip' | 'stake' | 'token' | 'nft';
    let amount: number;
    let expectedReturn: number;
    let riskLevel: 'low' | 'medium' | 'high';
    
    if (investmentScore >= 90 && creator.hasToken) {
      // High quality + has token = buy creator token
      investmentType = 'token';
      amount = this.calculateTokenInvestment(investmentScore);
      expectedReturn = 25; // 25% expected return
      riskLevel = 'medium';
    } else if (investmentScore >= 80 && this.config.investment.stakingEnabled) {
      // Good quality = stake in creator pool
      investmentType = 'stake';
      amount = this.calculateStakeAmount(investmentScore);
      expectedReturn = 12; // 12% APY from staking
      riskLevel = 'low';
    } else if (investmentScore >= 85 && this.config.investment.nftRewardsEnabled) {
      // Exceptional content = mint NFT reward
      investmentType = 'nft';
      amount = 0.1; // NFT minting cost
      expectedReturn = 0; // NFTs are rewards, not investments
      riskLevel = 'low';
    } else {
      // Default to tipping
      investmentType = 'tip';
      amount = this.calculateTipAmount(evaluation.qualityScore);
      expectedReturn = 0; // Tips don't have direct returns
      riskLevel = 'low';
    }
    
    // Check budget constraints
    if (!await this.checkBudget(amount)) {
      return null;
    }
    
    return {
      contentId: content.id,
      platform: content.platform,
      creator: creator.id,
      qualityScore: evaluation.qualityScore,
      investmentType,
      amount,
      expectedReturn,
      riskLevel,
      reason: evaluation.reason,
      timestamp: new Date()
    };
  }

  private calculateInvestmentScore(
    contentQuality: number,
    creatorQuality: number,
    engagementRate: number
  ): number {
    // Weighted scoring: 40% content, 40% creator history, 20% engagement
    return (
      contentQuality * 0.4 +
      creatorQuality * 0.4 +
      engagementRate * 0.2
    );
  }

  private calculateTokenInvestment(score: number): number {
    // Scale investment based on score (90-100 -> 10-100 SEI)
    const base = 10;
    const multiplier = (score - 90) / 10;
    return base + (90 * multiplier);
  }

  private calculateStakeAmount(score: number): number {
    // Scale stake based on score (80-100 -> 5-50 SEI)
    const base = 5;
    const multiplier = (score - 80) / 20;
    return base + (45 * multiplier);
  }

  private calculateTipAmount(qualityScore: number): number {
    const baseAmount = 0.01;
    const maxAmount = Math.min(
      this.config.tipping.maxTipAmount, 
      5.0
    );
    
    const scaleFactor = 
      (qualityScore - this.config.tipping.minQualityScore) / 
      (100 - this.config.tipping.minQualityScore);
    
    return baseAmount + (maxAmount - baseAmount) * scaleFactor;
  }

  private async checkBudget(amount: number): Promise<boolean> {
    // Check daily budget
    if (this.dailySpent + amount > this.config.tipping.dailyBudget) {
      logger.warn('Daily budget would be exceeded');
      return false;
    }
    
    // Check treasury availability
    const canWithdraw = await this.treasuryManager.withdrawForTipping(amount);
    if (!canWithdraw) {
      logger.warn('Insufficient treasury funds');
      return false;
    }
    
    return true;
  }

  private async executeInvestment(
    decision: InvestmentDecision,
    content: any,
    creator: CreatorProfile
  ): Promise<void> {
    this.state = AgentState.INVESTING;
    this.emit('stateChange', this.state);

    try {
      let result: any;
      
      switch (decision.investmentType) {
        case 'tip':
          result = await this.executeTip(decision, content, creator);
          break;
        case 'stake':
          result = await this.executeStaking(decision, creator);
          break;
        case 'token':
          result = await this.executeTokenPurchase(decision, creator);
          break;
        case 'nft':
          result = await this.executeMintNFT(decision, content, creator);
          break;
      }
      
      // Record investment
      this.investmentHistory.push(decision);
      this.dailySpent += decision.amount;
      
      // Update creator profile
      if (decision.investmentType === 'tip') {
        creator.totalTipsReceived += decision.amount;
      } else if (decision.investmentType === 'stake') {
        creator.totalStaked += decision.amount;
      }
      
      this.emit('investmentExecuted', { decision, result });
      
      logger.info(
        `Investment executed: ${decision.investmentType} ` +
        `${decision.amount} SEI to ${creator.username}`
      );
    } catch (error) {
      logger.error('Failed to execute investment:', error);
      this.emit('investmentFailed', { decision, error });
    }
  }

  private async executeTip(
    decision: InvestmentDecision,
    content: any,
    creator: CreatorProfile
  ): Promise<any> {
    // Execute payment
    const payment = await this.paymentProcessor.sendTip({
      recipient: creator.walletAddress || creator.id,
      amount: decision.amount,
      currency: 'SEI',
      memo: `Tip for quality content: ${content.id}`
    });

    // Reply to content with tip confirmation
    await this.platformSDK.replyToContent(content, {
      message: `🎉 You've been tipped ${decision.amount} SEI for this quality content! ` +
               `Your investment score: ${creator.investmentScore.toFixed(0)}/100 ` +
               `Transaction: ${payment.transactionHash.slice(0, 8)}...`
    });

    return payment;
  }

  private async executeStaking(
    decision: InvestmentDecision,
    creator: CreatorProfile
  ): Promise<any> {
    // Stake in creator's pool
    const stakingResult = await this.defiService.stakeTokens(
      'SEI',
      decision.amount.toString(),
      30 // 30 day lock
    );
    
    // Create or update creator staking pool record
    logger.info(
      `Staked ${decision.amount} SEI in ${creator.username}'s pool`
    );
    
    return stakingResult;
  }

  private async executeTokenPurchase(
    decision: InvestmentDecision,
    creator: CreatorProfile
  ): Promise<any> {
    if (!creator.tokenAddress) {
      // Create creator token if it doesn't exist
      creator.tokenAddress = await this.deployCreatorToken(creator);
      creator.hasToken = true;
    }
    
    // Buy creator tokens through Symphony DEX
    const swapResult = await this.defiService.swapTokens({
      tokenIn: 'SEI',
      tokenOut: creator.tokenAddress,
      amountIn: decision.amount.toString(),
      slippage: 2 // 2% slippage
    });
    
    logger.info(
      `Purchased ${creator.username} tokens for ${decision.amount} SEI`
    );
    
    return swapResult;
  }

  private async executeMintNFT(
    decision: InvestmentDecision,
    content: any,
    creator: CreatorProfile
  ): Promise<any> {
    // Mint achievement NFT for creator
    const nftMetadata = {
      name: `Quality Content Award - ${creator.username}`,
      description: `Awarded for exceptional content with score ${decision.qualityScore}`,
      image: `ipfs://...`, // Would upload content snapshot
      attributes: [
        { trait_type: 'Quality Score', value: decision.qualityScore },
        { trait_type: 'Platform', value: content.platform },
        { trait_type: 'Date', value: new Date().toISOString() }
      ]
    };
    
    // In production, would mint actual NFT
    logger.info(`Minted achievement NFT for ${creator.username}`);
    
    return { nftId: `nft_${Date.now()}`, metadata: nftMetadata };
  }

  private async deployCreatorToken(creator: CreatorProfile): Promise<string> {
    // Deploy ERC-20 token for creator
    // In production, would deploy actual contract
    const tokenAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
    
    logger.info(`Deployed token for ${creator.username}: ${tokenAddress}`);
    
    return tokenAddress;
  }

  private async reinvestRewards(amount: number): Promise<void> {
    // Automatically reinvest harvested rewards
    logger.info(`Reinvesting ${amount} SEI in rewards`);
    
    // Find best performing creators
    const topCreators = Array.from(this.creatorProfiles.values())
      .sort((a, b) => b.investmentScore - a.investmentScore)
      .slice(0, 3);
    
    // Distribute rewards among top creators
    const perCreator = amount / topCreators.length;
    
    for (const creator of topCreators) {
      if (creator.hasToken) {
        // Buy more creator tokens
        await this.defiService.swapTokens({
          tokenIn: 'SEI',
          tokenOut: creator.tokenAddress!,
          amountIn: perCreator.toString()
        });
      } else {
        // Stake in creator pool
        await this.defiService.stakeTokens(
          'SEI',
          perCreator.toString(),
          30
        );
      }
    }
  }

  async getAnalytics(): Promise<any> {
    const treasuryMetrics = this.treasuryManager.getMetrics();
    const portfolio = await this.defiService.getPortfolio();
    
    // Calculate creator analytics
    const creatorAnalytics = this.calculateCreatorAnalytics();
    
    // Calculate ROI
    const totalInvested = this.investmentHistory.reduce(
      (sum, inv) => sum + inv.amount, 
      0
    );
    const expectedReturns = this.investmentHistory.reduce(
      (sum, inv) => sum + (inv.amount * inv.expectedReturn / 100), 
      0
    );
    
    return {
      state: this.state,
      treasury: treasuryMetrics,
      portfolio,
      investments: {
        total: this.investmentHistory.length,
        totalAmount: totalInvested,
        expectedReturns,
        byType: this.getInvestmentBreakdown(),
        topCreators: creatorAnalytics.topCreators,
        averageQuality: creatorAnalytics.averageQuality
      },
      performance: {
        dailySpent: this.dailySpent,
        dailyBudget: this.config.tipping.dailyBudget,
        utilizationRate: (this.dailySpent / this.config.tipping.dailyBudget) * 100,
        roi: expectedReturns > 0 ? (expectedReturns / totalInvested) * 100 : 0
      }
    };
  }

  private calculateCreatorAnalytics(): any {
    const creators = Array.from(this.creatorProfiles.values());
    
    const topCreators = creators
      .sort((a, b) => b.investmentScore - a.investmentScore)
      .slice(0, 10)
      .map(c => ({
        username: c.username,
        platform: c.platform,
        score: c.investmentScore,
        totalReceived: c.totalTipsReceived + c.totalStaked,
        hasToken: c.hasToken
      }));
    
    const averageQuality = creators.reduce(
      (sum, c) => sum + c.contentQuality, 
      0
    ) / creators.length || 0;
    
    return { topCreators, averageQuality };
  }

  private getInvestmentBreakdown(): any {
    const breakdown: any = {
      tip: { count: 0, amount: 0 },
      stake: { count: 0, amount: 0 },
      token: { count: 0, amount: 0 },
      nft: { count: 0, amount: 0 }
    };
    
    for (const inv of this.investmentHistory) {
      breakdown[inv.investmentType].count++;
      breakdown[inv.investmentType].amount += inv.amount;
    }
    
    return breakdown;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down DeFi Agent...');
    
    await Promise.all([
      this.platformSDK.disconnect(),
      this.paymentProcessor.disconnect(),
      this.treasuryManager.shutdown(),
      this.defiService.disconnect()
    ]);
    
    this.state = AgentState.IDLE;
    this.isInitialized = false;
    logger.info('DeFi Agent shutdown complete');
  }
}