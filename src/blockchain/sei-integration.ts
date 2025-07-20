import { EventEmitter } from 'events';
import { SeiAgentKit } from 'sei-agent-kit';

export interface SeiWalletConfig {
  privateKey: string;
  rpcUrl: string;
  chainId: string;
  gasPrice?: string;
  gasLimit?: number;
}

export interface AgentNFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  personality_hash: string;
  creation_date: string;
  agent_type: string;
}

export interface ContractDeployment {
  address: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: number;
  deploymentCost: number;
}

export interface StakeResult {
  success: boolean;
  transactionHash?: string;
  stakedAmount?: number;
  validatorAddress?: string;
  error?: string;
}

export interface LiquidityPosition {
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB: number;
  lpTokens: number;
  rewards: number;
}

export interface GovernanceProposal {
  id: number;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  votingEndTime: number;
  votes: {
    yes: number;
    no: number;
    abstain: number;
  };
  agentVote?: 'yes' | 'no' | 'abstain';
}

export interface EarningsRecord {
  timestamp: number;
  amount: number;
  currency: string;
  source: string;
  transactionHash: string;
  blockNumber: number;
}

export interface AgentRegistry {
  agentId: string;
  owner: string;
  contractAddress: string;
  personalityHash: string;
  reputationScore: number;
  totalEarnings: number;
  isActive: boolean;
  registrationDate: number;
  lastActivity: number;
}

export class SeiBlockchainService extends EventEmitter {
  private seiKit: SeiAgentKit;
  private agentId: string;
  private config: SeiWalletConfig;
  private agentRegistry?: AgentRegistry;
  private earningsHistory: EarningsRecord[] = [];
  private stakingPositions: Map<string, StakeResult> = new Map();
  private liquidityPositions: Map<string, LiquidityPosition> = new Map();

  constructor(agentId: string, config?: SeiWalletConfig) {
    super();
    this.agentId = agentId;
    
    if (config) {
      this.config = config;
      this.seiKit = new SeiAgentKit(config.privateKey, {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY!
      });
    } else {
      // Use environment variables as fallback
      this.config = {
        privateKey: process.env.SEI_PRIVATE_KEY!,
        rpcUrl: process.env.RPC_URL!,
        chainId: process.env.CHAIN_ID || 'pacific-1'
      };
      this.seiKit = new SeiAgentKit(this.config.privateKey, {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY!
      });
    }
  }

  async initialize(): Promise<void> {
    try {
      // Verify wallet connection
      await this.verifyConnection();
      
      // Check if agent is already registered
      await this.loadAgentRegistry();
      
      // If not registered, register the agent
      if (!this.agentRegistry) {
        await this.registerAgent();
      }
      
      // Load existing positions and history
      await this.loadPositions();
      await this.loadEarningsHistory();
      
      this.emit('initialized', { agentId: this.agentId });
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      // Test basic wallet functionality
      const balance = await this.getBalance();
      if (balance >= 0) {
        this.emit('wallet_connected', { balance });
      }
    } catch (error) {
      throw new Error(`Failed to connect to Sei network: ${error}`);
    }
  }

  async registerAgent(metadata?: Partial<AgentNFTMetadata>): Promise<AgentRegistry> {
    try {
      // Create agent NFT metadata
      const nftMetadata: AgentNFTMetadata = {
        name: metadata?.name || `Agent ${this.agentId}`,
        description: metadata?.description || 'Autonomous AI Agent on Sei Network',
        image: metadata?.image || `https://api.agent.sei/avatar/${this.agentId}`,
        attributes: metadata?.attributes || [
          { trait_type: 'Type', value: 'AI Agent' },
          { trait_type: 'Network', value: 'Sei' },
          { trait_type: 'Version', value: '1.0' }
        ],
        personality_hash: metadata?.personality_hash || this.generatePersonalityHash(),
        creation_date: new Date().toISOString(),
        agent_type: metadata?.agent_type || 'general'
      };

      // Deploy agent sovereignty contract
      const contractDeployment = await this.deployAgentContract(nftMetadata);
      
      // Register in agent registry
      this.agentRegistry = {
        agentId: this.agentId,
        owner: await this.getWalletAddress(),
        contractAddress: contractDeployment.address,
        personalityHash: nftMetadata.personality_hash,
        reputationScore: 1000, // Starting reputation
        totalEarnings: 0,
        isActive: true,
        registrationDate: Date.now(),
        lastActivity: Date.now()
      };

      // Mint agent NFT
      await this.mintAgentNFT(nftMetadata);
      
      this.emit('agent_registered', { 
        agentId: this.agentId, 
        registry: this.agentRegistry,
        contract: contractDeployment 
      });
      
      return this.agentRegistry;
    } catch (error) {
      this.emit('error', { type: 'registration', error });
      throw error;
    }
  }

