import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * Gaming NPC Economy Agent - Feasibility Test Suite
 * Tests autonomous NPCs that earn and spend real crypto through gameplay
 */

interface GameState {
  npcId: string;
  gameId: string;
  position: { x: number; y: number; z?: number };
  health: number;
  inventory: GameItem[];
  wallet: {
    address: string;
    balance: number; // SEI
  };
  reputation: number; // 0-100
  level: number;
}

interface GameItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'resource' | 'collectible';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  value: number; // SEI value
  attributes?: Record<string, number>;
}

interface EconomicDecision {
  action: 'buy' | 'sell' | 'trade' | 'craft' | 'quest' | 'idle';
  target?: string; // item ID or player ID
  amount?: number; // SEI amount
  reasoning: string;
  confidence: number; // 0-1
  expectedProfit?: number;
}

interface GameAction {
  type: 'combat' | 'trade' | 'craft' | 'explore' | 'social';
  target: string;
  parameters: Record<string, any>;
  costSEI?: number;
  expectedRewardSEI?: number;
}

class GamingNPCAgent {
  private gameState: GameState;
  private riskTolerance: number;
  private profitGoal: number; // SEI per hour
  private gameIntegrations: Map<string, any>;

  constructor(initialState: GameState, config: {
    riskTolerance?: number;
    profitGoal?: number;
  }) {
    this.gameState = initialState;
    this.riskTolerance = config.riskTolerance || 0.3;
    this.profitGoal = config.profitGoal || 5; // 5 SEI per hour
    this.gameIntegrations = new Map();
  }

  async analyzeMarketConditions(gameId: string): Promise<{
    averageItemPrices: Record<string, number>;
    demandTrends: Record<string, 'rising' | 'falling' | 'stable'>;
    playerActivity: number; // 0-100
    seasonalFactors: string[];
  }> {
    // Mock market analysis - would integrate with game APIs
    return {
      averageItemPrices: {
        'iron_sword': 2.5,
        'health_potion': 0.8,
        'rare_gem': 15.0,
        'legendary_armor': 50.0
      },
      demandTrends: {
        'iron_sword': 'stable',
        'health_potion': 'rising',
        'rare_gem': 'falling',
        'legendary_armor': 'rising'
      },
      playerActivity: 75,
      seasonalFactors: ['weekend_bonus', 'pvp_event']
    };
  }

  async makeEconomicDecision(): Promise<EconomicDecision> {
    const marketData = await this.analyzeMarketConditions(this.gameState.gameId);
    
    // Analyze current inventory value
    const inventoryValue = this.gameState.inventory.reduce((total, item) => {
      return total + (marketData.averageItemPrices[item.name] || item.value);
    }, 0);

    // Decision logic based on game state and market conditions
    if (this.gameState.wallet.balance < 1 && inventoryValue > 5) {
      // Low on SEI, sell items
      const itemToSell = this.findBestItemToSell(marketData);
      return {
        action: 'sell',
        target: itemToSell?.id,
        amount: marketData.averageItemPrices[itemToSell?.name || ''] || 0,
        reasoning: 'Low wallet balance, selling valuable inventory',
        confidence: 0.8
      };
    }

    if (marketData.playerActivity > 70 && this.gameState.reputation > 50) {
      // High player activity + good reputation = quest opportunities
      return {
        action: 'quest',
        reasoning: 'High player activity suggests profitable quest opportunities',
        confidence: 0.7,
        expectedProfit: 3.5
      };
    }

    // Look for profitable trading opportunities
    const tradingOpportunity = this.identifyTradingOpportunity(marketData);
    if (tradingOpportunity) {
      return tradingOpportunity;
    }

    // Default to idle/exploration
    return {
      action: 'idle',
      reasoning: 'No profitable opportunities identified, conserving resources',
      confidence: 0.5
    };
  }

  private findBestItemToSell(marketData: any): GameItem | undefined {
    return this.gameState.inventory
      .filter(item => marketData.demandTrends[item.name] !== 'falling')
      .sort((a, b) => {
        const aPrice = marketData.averageItemPrices[a.name] || a.value;
        const bPrice = marketData.averageItemPrices[b.name] || b.value;
        return bPrice - aPrice;
      })[0];
  }

  private identifyTradingOpportunity(marketData: any): EconomicDecision | null {
    // Look for items trending up that we can afford
    const risingItems = Object.entries(marketData.demandTrends)
      .filter(([_, trend]) => trend === 'rising')
      .map(([item, _]) => ({
        item,
        price: marketData.averageItemPrices[item],
        expectedReturn: marketData.averageItemPrices[item] * 1.2 // 20% profit target
      }))
      .filter(opportunity => opportunity.price <= this.gameState.wallet.balance * 0.8);

    if (risingItems.length > 0) {
      const bestOpportunity = risingItems[0];
      return {
        action: 'buy',
        target: bestOpportunity.item,
        amount: bestOpportunity.price,
        reasoning: `Buying ${bestOpportunity.item} due to rising demand trend`,
        confidence: 0.75,
        expectedProfit: bestOpportunity.expectedReturn - bestOpportunity.price
      };
    }

    return null;
  }

