import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { DeFiAgent } from './core/defi-agent';
import { logger } from './utils/logger';

const app = express();
app.use(express.json());

// Initialize agent with DeFi configuration
const agent = new DeFiAgent({
  // Treasury configuration for DeFi operations
  treasury: {
    initialBalance: parseFloat(process.env.INITIAL_BALANCE || '100'),
    targetAPY: parseFloat(process.env.TARGET_APY || '15'),
    riskTolerance: (process.env.RISK_TOLERANCE || 'moderate') as 'conservative' | 'moderate' | 'aggressive',
    allocationStrategy: {
      tipping: parseInt(process.env.ALLOCATION_TIPPING || '40'),
      lending: parseInt(process.env.ALLOCATION_LENDING || '20'),
      staking: parseInt(process.env.ALLOCATION_STAKING || '20'),
      trading: parseInt(process.env.ALLOCATION_TRADING || '10'),
      liquidity: parseInt(process.env.ALLOCATION_LIQUIDITY || '10')
    },
    rebalancePeriod: parseInt(process.env.REBALANCE_PERIOD || '24')
  },
  
  // Tipping configuration
  tipping: {
    dailyBudget: parseFloat(process.env.DAILY_BUDGET || '10'),
    minQualityScore: parseInt(process.env.MIN_QUALITY_SCORE || '70'),
    maxTipAmount: parseFloat(process.env.MAX_TIP_AMOUNT || '1')
  },
  
  // Investment features
  investment: {
    creatorTokensEnabled: process.env.ENABLE_CREATOR_TOKENS === 'true',
    nftRewardsEnabled: process.env.ENABLE_NFT_REWARDS === 'true',
    stakingEnabled: process.env.ENABLE_STAKING !== 'false',
    minInvestmentScore: parseInt(process.env.MIN_INVESTMENT_SCORE || '75')
  },
  
  // Platform configuration
  platforms: (process.env.PLATFORMS || 'twitter').split(','),
  
  // Content preferences
  preferences: {
    topics: (process.env.TOPICS || 'sei,blockchain,web3,defi,ai').split(','),
    creators: (process.env.FAVORITE_CREATORS || '').split(',').filter(Boolean),
    keywords: (process.env.KEYWORDS || '#sei,#defi,#web3').split(',')
  }
});

// API endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    agent: 'social-tipping',
    timestamp: new Date().toISOString()
  });
});

app.get('/stats', async (req, res) => {
  try {
    const analytics = await agent.getAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/treasury', async (req, res) => {
  try {
    const treasury = await agent.getAnalytics();
    res.json(treasury.treasury);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/tip', async (req, res) => {
  // Manual tip endpoint for testing
  res.json({ message: 'Manual tipping endpoint - coming soon' });
});

// Reset daily budget at midnight
cron.schedule('0 0 * * *', () => {
  logger.info('Daily budget reset triggered');
  // Agent handles this internally
});

// Start server and agent
async function start() {
  try {
    // Initialize agent
    await agent.initialize();
    
    // Start monitoring social platforms (optional - can be triggered manually)
    if (process.env.AUTO_START === 'true') {
      await agent.startMonitoring();
    }
    
    // Start API server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Social Tipping Agent API running on port ${PORT}`);
      logger.info('Configuration:');
      logger.info(`- Daily Budget: ${process.env.DAILY_BUDGET || '10'} SEI`);
      logger.info(`- Min Quality Score: ${process.env.MIN_QUALITY_SCORE || '70'}`);
      logger.info(`- Platforms: ${process.env.PLATFORMS || 'twitter'}`);
      logger.info(`- Auto-start: ${process.env.AUTO_START || 'false'}`);
    });

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await agent.shutdown();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start agent:', error);
    process.exit(1);
  }
}

// Event listeners for agent state changes
agent.on('stateChange', (state) => {
  logger.info(`Agent state changed to: ${state}`);
});

agent.on('investmentExecuted', (data) => {
  const { decision } = data;
  logger.info(`Investment: ${decision.investmentType} ${decision.amount} SEI to ${decision.creator} (Score: ${decision.qualityScore})`);
});

agent.on('treasuryUpdate', (metrics) => {
  logger.info(`Treasury: ${metrics.totalValue.toFixed(2)} SEI @ ${metrics.totalAPY.toFixed(2)}% APY`);
});

agent.on('investmentFailed', ({ decision, error }) => {
  logger.error(`Failed investment for ${decision.creator}:`, error);
});

// Start the agent
start().catch(console.error);