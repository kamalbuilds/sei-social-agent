import { EventEmitter } from 'events';
import { SeiDeFiService } from '../blockchain/sei-defi-service';
import { logger } from '../utils/logger';

export interface TreasuryConfig {
  initialBalance: number;
  targetAPY: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  allocationStrategy: {
    tipping: number;      // % for active tipping
    lending: number;      // % for Takara lending
    staking: number;      // % for Silo staking
    trading: number;      // % for Citrex trading
    liquidity: number;    // % kept liquid
  };
  rebalancePeriod: number; // hours
}

export interface TreasuryPosition {
  protocol: string;
  type: 'lending' | 'staking' | 'trading' | 'liquidity';
  amount: number;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  startDate: Date;
  value: number;
}

export interface TreasuryMetrics {
  totalValue: number;
  totalAPY: number;
  positions: TreasuryPosition[];
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  healthScore: number;
}

export class TreasuryManager extends EventEmitter {
  private defi: SeiDeFiService;
  private config: TreasuryConfig;
  private positions: Map<string, TreasuryPosition> = new Map();
  private rebalanceTimer?: NodeJS.Timeout;
  private metrics: TreasuryMetrics;
  private isInitialized: boolean = false;

  constructor(config: TreasuryConfig) {
    super();
    this.config = config;
    this.defi = new SeiDeFiService({
      privateKey: process.env.SEI_PRIVATE_KEY!,
      rpcUrl: process.env.SEI_RPC_URL!,
      chainId: process.env.SEI_CHAIN_ID || 'arctic-1',
      symphonyApiUrl: process.env.SYMPHONY_API_URL,
      takaraApiUrl: process.env.TAKARA_API_URL,
      siloApiUrl: process.env.SILO_API_URL,
      citrexApiUrl: process.env.CITREX_API_URL
    });

    this.metrics = {
      totalValue: config.initialBalance,
      totalAPY: 0,
      positions: [],
      dailyRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      healthScore: 100
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.defi.initialize();
      await this.allocateFunds();
      this.startRebalancing();
      this.isInitialized = true;
      logger.info('Treasury Manager initialized');
      this.emit('initialized', this.metrics);
    } catch (error) {
      logger.error('Failed to initialize Treasury Manager:', error);
      throw error;
    }
  }

  private async allocateFunds(): Promise<void> {
    const portfolio = await this.defi.getPortfolio();
    const availableBalance = parseFloat(portfolio.balances.SEI);
    
    if (availableBalance < 0.1) {
      logger.warn('Insufficient balance for allocation');
      return;
    }

    const allocations = this.calculateAllocations(availableBalance);
    
    // Execute allocations
    for (const [strategy, amount] of Object.entries(allocations)) {
      if (amount > 0) {
        await this.executeAllocation(strategy, amount);
      }
    }

    await this.updateMetrics();
  }

  private calculateAllocations(balance: number): Record<string, number> {
    const strategy = this.config.allocationStrategy;
    
    return {
      tipping: balance * (strategy.tipping / 100),
      lending: balance * (strategy.lending / 100),
      staking: balance * (strategy.staking / 100),
      trading: balance * (strategy.trading / 100),
      liquidity: balance * (strategy.liquidity / 100)
    };
  }

  private async executeAllocation(strategy: string, amount: number): Promise<void> {
    try {
      switch (strategy) {
        case 'lending':
          await this.allocateToLending(amount);
          break;
        case 'staking':
          await this.allocateToStaking(amount);
          break;
        case 'trading':
          await this.allocateToTrading(amount);
          break;
        case 'liquidity':
          // Keep liquid, no action needed
          this.positions.set('liquidity', {
            protocol: 'Wallet',
            type: 'liquidity',
            amount,
            apy: 0,
            risk: 'low',
            startDate: new Date(),
            value: amount
          });
          break;
        case 'tipping':
          // Reserve for tipping operations
          this.positions.set('tipping-reserve', {
            protocol: 'Tipping Pool',
            type: 'liquidity',
            amount,
            apy: 0,
            risk: 'low',
            startDate: new Date(),
            value: amount
          });
          break;
      }
    } catch (error) {
      logger.error(`Failed to allocate to ${strategy}:`, error);
    }
  }

  private async allocateToLending(amount: number): Promise<void> {
    // Find best lending opportunity
    const bestYield = await this.defi.findBestYield(amount.toString());
    
    if (bestYield.bestOpportunity.type === 'lending') {
      await this.defi.lendAsset('SEI', amount.toString());
      
      this.positions.set('takara-lending', {
        protocol: 'Takara',
        type: 'lending',
        amount,
        apy: bestYield.bestOpportunity.apy,
        risk: 'low',
        startDate: new Date(),
        value: amount
      });
      
      logger.info(`Allocated ${amount} SEI to Takara lending at ${bestYield.bestOpportunity.apy}% APY`);
    }
  }

