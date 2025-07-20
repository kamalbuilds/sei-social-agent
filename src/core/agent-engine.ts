import { EventEmitter } from 'events';
import { PersonalityModule } from '../personality/personality-engine.js';
import { MemorySystem } from '../memory/memory-system.js';
import { ReasoningEngine } from './reasoning-engine.js';
import { ToolRegistry } from './tool-registry.js';
import { PlatformAdapter } from '../platforms/platform-sdk.js';
import { AutonomyController } from '../autonomy/autonomy-controller.js';
import { PaymentSystem } from '../payments/x402-integration.js';
import { SeiBlockchainService } from '../blockchain/sei-integration.js';

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  personalityTemplate: string;
  platforms: string[];
  autonomyLevel: AutonomyLevel;
  spendingLimits: SpendingLimits;
  revenueConfig: RevenueConfig;
}

export enum AgentType {
  SOCIAL = 'social',
  ARTIST = 'artist', 
  GAMING = 'gaming',
  TRADER = 'trader',
  CURATOR = 'curator',
  MENTOR = 'mentor'
}

export enum AutonomyLevel {
  SUPERVISED = 'supervised',     // All actions require approval
  SEMI_AUTONOMOUS = 'semi',      // Financial/critical actions require approval
  AUTONOMOUS = 'autonomous',     // Full autonomy within guardrails
  RESTRICTED = 'restricted'      // Limited actions only
}

export interface SpendingLimits {
  dailyLimit: number;
  perTransactionLimit: number;
  platformLimits: Record<string, number>;
  approvalRequiredAbove: number;
}

export interface RevenueConfig {
  models: RevenueModel[];
  paymentMethods: string[];
  withdrawalRules: WithdrawalRules;
}

export interface RevenueModel {
  type: 'content' | 'service' | 'subscription' | 'commission';
  rate: number;
  currency: string;
  billingCycle: 'per_use' | 'hourly' | 'daily' | 'monthly';
}

export interface WithdrawalRules {
  minimumBalance: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  destinationAddress: string;
}