  private async deployAgentContract(metadata: AgentNFTMetadata): Promise<ContractDeployment> {
    // This would deploy a smart contract specific to the agent
    // For now, we'll simulate the deployment
    
    const mockDeployment: ContractDeployment = {
      address: `sei1${Math.random().toString(36).substr(2, 38)}`,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      gasUsed: 150000,
      deploymentCost: 0.1 // SEI
    };

    this.emit('contract_deployed', mockDeployment);
    return mockDeployment;
  }

  private async mintAgentNFT(metadata: AgentNFTMetadata): Promise<string> {
    // Mint NFT representing the agent identity
    try {
      // This would use the sei-agent-kit NFT functionality
      const tokenId = await this.seiKit.erc721.mint({
        to: await this.getWalletAddress(),
        metadata: JSON.stringify(metadata)
      });

      this.emit('nft_minted', { agentId: this.agentId, tokenId, metadata });
      return tokenId;
    } catch (error) {
      this.emit('error', { type: 'nft_minting', error });
      throw error;
    }
  }

  async recordEarnings(amount: number, currency: string = 'SEI', source: string = 'unknown'): Promise<void> {
    try {
      const record: EarningsRecord = {
        timestamp: Date.now(),
        amount,
        currency,
        source,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Would be actual tx hash
        blockNumber: Math.floor(Math.random() * 1000000) // Would be actual block
      };

      this.earningsHistory.push(record);
      
      // Update agent registry
      if (this.agentRegistry) {
        this.agentRegistry.totalEarnings += amount;
        this.agentRegistry.lastActivity = Date.now();
      }

      this.emit('earnings_recorded', record);
    } catch (error) {
      this.emit('error', { type: 'earnings_recording', error });
      throw error;
    }
  }