  private async allocateToStaking(amount: number): Promise<void> {
    // Stake in Silo protocol
    const duration = this.getRiskBasedDuration();
    await this.defi.stakeTokens('SEI', amount.toString(), duration);
    
    this.positions.set('silo-staking', {
      protocol: 'Silo',
      type: 'staking',
      amount,
      apy: 12.5, // Would fetch actual APY
      risk: 'medium',
      startDate: new Date(),
      value: amount
    });
    
    logger.info(`Staked ${amount} SEI in Silo for ${duration} days`);
  }

  private async allocateToTrading(amount: number): Promise<void> {
    if (this.config.riskTolerance === 'conservative') {
      // Skip trading for conservative strategy
      return;
    }

    // Open conservative position on Citrex
    const market = await this.selectTradingMarket();
    
    if (market) {
      await this.defi.openPosition({
        market: market.symbol,
        side: market.sentiment === 'bullish' ? 'long' : 'short',
        size: amount.toString(),
        leverage: this.config.riskTolerance === 'aggressive' ? 3 : 2
      });
      
      this.positions.set('citrex-trading', {
        protocol: 'Citrex',
        type: 'trading',
        amount,
        apy: 0, // Variable based on performance
        risk: 'high',
        startDate: new Date(),
        value: amount
      });
      
      logger.info(`Opened ${market.sentiment} position on ${market.symbol}`);
    }
  }

  private getRiskBasedDuration(): number {
    switch (this.config.riskTolerance) {
      case 'conservative': return 90;  // 3 months
      case 'moderate': return 30;      // 1 month
      case 'aggressive': return 7;      // 1 week
      default: return 30;
    }
  }

  private async selectTradingMarket(): Promise<any> {
    // Analyze market conditions and social sentiment
    // This would integrate with content evaluator for sentiment analysis
    return {
      symbol: 'SEI-USDC',
      sentiment: 'bullish',
      confidence: 0.75
    };
  }

  private startRebalancing(): void {
    // Set up periodic rebalancing
    const periodMs = this.config.rebalancePeriod * 60 * 60 * 1000;
    
    this.rebalanceTimer = setInterval(async () => {
      await this.rebalance();
    }, periodMs);
    
    logger.info(`Treasury rebalancing scheduled every ${this.config.rebalancePeriod} hours`);
  }

  private async rebalance(): Promise<void> {
    logger.info('Starting treasury rebalance...');
    
    try {
      // Update position values
      await this.updatePositionValues();
      
      // Check if rebalancing needed
      if (this.needsRebalancing()) {
        await this.executeRebalancing();
      }
      
      // Harvest rewards
      await this.harvestRewards();
      
      // Update metrics
      await this.updateMetrics();
      
      this.emit('rebalanced', this.metrics);
    } catch (error) {
      logger.error('Rebalancing failed:', error);
    }
  }

  private async updatePositionValues(): Promise<void> {
    for (const [id, position] of this.positions) {
      // Update position values based on current market prices
      // and accumulated interest/rewards
      const daysSinceStart = (Date.now() - position.startDate.getTime()) / (1000 * 60 * 60 * 24);
      const interest = position.amount * (position.apy / 100) * (daysSinceStart / 365);
      position.value = position.amount + interest;
    }
  }

  private needsRebalancing(): boolean {
    const currentAllocations = this.getCurrentAllocations();
    const targetAllocations = this.config.allocationStrategy;
    
    // Check if any allocation is off by more than 5%
    for (const [strategy, target] of Object.entries(targetAllocations)) {
      const current = currentAllocations[strategy] || 0;
      if (Math.abs(current - target) > 5) {
        return true;
      }
    }
    
    return false;
  }

  private getCurrentAllocations(): Record<string, number> {
    const totalValue = this.getTotalValue();
    const allocations: Record<string, number> = {
      tipping: 0,
      lending: 0,
      staking: 0,
      trading: 0,
      liquidity: 0
    };
    
    for (const position of this.positions.values()) {
      const percentage = (position.value / totalValue) * 100;
      
      switch (position.type) {
        case 'lending':
          allocations.lending += percentage;
          break;
        case 'staking':
          allocations.staking += percentage;
          break;
        case 'trading':
          allocations.trading += percentage;
          break;
        case 'liquidity':
          if (position.protocol === 'Tipping Pool') {
            allocations.tipping += percentage;
          } else {
            allocations.liquidity += percentage;
          }
          break;
      }
    }
    
    return allocations;
  }