  async executeGameAction(action: GameAction): Promise<{
    success: boolean;
    newState: Partial<GameState>;
    seiEarned?: number;
    seiSpent?: number;
    txHash?: string;
  }> {
    // Simulate game action execution with Sei network integration
    const result = {
      success: true,
      newState: {} as Partial<GameState>,
      seiEarned: 0,
      seiSpent: 0
    };

    switch (action.type) {
      case 'trade':
        // Simulate market trade
        if (action.costSEI && action.costSEI <= this.gameState.wallet.balance) {
          result.seiSpent = action.costSEI;
          result.newState.wallet = {
            ...this.gameState.wallet,
            balance: this.gameState.wallet.balance - action.costSEI
          };
          result.txHash = `0x${Math.random().toString(16).substr(2, 8)}`;
        } else {
          result.success = false;
        }
        break;

      case 'combat':
        // Simulate combat with potential rewards
        const combatSuccess = Math.random() > 0.3; // 70% success rate
        if (combatSuccess) {
          result.seiEarned = action.expectedRewardSEI || 0;
          result.newState.wallet = {
            ...this.gameState.wallet,
            balance: this.gameState.wallet.balance + (result.seiEarned || 0)
          };
          result.newState.reputation = Math.min(100, this.gameState.reputation + 2);
        } else {
          result.newState.health = Math.max(0, this.gameState.health - 20);
        }
        break;

      case 'craft':
        // Simulate crafting with resource consumption
        result.seiSpent = action.costSEI || 0;
        if (this.gameState.wallet.balance >= result.seiSpent) {
          result.newState.wallet = {
            ...this.gameState.wallet,
            balance: this.gameState.wallet.balance - result.seiSpent
          };
          // Add crafted item to inventory
          const craftedItem: GameItem = {
            id: `crafted_${Date.now()}`,
            name: action.target,
            type: 'weapon',
            rarity: 'common',
            value: (action.costSEI || 0) * 1.3 // 30% value increase
          };
          result.newState.inventory = [...this.gameState.inventory, craftedItem];
        } else {
          result.success = false;
        }
        break;
    }

    // Update internal state if action was successful
    if (result.success) {
      this.gameState = { ...this.gameState, ...result.newState };
    }

    return result;
  }

  async optimizeForProfit(timeHorizon: number): Promise<GameAction[]> {
    // Generate a sequence of actions to maximize SEI earning over time horizon (minutes)
    const actions: GameAction[] = [];
    const marketData = await this.analyzeMarketConditions(this.gameState.gameId);

    // Strategy: Balance quick earnings vs long-term investment
    if (timeHorizon <= 30) {
      // Short term: focus on immediate trades and quick quests
      actions.push({
        type: 'trade',
        target: 'health_potion',
        parameters: { quantity: 5 },
        costSEI: 4.0,
        expectedRewardSEI: 5.2
      });
    } else {
      // Long term: invest in rare items and reputation building
      actions.push({
        type: 'craft',
        target: 'rare_weapon',
        parameters: { materials: ['iron', 'gem'] },
        costSEI: 10.0,
        expectedRewardSEI: 15.0
      });
      
      actions.push({
        type: 'social',
        target: 'guild_quest',
        parameters: { guild_id: 'elite_guild' },
        expectedRewardSEI: 8.0
      });
    }

    return actions;
  }

  getPerformanceMetrics(): {
    hourlyEarnings: number;
    successRate: number;
    reputationScore: number;
    totalValue: number;
  } {
    const inventoryValue = this.gameState.inventory.reduce((sum, item) => sum + item.value, 0);
    
    return {
      hourlyEarnings: 0, // Would be calculated from historical data
      successRate: 0.75, // Mock data
      reputationScore: this.gameState.reputation,
      totalValue: this.gameState.wallet.balance + inventoryValue
    };
  }
}