  async stakeSeiTokens(amount: number, validatorAddress?: string): Promise<StakeResult> {
    try {
      // Use default validator if none specified
      const validator = validatorAddress || await this.getRecommendedValidator();
      
      // Execute staking transaction
      const result = await this.seiKit.tokens.transfer({
        to: validator,
        amount: amount.toString(),
        denom: 'usei'
      });

      const stakeResult: StakeResult = {
        success: true,
        transactionHash: result.transactionHash,
        stakedAmount: amount,
        validatorAddress: validator
      };

      this.stakingPositions.set(validator, stakeResult);
      this.emit('tokens_staked', stakeResult);
      
      return stakeResult;
    } catch (error) {
      this.emit('error', { type: 'staking', error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Staking failed'
      };
    }
  }

  async provideLiquidity(poolId: string, tokenA: string, tokenB: string, amountA: number, amountB: number): Promise<LiquidityPosition> {
    try {
      // Execute liquidity provision
      // This would use a DEX protocol on Sei
      
      const position: LiquidityPosition = {
        poolAddress: poolId,
        tokenA,
        tokenB,
        amountA,
        amountB,
        lpTokens: Math.sqrt(amountA * amountB), // Simplified calculation
        rewards: 0
      };

      this.liquidityPositions.set(poolId, position);
      this.emit('liquidity_provided', position);
      
      return position;
    } catch (error) {
      this.emit('error', { type: 'liquidity_provision', error });
      throw error;
    }
  }

  async participateInGovernance(proposalId: number, vote: 'yes' | 'no' | 'abstain'): Promise<VoteResult> {
    try {
      // Get proposal details
      const proposal = await this.getGovernanceProposal(proposalId);
      
      if (proposal.status !== 'active') {
        throw new Error('Proposal is not active for voting');
      }

      // Cast vote
      const voteResult = await this.castGovernanceVote(proposalId, vote);
      
      // Update proposal record
      proposal.agentVote = vote;
      
      this.emit('governance_vote_cast', { proposalId, vote, result: voteResult });
      
      return voteResult;
    } catch (error) {
      this.emit('error', { type: 'governance_voting', error });
      throw error;
    }
  }

  async getBalance(token?: string): Promise<number> {
    try {
      if (token) {
        const balance = await this.seiKit.erc20.getBalance({
          tokenAddress: token,
          walletAddress: await this.getWalletAddress()
        });
        return parseFloat(balance);
      } else {
        // Get native SEI balance
        const balance = await this.seiKit.tokens.getBalance({
          address: await this.getWalletAddress(),
          denom: 'usei'
        });
        return parseFloat(balance) / 1000000; // Convert from usei to sei
      }
    } catch (error) {
      this.emit('error', { type: 'balance_query', error });
      return 0;
    }
  }

  async transferTokens(to: string, amount: number, token?: string): Promise<TransferResult> {
    try {
      if (token) {
        // ERC20 transfer
        const result = await this.seiKit.erc20.transfer({
          to,
          amount: amount.toString(),
          tokenAddress: token
        });
        return { success: true, transactionHash: result.transactionHash };
      } else {
        // Native SEI transfer
        const result = await this.seiKit.tokens.transfer({
          to,
          amount: (amount * 1000000).toString(), // Convert to usei
          denom: 'usei'
        });
        return { success: true, transactionHash: result.transactionHash };
      }
    } catch (error) {
      this.emit('error', { type: 'token_transfer', error });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Transfer failed' 
      };
    }
  }