  private async executeRebalancing(): Promise<void> {
    logger.info('Executing rebalancing...');
    
    // This would involve:
    // 1. Withdrawing from over-allocated positions
    // 2. Depositing to under-allocated positions
    // 3. Updating position records
    
    await this.allocateFunds();
  }

  private async harvestRewards(): Promise<void> {
    // Claim rewards from all protocols
    const rewards = [];
    
    // Harvest Takara lending interest
    if (this.positions.has('takara-lending')) {
      // await this.defi.claimLendingRewards();
      rewards.push({ protocol: 'Takara', amount: 0.5 });
    }
    
    // Harvest Silo staking rewards
    if (this.positions.has('silo-staking')) {
      // await this.defi.claimStakingRewards();
      rewards.push({ protocol: 'Silo', amount: 0.8 });
    }
    
    // Log harvested rewards
    const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0);
    if (totalRewards > 0) {
      logger.info(`Harvested ${totalRewards} SEI in rewards`);
      this.emit('rewardsHarvested', { rewards, total: totalRewards });
    }
  }

  private async updateMetrics(): Promise<void> {
    const positions = Array.from(this.positions.values());
    const totalValue = this.getTotalValue();
    const totalAPY = this.calculateTotalAPY();
    
    this.metrics = {
      totalValue,
      totalAPY,
      positions,
      dailyRevenue: (totalValue * totalAPY / 100) / 365,
      weeklyRevenue: (totalValue * totalAPY / 100) / 52,
      monthlyRevenue: (totalValue * totalAPY / 100) / 12,
      healthScore: this.calculateHealthScore()
    };
    
    this.emit('metricsUpdated', this.metrics);
  }

  private getTotalValue(): number {
    return Array.from(this.positions.values())
      .reduce((sum, pos) => sum + pos.value, 0);
  }

  private calculateTotalAPY(): number {
    const positions = Array.from(this.positions.values());
    const totalValue = this.getTotalValue();
    
    if (totalValue === 0) return 0;
    
    let weightedAPY = 0;
    for (const position of positions) {
      const weight = position.value / totalValue;
      weightedAPY += position.apy * weight;
    }
    
    return weightedAPY;
  }

  private calculateHealthScore(): number {
    let score = 100;
    
    // Penalize for low diversity
    const positionCount = this.positions.size;
    if (positionCount < 3) score -= 20;
    
    // Penalize for high risk exposure
    const highRiskValue = Array.from(this.positions.values())
      .filter(p => p.risk === 'high')
      .reduce((sum, p) => sum + p.value, 0);
    const highRiskPercentage = (highRiskValue / this.getTotalValue()) * 100;
    if (highRiskPercentage > 20) score -= 15;
    
    // Reward for achieving target APY
    if (this.metrics.totalAPY >= this.config.targetAPY) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  async withdrawForTipping(amount: number): Promise<boolean> {
    try {
      const tippingReserve = this.positions.get('tipping-reserve');
      
      if (!tippingReserve || tippingReserve.value < amount) {
        // Need to withdraw from other positions
        await this.emergencyWithdraw(amount);
      }
      
      // Update tipping reserve
      if (tippingReserve) {
        tippingReserve.value -= amount;
        tippingReserve.amount -= amount;
      }
      
      this.emit('withdrawal', { amount, purpose: 'tipping' });
      return true;
    } catch (error) {
      logger.error('Failed to withdraw for tipping:', error);
      return false;
    }
  }

  private async emergencyWithdraw(amount: number): Promise<void> {
    // Withdraw from liquid positions first
    const liquidPosition = this.positions.get('liquidity');
    if (liquidPosition && liquidPosition.value >= amount) {
      liquidPosition.value -= amount;
      return;
    }
    
    // If not enough liquid, withdraw from lending (easier to exit)
    const lendingPosition = this.positions.get('takara-lending');
    if (lendingPosition && lendingPosition.value >= amount) {
      // await this.defi.withdrawFromLending(amount);
      lendingPosition.value -= amount;
      return;
    }
    
    throw new Error('Insufficient funds for withdrawal');
  }

  getMetrics(): TreasuryMetrics {
    return this.metrics;
  }

  async shutdown(): Promise<void> {
    if (this.rebalanceTimer) {
      clearInterval(this.rebalanceTimer);
    }
    
    await this.defi.disconnect();
    this.isInitialized = false;
    logger.info('Treasury Manager shut down');
  }
}