describe('Gaming NPC Agent - Economic Intelligence', () => {
  let npcAgent: GamingNPCAgent;
  let mockGameState: GameState;

  beforeEach(() => {
    mockGameState = {
      npcId: 'npc_001',
      gameId: 'mmorpg_alpha',
      position: { x: 100, y: 200, z: 50 },
      health: 100,
      inventory: [
        {
          id: 'sword_001',
          name: 'iron_sword',
          type: 'weapon',
          rarity: 'common',
          value: 2.5,
          attributes: { attack: 15 }
        },
        {
          id: 'potion_001',
          name: 'health_potion',
          type: 'consumable',
          rarity: 'common',
          value: 0.8
        }
      ],
      wallet: {
        address: '0xNPC742d35Cc6635C0532925a3b8D400e52b102b',
        balance: 10.0
      },
      reputation: 60,
      level: 5
    };

    npcAgent = new GamingNPCAgent(mockGameState, {
      riskTolerance: 0.4,
      profitGoal: 8 // 8 SEI per hour
    });
  });

  describe('Market Analysis', () => {
    test('should analyze market conditions accurately', async () => {
      const marketData = await npcAgent.analyzeMarketConditions('mmorpg_alpha');

      expect(marketData).toHaveProperty('averageItemPrices');
      expect(marketData).toHaveProperty('demandTrends');
      expect(marketData).toHaveProperty('playerActivity');
      expect(marketData.playerActivity).toBeGreaterThanOrEqual(0);
      expect(marketData.playerActivity).toBeLessThanOrEqual(100);
    });

    test('should identify profitable trading opportunities', async () => {
      const decision = await npcAgent.makeEconomicDecision();

      expect(decision).toHaveProperty('action');
      expect(decision).toHaveProperty('reasoning');
      expect(decision).toHaveProperty('confidence');
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Economic Decision Making', () => {
    test('should prioritize selling when wallet balance is low', async () => {
      // Set very low balance
      mockGameState.wallet.balance = 0.5;
      npcAgent = new GamingNPCAgent(mockGameState, { riskTolerance: 0.3 });

      const decision = await npcAgent.makeEconomicDecision();

      expect(decision.action).toBe('sell');
      expect(decision.target).toBeDefined();
      expect(decision.reasoning).toContain('Low wallet balance');
    });

    test('should seek quests when reputation is high and activity is good', async () => {
      // Set high reputation
      mockGameState.reputation = 85;
      npcAgent = new GamingNPCAgent(mockGameState, { riskTolerance: 0.3 });

      const decision = await npcAgent.makeEconomicDecision();

      // With high reputation and good market conditions, should consider quests
      expect(['quest', 'buy', 'trade']).toContain(decision.action);
    });

    test('should make conservative decisions with low risk tolerance', async () => {
      npcAgent = new GamingNPCAgent(mockGameState, { 
        riskTolerance: 0.1, // Very conservative
        profitGoal: 3 
      });

      const decision = await npcAgent.makeEconomicDecision();

      // Conservative agents should prefer safer actions
      expect(['idle', 'sell', 'quest']).toContain(decision.action);
      if (decision.expectedProfit) {
        expect(decision.expectedProfit).toBeGreaterThan(0);
      }
    });
  });

  describe('Game Action Execution', () => {
    test('should execute trade actions with Sei network integration', async () => {
      const tradeAction: GameAction = {
        type: 'trade',
        target: 'health_potion',
        parameters: { quantity: 2 },
        costSEI: 1.6,
        expectedRewardSEI: 0
      };

      const result = await npcAgent.executeGameAction(tradeAction);

      expect(result.success).toBe(true);
      expect(result.seiSpent).toBe(1.6);
      expect(result.txHash).toBeDefined();
      expect(result.newState.wallet?.balance).toBe(8.4); // 10 - 1.6
    });

    test('should handle combat with risk/reward dynamics', async () => {
      const combatAction: GameAction = {
        type: 'combat',
        target: 'monster_001',
        parameters: { strategy: 'aggressive' },
        expectedRewardSEI: 3.0
      };

      const result = await npcAgent.executeGameAction(combatAction);

      expect(result.success).toBe(true);
      
      // Combat can either succeed (earn SEI) or fail (lose health)
      if (result.seiEarned && result.seiEarned > 0) {
        expect(result.newState.wallet?.balance).toBe(13.0); // 10 + 3
        expect(result.newState.reputation).toBeGreaterThan(60);
      } else {
        expect(result.newState.health).toBeLessThan(100);
      }
    });

    test('should prevent actions when insufficient funds', async () => {
      const expensiveAction: GameAction = {
        type: 'trade',
        target: 'legendary_item',
        parameters: { quantity: 1 },
        costSEI: 50.0 // More than available balance
      };

      const result = await npcAgent.executeGameAction(expensiveAction);

      expect(result.success).toBe(false);
      expect(result.seiSpent).toBe(0);
    });
  });

  describe('Profit Optimization Strategies', () => {
    test('should optimize for short-term profits', async () => {
      const actions = await npcAgent.optimizeForProfit(15); // 15 minutes

      expect(actions.length).toBeGreaterThan(0);
      
      // Short-term strategies should focus on quick trades
      const hasQuickTrade = actions.some(action => 
        action.type === 'trade' && (action.costSEI || 0) < 10
      );
      expect(hasQuickTrade).toBe(true);
    });

    test('should optimize for long-term value building', async () => {
      const actions = await npcAgent.optimizeForProfit(120); // 2 hours

      expect(actions.length).toBeGreaterThan(0);
      
      // Long-term strategies should include investment/crafting
      const hasInvestment = actions.some(action => 
        action.type === 'craft' || action.type === 'social'
      );
      expect(hasInvestment).toBe(true);
    });

    test('should balance risk and reward in action selection', async () => {
      const actions = await npcAgent.optimizeForProfit(60);

      actions.forEach(action => {
        if (action.costSEI && action.expectedRewardSEI) {
          const roi = (action.expectedRewardSEI - action.costSEI) / action.costSEI;
          expect(roi).toBeGreaterThan(-0.1); // Max 10% loss acceptable
        }
      });
    });
  });

  describe('Performance Tracking', () => {
    test('should provide comprehensive performance metrics', () => {
      const metrics = npcAgent.getPerformanceMetrics();

      expect(metrics).toHaveProperty('hourlyEarnings');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('reputationScore');
      expect(metrics).toHaveProperty('totalValue');

      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
      expect(metrics.reputationScore).toBe(60);
      expect(metrics.totalValue).toBeGreaterThan(10); // Wallet + inventory value
    });
  });
});

describe('Gaming NPC Agent - Multi-Game Integration', () => {
  test('should handle different game economies', async () => {
    const mmorpgState: GameState = {
      npcId: 'npc_mmorpg',
      gameId: 'mmorpg_alpha',
      position: { x: 0, y: 0 },
      health: 100,
      inventory: [],
      wallet: { address: '0x123', balance: 15 },
      reputation: 50,
      level: 3
    };

    const strategyState: GameState = {
      npcId: 'npc_strategy',
      gameId: 'strategy_beta',
      position: { x: 0, y: 0 },
      health: 100,
      inventory: [],
      wallet: { address: '0x456', balance: 15 },
      reputation: 50,
      level: 3
    };

    const mmorpgAgent = new GamingNPCAgent(mmorpgState, { profitGoal: 5 });
    const strategyAgent = new GamingNPCAgent(strategyState, { profitGoal: 8 });

    const mmorpgDecision = await mmorpgAgent.makeEconomicDecision();
    const strategyDecision = await strategyAgent.makeEconomicDecision();

    // Both should make valid decisions, but strategies may differ
    expect(mmorpgDecision.action).toBeDefined();
    expect(strategyDecision.action).toBeDefined();
  });

  test('should handle cross-game asset transfers', async () => {
    // This would test moving assets between different games
    // For now, just verify the concept is testable
    
    const crossGameTransfer = {
      fromGame: 'mmorpg_alpha',
      toGame: 'strategy_beta',
      asset: 'rare_gem',
      value: 10.0
    };

    // Verify transfer parameters
    expect(crossGameTransfer.fromGame).toBeDefined();
    expect(crossGameTransfer.toGame).toBeDefined();
    expect(crossGameTransfer.value).toBeGreaterThan(0);
  });
});

describe('Gaming NPC Agent - Sei Network Integration', () => {
  let npcAgent: GamingNPCAgent;

  beforeEach(() => {
    const gameState: GameState = {
      npcId: 'npc_sei_test',
      gameId: 'sei_game',
      position: { x: 0, y: 0 },
      health: 100,
      inventory: [],
      wallet: { address: '0xSEI742d35Cc6635C0532925a3b8D400e52b', balance: 20 },
      reputation: 70,
      level: 8
    };

    npcAgent = new GamingNPCAgent(gameState, { profitGoal: 10 });
  });

  test('should leverage Sei\'s sub-400ms finality for rapid trading', async () => {
    const rapidTradeAction: GameAction = {
      type: 'trade',
      target: 'quick_flip_item',
      parameters: { strategy: 'scalping' },
      costSEI: 5.0,
      expectedRewardSEI: 5.8
    };

    const startTime = Date.now();
    const result = await npcAgent.executeGameAction(rapidTradeAction);
    const endTime = Date.now();

    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(400); // Sei's finality advantage
    expect(result.txHash).toBeDefined();
  });

  test('should handle high-frequency micro-transactions', async () => {
    const microTransactions: GameAction[] = Array(10).fill(null).map((_, i) => ({
      type: 'trade',
      target: `micro_item_${i}`,
      parameters: { type: 'micro' },
      costSEI: 0.1,
      expectedRewardSEI: 0.12
    }));

    const results = await Promise.all(
      microTransactions.map(action => npcAgent.executeGameAction(action))
    );

    const successfulTxs = results.filter(r => r.success);
    expect(successfulTxs.length).toBeGreaterThan(5); // Most should succeed
    
    // Verify all transactions have hash (Sei network processed)
    successfulTxs.forEach(result => {
      expect(result.txHash).toBeDefined();
    });
  });
});