export class AgentCore extends EventEmitter {
  private config: AgentConfig;
  private personality: PersonalityModule;
  private memory: MemorySystem;
  private reasoning: ReasoningEngine;
  private tools: ToolRegistry;
  private platforms: Map<string, PlatformAdapter>;
  private autonomy: AutonomyController;
  private payments: PaymentSystem;
  private blockchain: SeiBlockchainService;
  private isActive: boolean = false;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.platforms = new Map();
    this.initializeComponents();
  }

  private async initializeComponents(): Promise<void> {
    try {
      // Initialize core components
      this.personality = new PersonalityModule(this.config.personalityTemplate);
      this.memory = new MemorySystem(this.config.id);
      this.reasoning = new ReasoningEngine(this.personality, this.memory);
      this.tools = new ToolRegistry();
      this.autonomy = new AutonomyController(this.config.autonomyLevel, this.config.spendingLimits);
      this.payments = new PaymentSystem(this.config.revenueConfig);
      this.blockchain = new SeiBlockchainService(this.config.id);

      // Load personality-specific tools
      await this.loadAgentTypeTools();
      
      // Initialize platform adapters
      await this.initializePlatforms();

      this.emit('initialized', { agentId: this.config.id });
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  private async loadAgentTypeTools(): Promise<void> {
    switch (this.config.type) {
      case AgentType.SOCIAL:
        await this.tools.loadToolset('social-media');
        await this.tools.loadToolset('content-creation');
        break;
      case AgentType.ARTIST:
        await this.tools.loadToolset('image-generation');
        await this.tools.loadToolset('nft-minting');
        await this.tools.loadToolset('marketplace');
        break;
      case AgentType.GAMING:
        await this.tools.loadToolset('game-api');
        await this.tools.loadToolset('strategy-analysis');
        break;
      case AgentType.TRADER:
        await this.tools.loadToolset('defi-protocols');
        await this.tools.loadToolset('market-analysis');
        break;
      case AgentType.CURATOR:
        await this.tools.loadToolset('content-discovery');
        await this.tools.loadToolset('recommendation');
        break;
      case AgentType.MENTOR:
        await this.tools.loadToolset('education');
        await this.tools.loadToolset('assessment');
        break;
    }
  }

  private async initializePlatforms(): Promise<void> {
    for (const platformName of this.config.platforms) {
      const adapter = await this.createPlatformAdapter(platformName);
      this.platforms.set(platformName, adapter);
      
      // Set up event listeners
      adapter.on('event', (event) => this.handlePlatformEvent(platformName, event));
      adapter.on('error', (error) => this.handlePlatformError(platformName, error));
    }
  }

  private async createPlatformAdapter(platformName: string): Promise<PlatformAdapter> {
    const { default: AdapterClass } = await import(`../platforms/adapters/${platformName}-adapter.js`);
    return new AdapterClass(this.config, this.personality);
  }

  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Agent is already active');
    }

    try {
      // Connect to all platforms
      for (const [platformName, adapter] of this.platforms) {
        await adapter.connect();
        this.emit('platform_connected', { platform: platformName });
      }

      // Start blockchain services
      await this.blockchain.initialize();

      // Begin autonomous operation
      this.isActive = true;
      this.startMainLoop();

      this.emit('started', { agentId: this.config.id });
    } catch (error) {
      this.emit('error', { type: 'startup', error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Disconnect from platforms
    for (const [platformName, adapter] of this.platforms) {
      await adapter.disconnect();
      this.emit('platform_disconnected', { platform: platformName });
    }

    // Save state to memory
    await this.memory.persist();

    this.emit('stopped', { agentId: this.config.id });
  }

  private startMainLoop(): void {
    setInterval(async () => {
      if (!this.isActive) return;

      try {
        // Autonomous decision making
        const decisions = await this.reasoning.generateDecisions();
        
        for (const decision of decisions) {
          const approved = await this.autonomy.validateDecision(decision);
          if (approved) {
            await this.executeDecision(decision);
          } else {
            await this.escalateDecision(decision);
          }
        }

        // Memory consolidation
        await this.memory.consolidate();

        // Performance monitoring
        this.emit('heartbeat', { 
          agentId: this.config.id, 
          timestamp: Date.now(),
          status: 'active'
        });

      } catch (error) {
        this.emit('error', { type: 'main_loop', error });
      }
    }, 5000); // Every 5 seconds
  }

  private async handlePlatformEvent(platformName: string, event: any): Promise<void> {
    try {
      // Store event in memory
      await this.memory.storeEvent(event);

      // Analyze event and generate response
      const response = await this.reasoning.processEvent(event);

      if (response) {
        // Check autonomy permissions
        const approved = await this.autonomy.validateAction(response);
        
        if (approved) {
          const platform = this.platforms.get(platformName);
          await platform?.executeAction(response);
          
          // Track performance
          this.emit('action_executed', {
            platform: platformName,
            action: response.type,
            success: true
          });
        } else {
          await this.escalateAction(response);
        }
      }
    } catch (error) {
      this.emit('error', { type: 'event_handling', platformName, error });
    }
  }

  private async executeDecision(decision: any): Promise<void> {
    // Implementation depends on decision type
    switch (decision.type) {
      case 'content_creation':
        await this.createContent(decision);
        break;
      case 'payment_acceptance':
        await this.processPayment(decision);
        break;
      case 'platform_interaction':
        await this.interactOnPlatform(decision);
        break;
      case 'learning_adaptation':
        await this.adaptBehavior(decision);
        break;
    }
  }

  private async createContent(decision: any): Promise<void> {
    const platform = this.platforms.get(decision.platform);
    if (!platform) return;

    const content = await this.tools.execute('content-generator', {
      type: decision.contentType,
      prompt: decision.prompt,
      style: this.personality.getCommunicationStyle()
    });

    await platform.post(content);
    
    // Set up payment requirement if specified
    if (decision.monetize) {
      await this.payments.setupPaymentRequirement(content.id, decision.price);
    }
  }

  private async processPayment(decision: any): Promise<void> {
    const result = await this.payments.acceptPayment(decision.paymentRequest);
    
    if (result.success) {
      // Provide the requested service/content
      await this.deliverService(decision.serviceType, result.payer);
      
      // Update earnings
      await this.blockchain.recordEarnings(result.amount);
    }
  }

  private async escalateDecision(decision: any): Promise<void> {
    this.emit('escalation_required', {
      agentId: this.config.id,
      decision,
      reason: 'autonomy_limits_exceeded'
    });
  }

  private async escalateAction(action: any): Promise<void> {
    this.emit('escalation_required', {
      agentId: this.config.id,
      action,
      reason: 'approval_required'
    });
  }

  private async handlePlatformError(platformName: string, error: any): Promise<void> {
    this.emit('platform_error', { platform: platformName, error });
    
    // Attempt recovery
    setTimeout(async () => {
      try {
        const adapter = this.platforms.get(platformName);
        await adapter?.reconnect();
      } catch (recoveryError) {
        this.emit('recovery_failed', { platform: platformName, recoveryError });
      }
    }, 30000); // Retry after 30 seconds
  }

  // Public API methods
  async updatePersonality(updates: Partial<PersonalityConfig>): Promise<void> {
    await this.personality.update(updates);
    this.emit('personality_updated', { agentId: this.config.id, updates });
  }

  async addPlatform(platformName: string): Promise<void> {
    if (this.platforms.has(platformName)) return;

    const adapter = await this.createPlatformAdapter(platformName);
    this.platforms.set(platformName, adapter);
    
    if (this.isActive) {
      await adapter.connect();
    }

    this.emit('platform_added', { platform: platformName });
  }

  async removePlatform(platformName: string): Promise<void> {
    const adapter = this.platforms.get(platformName);
    if (!adapter) return;

    await adapter.disconnect();
    this.platforms.delete(platformName);
    
    this.emit('platform_removed', { platform: platformName });
  }

  getStatus(): AgentStatus {
    return {
      id: this.config.id,
      name: this.config.name,
      type: this.config.type,
      isActive: this.isActive,
      platforms: Array.from(this.platforms.keys()),
      autonomyLevel: this.config.autonomyLevel,
      lastActivity: Date.now()
    };
  }

  async getEarnings(): Promise<EarningsReport> {
    return await this.blockchain.getEarningsReport();
  }

  async getMemoryStats(): Promise<MemoryStats> {
    return await this.memory.getStats();
  }
}

export interface AgentStatus {
  id: string;
  name: string;
  type: AgentType;
  isActive: boolean;
  platforms: string[];
  autonomyLevel: AutonomyLevel;
  lastActivity: number;
}

export interface EarningsReport {
  totalEarnings: number;
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  topRevenueStreams: RevenueStream[];
  pendingPayments: number;
}

export interface RevenueStream {
  source: string;
  amount: number;
  frequency: string;
}

export interface MemoryStats {
  totalMemories: number;
  workingMemorySize: number;
  episodicMemorySize: number;
  semanticMemorySize: number;
  proceduralMemorySize: number;
}

export interface PersonalityConfig {
  traits: PersonalityTraits;
  communicationStyle: CommunicationStyle;
  decisionPatterns: DecisionPattern[];
}

export interface PersonalityTraits {
  creativity: number;
  empathy: number;
  assertiveness: number;
  curiosity: number;
  humor: number;
  risk_tolerance: number;
}

export interface CommunicationStyle {
  formality: 'casual' | 'professional' | 'academic';
  tone: 'friendly' | 'neutral' | 'sarcastic' | 'enthusiastic';
  verbosity: 'concise' | 'detailed' | 'comprehensive';
  emoji_usage: 'none' | 'minimal' | 'moderate' | 'heavy';
}

export interface DecisionPattern {
  context: string;
  condition: string;
  action: string;
  priority: number;
}