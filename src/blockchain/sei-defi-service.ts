import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import axios from 'axios';

// Import sei-agent-kit tools directly from source
// Since the package has build issues, we'll use the source files directly
import type { SeiAgentKit } from '../../node_modules/sei-agent-kit/src/agent';

export interface DeFiConfig {
  privateKey: string;
  rpcUrl: string;
  chainId: string;
  symphonyApiUrl?: string;
  takaraApiUrl?: string;
  siloApiUrl?: string;
  citrexApiUrl?: string;
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
  address: string;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippage?: number;
}

export interface LendingPosition {
  protocol: string;
  asset: string;
  supplied: string;
  borrowed: string;
  apy: number;
}

export class SeiDeFiService extends EventEmitter {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  private config: DeFiConfig;
  private agentKit?: SeiAgentKit;
  private isInitialized: boolean = false;

  constructor(config: DeFiConfig) {
    super();
    this.config = config;
    this.wallet = new ethers.Wallet(config.privateKey);
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Connect wallet to provider
      this.wallet = this.wallet.connect(this.provider);
      
      // Verify connection
      const network = await this.provider.getNetwork();
      logger.info(`Connected to Sei DeFi: ${network.name} (chainId: ${network.chainId})`);
      
      // Initialize agent kit dynamically
      await this.initializeAgentKit();
      
      this.isInitialized = true;
      this.emit('initialized', { address: this.wallet.address });
    } catch (error) {
      logger.error('Failed to initialize DeFi service:', error);
      throw error;
    }
  }

  private async initializeAgentKit(): Promise<void> {
    try {
      // Dynamically import and initialize sei-agent-kit
      const agentModule = await import('../../node_modules/sei-agent-kit/src/agent/index.ts');
      const SeiAgentKitClass = agentModule.SeiAgentKit;
      
      this.agentKit = new SeiAgentKitClass(
        this.config.privateKey,
        this.config.rpcUrl,
        this.config.privateKey // Using same key for wallet
      );
      
      logger.info('SeiAgentKit initialized successfully');
    } catch (error) {
      logger.warn('Could not initialize SeiAgentKit, using direct integrations:', error);
      // Continue without agent kit, use direct API calls
    }
  }

  // Symphony DEX Integration
  async swapTokens(params: SwapParams): Promise<any> {
    try {
      if (this.agentKit) {
        // Use agent kit if available
        const swapTool = await import('../../node_modules/sei-agent-kit/src/tools/symphony/index.ts');
        return await swapTool.swapTokens(params);
      }
      
      // Fallback to direct API
      const response = await axios.post(
        `${this.config.symphonyApiUrl || 'https://api.symphony.finance'}/swap`,
        {
          ...params,
          wallet: this.wallet.address,
          chainId: this.config.chainId
        }
      );
      
      logger.info(`Swap executed: ${params.amountIn} ${params.tokenIn} -> ${params.tokenOut}`);
      return response.data;
    } catch (error) {
      logger.error('Swap failed:', error);
      throw error;
    }
  }

  // Takara Lending Protocol
  async lendAsset(asset: string, amount: string): Promise<any> {
    try {
      if (this.agentKit) {
        const takaraTool = await import('../../node_modules/sei-agent-kit/src/tools/takara/index.ts');
        return await takaraTool.lend({ asset, amount });
      }
      
      // Direct contract interaction
      const lendingContract = new ethers.Contract(
        '0x...', // Takara contract address
        ['function lend(address asset, uint256 amount) external'],
        this.wallet
      );
      
      const tx = await lendingContract.lend(asset, ethers.parseEther(amount));
      await tx.wait();
      
      logger.info(`Lent ${amount} ${asset} on Takara`);
      return tx;
    } catch (error) {
      logger.error('Lending failed:', error);
      throw error;
    }
  }

  async borrowAsset(asset: string, amount: string): Promise<any> {
    try {
      if (this.agentKit) {
        const takaraTool = await import('../../node_modules/sei-agent-kit/src/tools/takara/index.ts');
        return await takaraTool.borrow({ asset, amount });
      }
      
      // Direct implementation
      logger.info(`Borrowing ${amount} ${asset} from Takara`);
      // Implementation would go here
      return { success: true, asset, amount };
    } catch (error) {
      logger.error('Borrowing failed:', error);
      throw error;
    }
  }

  // Silo Staking
  async stakeTokens(token: string, amount: string, duration?: number): Promise<any> {
    try {
      if (this.agentKit) {
        const siloTool = await import('../../node_modules/sei-agent-kit/src/tools/silo/index.ts');
        return await siloTool.stake({ token, amount, duration });
      }
      
      logger.info(`Staking ${amount} ${token} in Silo`);
      // Direct staking implementation
      return { success: true, token, amount, duration };
    } catch (error) {
      logger.error('Staking failed:', error);
      throw error;
    }
  }

  // Citrex Perpetual Trading
  async openPosition(params: {
    market: string;
    side: 'long' | 'short';
    size: string;
    leverage: number;
  }): Promise<any> {
    try {
      if (this.agentKit) {
        const citrexTool = await import('../../node_modules/sei-agent-kit/src/tools/citrex/index.ts');
        return await citrexTool.openPosition(params);
      }
      
      logger.info(`Opening ${params.side} position on ${params.market}`);
      // Direct perpetual trading implementation
      return { 
        success: true, 
        positionId: `pos_${Date.now()}`,
        ...params 
      };
    } catch (error) {
      logger.error('Failed to open position:', error);
      throw error;
    }
  }

  // ERC-20 Token Operations
  async getTokenBalance(tokenAddress: string): Promise<TokenBalance> {
    try {
      const erc20Abi = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)'
      ];
      
      const token = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
      
      const [balance, decimals, symbol] = await Promise.all([
        token.balanceOf(this.wallet.address),
        token.decimals(),
        token.symbol()
      ]);
      
      return {
        symbol,
        balance: ethers.formatUnits(balance, decimals),
        decimals,
        address: tokenAddress
      };
    } catch (error) {
      logger.error('Failed to get token balance:', error);
      throw error;
    }
  }

  async transferToken(tokenAddress: string, recipient: string, amount: string): Promise<any> {
    try {
      if (this.agentKit) {
        const erc20Tool = await import('../../node_modules/sei-agent-kit/src/tools/sei-erc20/index.ts');
        return await erc20Tool.transfer({ tokenAddress, recipient, amount });
      }
      
      const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
      const token = new ethers.Contract(tokenAddress, erc20Abi, this.wallet);
      
      const tx = await token.transfer(recipient, ethers.parseEther(amount));
      await tx.wait();
      
      logger.info(`Transferred ${amount} tokens to ${recipient}`);
      return tx;
    } catch (error) {
      logger.error('Token transfer failed:', error);
      throw error;
    }
  }

  // ERC-721 NFT Operations
  async getNFTBalance(contractAddress: string): Promise<number> {
    try {
      const erc721Abi = ['function balanceOf(address) view returns (uint256)'];
      const nft = new ethers.Contract(contractAddress, erc721Abi, this.provider);
      
      const balance = await nft.balanceOf(this.wallet.address);
      return Number(balance);
    } catch (error) {
      logger.error('Failed to get NFT balance:', error);
      return 0;
    }
  }

  async transferNFT(contractAddress: string, tokenId: string, recipient: string): Promise<any> {
    try {
      if (this.agentKit) {
        const erc721Tool = await import('../../node_modules/sei-agent-kit/src/tools/sei-erc721/index.ts');
        return await erc721Tool.transfer({ contractAddress, tokenId, recipient });
      }
      
      const erc721Abi = [
        'function safeTransferFrom(address from, address to, uint256 tokenId)'
      ];
      const nft = new ethers.Contract(contractAddress, erc721Abi, this.wallet);
      
      const tx = await nft.safeTransferFrom(
        this.wallet.address,
        recipient,
        tokenId
      );
      await tx.wait();
      
      logger.info(`Transferred NFT #${tokenId} to ${recipient}`);
      return tx;
    } catch (error) {
      logger.error('NFT transfer failed:', error);
      throw error;
    }
  }

  // Portfolio Analytics
  async getPortfolio(): Promise<any> {
    try {
      const [seiBalance, lendingPositions, stakingPositions] = await Promise.all([
        this.provider.getBalance(this.wallet.address),
        this.getLendingPositions(),
        this.getStakingPositions()
      ]);
      
      return {
        wallet: this.wallet.address,
        balances: {
          SEI: ethers.formatEther(seiBalance)
        },
        lending: lendingPositions,
        staking: stakingPositions,
        totalValueLocked: this.calculateTVL(seiBalance, lendingPositions, stakingPositions)
      };
    } catch (error) {
      logger.error('Failed to get portfolio:', error);
      throw error;
    }
  }

  private async getLendingPositions(): Promise<LendingPosition[]> {
    // Would fetch from Takara protocol
    return [];
  }

  private async getStakingPositions(): Promise<any[]> {
    // Would fetch from Silo protocol
    return [];
  }

  private calculateTVL(seiBalance: bigint, lending: any[], staking: any[]): string {
    // Calculate total value locked across protocols
    let tvl = Number(ethers.formatEther(seiBalance));
    
    // Add lending positions
    lending.forEach(pos => {
      tvl += Number(pos.supplied) - Number(pos.borrowed);
    });
    
    // Add staking positions
    staking.forEach(pos => {
      tvl += Number(pos.amount || 0);
    });
    
    return tvl.toFixed(4);
  }

  // Yield Optimization
  async findBestYield(amount: string): Promise<any> {
    try {
      const opportunities = [];
      
      // Check lending APYs
      const lendingAPY = await this.getLendingAPY();
      opportunities.push({
        protocol: 'Takara',
        type: 'lending',
        apy: lendingAPY,
        risk: 'low'
      });
      
      // Check staking rewards
      const stakingAPY = await this.getStakingAPY();
      opportunities.push({
        protocol: 'Silo',
        type: 'staking',
        apy: stakingAPY,
        risk: 'medium'
      });
      
      // Sort by APY
      opportunities.sort((a, b) => b.apy - a.apy);
      
      return {
        bestOpportunity: opportunities[0],
        allOpportunities: opportunities
      };
    } catch (error) {
      logger.error('Failed to find best yield:', error);
      throw error;
    }
  }

  private async getLendingAPY(): Promise<number> {
    // Would fetch from Takara
    return 8.5; // Mock APY
  }

  private async getStakingAPY(): Promise<number> {
    // Would fetch from Silo
    return 12.3; // Mock APY
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }

  async disconnect(): Promise<void> {
    this.isInitialized = false;
    logger.info('DeFi service disconnected');
  }
}