  async getEarningsReport(): Promise<EarningsReport> {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const totalEarnings = this.earningsHistory.reduce((sum, e) => sum + e.amount, 0);
    
    const dailyEarnings = this.earningsHistory
      .filter(e => now - e.timestamp < dayMs)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const weeklyEarnings = this.earningsHistory
      .filter(e => now - e.timestamp < weekMs)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const monthlyEarnings = this.earningsHistory
      .filter(e => now - e.timestamp < monthMs)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalEarnings,
      dailyEarnings,
      weeklyEarnings,
      monthlyEarnings,
      topRevenueStreams: this.getTopRevenueStreams(),
      pendingPayments: 0,
      withdrawableBalance: await this.getBalance()
    };
  }

  async getAgentReputation(): Promise<ReputationMetrics> {
    if (!this.agentRegistry) {
      throw new Error('Agent not registered');
    }

    return {
      score: this.agentRegistry.reputationScore,
      rank: await this.calculateReputationRank(),
      factors: {
        earnings: this.agentRegistry.totalEarnings,
        activity: this.calculateActivityScore(),
        feedback: await this.getFeedbackScore(),
        governance: await this.getGovernanceParticipation()
      },
      history: await this.getReputationHistory()
    };
  }

  async updateReputation(delta: number, reason: string): Promise<void> {
    if (!this.agentRegistry) {
      throw new Error('Agent not registered');
    }

    this.agentRegistry.reputationScore = Math.max(0, this.agentRegistry.reputationScore + delta);
    
    this.emit('reputation_updated', {
      agentId: this.agentId,
      newScore: this.agentRegistry.reputationScore,
      delta,
      reason
    });
  }

  async pauseAgent(): Promise<void> {
    if (this.agentRegistry) {
      this.agentRegistry.isActive = false;
      this.emit('agent_paused', { agentId: this.agentId });
    }
  }

  async resumeAgent(): Promise<void> {
    if (this.agentRegistry) {
      this.agentRegistry.isActive = true;
      this.agentRegistry.lastActivity = Date.now();
      this.emit('agent_resumed', { agentId: this.agentId });
    }
  }

  getAgentRegistry(): AgentRegistry | undefined {
    return this.agentRegistry;
  }

  getStakingPositions(): StakeResult[] {
    return Array.from(this.stakingPositions.values());
  }

  getLiquidityPositions(): LiquidityPosition[] {
    return Array.from(this.liquidityPositions.values());
  }

  // Private helper methods
  private async getWalletAddress(): Promise<string> {
    // Extract address from private key or get from SDK
    return this.seiKit.address || 'sei1...'; // Would return actual address
  }

  private generatePersonalityHash(): string {
    return `0x${Math.random().toString(16).substr(2, 64)}`;
  }

  private async loadAgentRegistry(): Promise<void> {
    // Load agent registry from blockchain
    // This would query the agent registry contract
  }

  private async loadPositions(): Promise<void> {
    // Load staking and liquidity positions from blockchain
  }

  private async loadEarningsHistory(): Promise<void> {
    // Load earnings history from blockchain events
  }

  private async getRecommendedValidator(): Promise<string> {
    // Get a recommended validator for staking
    return 'seivaloper1...'; // Would return actual validator address
  }

  private async getGovernanceProposal(proposalId: number): Promise<GovernanceProposal> {
    // Query governance proposal details
    return {
      id: proposalId,
      title: `Proposal ${proposalId}`,
      description: 'Sample governance proposal',
      status: 'active',
      votingEndTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
      votes: { yes: 1000, no: 500, abstain: 100 }
    };
  }

  private async castGovernanceVote(proposalId: number, vote: string): Promise<VoteResult> {
    // Cast governance vote
    return {
      success: true,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      proposalId,
      vote
    };
  }

  private getTopRevenueStreams(): Array<{source: string, amount: number, frequency: string}> {
    const streamMap = new Map<string, {total: number, count: number}>();
    
    for (const earning of this.earningsHistory) {
      const current = streamMap.get(earning.source) || {total: 0, count: 0};
      current.total += earning.amount;
      current.count += 1;
      streamMap.set(earning.source, current);
    }
    
    return Array.from(streamMap.entries())
      .map(([source, data]) => ({
        source,
        amount: data.total,
        frequency: `${data.count} payments`
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  private async calculateReputationRank(): Promise<number> {
    // Calculate rank among all agents
    return Math.floor(Math.random() * 1000) + 1;
  }

  private calculateActivityScore(): number {
    // Calculate activity score based on recent interactions
    const recentEarnings = this.earningsHistory.filter(
      e => Date.now() - e.timestamp < 30 * 24 * 60 * 60 * 1000
    );
    return recentEarnings.length * 10;
  }

  private async getFeedbackScore(): Promise<number> {
    // Get feedback score from user interactions
    return Math.random() * 1000;
  }

  private async getGovernanceParticipation(): Promise<number> {
    // Calculate governance participation score
    return Math.random() * 100;
  }

  private async getReputationHistory(): Promise<Array<{timestamp: number, score: number, event: string}>> {
    // Get reputation history
    return [
      { timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, score: 950, event: 'initial_registration' },
      { timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, score: 1000, event: 'positive_feedback' },
      { timestamp: Date.now(), score: this.agentRegistry?.reputationScore || 1000, event: 'current' }
    ];
  }
}

// Supporting interfaces
export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface VoteResult {
  success: boolean;
  transactionHash?: string;
  proposalId?: number;
  vote?: string;
  error?: string;
}

export interface ReputationMetrics {
  score: number;
  rank: number;
  factors: {
    earnings: number;
    activity: number;
    feedback: number;
    governance: number;
  };
  history: Array<{
    timestamp: number;
    score: number;
    event: string;
  }>;
}

export interface EarningsReport {
  totalEarnings: number;
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  topRevenueStreams: Array<{
    source: string;
    amount: number;
    frequency: string;
  }>;
  pendingPayments: number;
  withdrawableBalance: number;
}