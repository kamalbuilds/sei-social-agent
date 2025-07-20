import { EventEmitter } from 'events';
import { AgentCore, AgentConfig, AgentType, AutonomyLevel } from '../core/agent-engine.js';
import { PersonalityTraits, CommunicationStyle } from '../personality/personality-engine.js';

export interface UserExperience {
  onboarding: OnboardingFlow;
  dashboard: AgentDashboard;
  controls: AgentControls;
  analytics: PerformanceAnalytics;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'input' | 'selection' | 'confirmation';
  required: boolean;
  validation?: (input: any) => boolean;
  helpText?: string;
}

export interface OnboardingFlow {
  steps: OnboardingStep[];
  currentStep: number;
  completed: boolean;
  userData: Record<string, any>;
}

export interface AgentDashboard {
  overview: DashboardOverview;
  earnings: EarningsWidget;
  activity: ActivityWidget;
  performance: PerformanceWidget;
  settings: SettingsWidget;
}

export interface DashboardOverview {
  agentStatus: 'active' | 'paused' | 'learning' | 'error';
  totalEarnings: number;
  dailyEarnings: number;
  activePlatforms: string[];
  uptime: number;
  lastActivity: number;
}

export interface EarningsWidget {
  totalBalance: number;
  pendingPayments: number;
  revenueStreams: Array<{
    platform: string;
    amount: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  withdrawableAmount: number;
  autoWithdrawEnabled: boolean;
}

export interface ActivityWidget {
  recentInteractions: Array<{
    platform: string;
    type: string;
    timestamp: number;
    success: boolean;
  }>;
  platformStats: Record<string, {
    posts: number;
    interactions: number;
    engagement: number;
  }>;
}

export interface PerformanceWidget {
  autonomyScore: number;
  reputationScore: number;
  errorRate: number;
  responseTime: number;
  customerSatisfaction: number;
}

export interface SettingsWidget {
  personalityAdjustment: boolean;
  spendingLimitsEditable: boolean;
  platformConfigEditable: boolean;
  emergencyStopAvailable: boolean;
}

export interface SimpleTraits {
  creativity: 'low' | 'medium' | 'high';
  friendliness: 'professional' | 'friendly' | 'casual';
  assertiveness: 'passive' | 'balanced' | 'confident';
  humor: 'serious' | 'occasional' | 'playful';
}

export interface SimpleLimits {
  dailySpending: number;
  postFrequency: 'low' | 'medium' | 'high';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  approvalLevel: 'all' | 'financial' | 'none';
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'social' | 'creative' | 'financial' | 'gaming';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  features: string[];
  estimatedEarnings: string;
  platforms: string[];
  defaultConfig: Partial<AgentConfig>;
}

export interface CreateAgentRequest {
  template: string;
  name: string;
  personality: SimpleTraits;
  limits: SimpleLimits;
  platforms: string[];
  customization?: Record<string, any>;
}

export interface EarningsReport {
  period: 'day' | 'week' | 'month' | 'year';
  totalEarnings: number;
  breakdown: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
  trend: Array<{
    date: string;
    amount: number;
  }>;
  projectedEarnings: number;
}

export class SimplifiedInterface extends EventEmitter {
  private agents: Map<string, AgentCore> = new Map();
  private onboardingState: Map<string, OnboardingFlow> = new Map();
  private dashboards: Map<string, AgentDashboard> = new Map();

  constructor() {
    super();
    this.initializeTemplates();
  }

  /**
   * Create a new agent using a simplified interface
   */
  async createAgent(request: CreateAgentRequest): Promise<AgentCore> {
    try {
      // Validate input
      this.validateCreateAgentRequest(request);

      // Get template configuration
      const template = this.getAgentTemplate(request.template);
      if (!template) {
        throw new Error(`Unknown template: ${request.template}`);
      }

      // Convert simple traits to detailed personality
      const personality = this.convertSimpleTraits(request.personality);
      
      // Convert simple limits to detailed configuration
      const autonomyConfig = this.convertSimpleLimits(request.limits);

      // Build agent configuration
      const agentConfig: AgentConfig = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: request.name,
        type: this.mapTemplateToAgentType(template),
        personalityTemplate: request.template,
        platforms: request.platforms,
        autonomyLevel: autonomyConfig.level,
        spendingLimits: autonomyConfig.spending,
        revenueConfig: {
          models: template.defaultConfig.revenueConfig?.models || [],
          paymentMethods: ['sei', 'usdc'],
          withdrawalRules: {
            minimumBalance: 10,
            frequency: 'weekly',
            destinationAddress: '', // Would be set by user
            autoWithdraw: false,
            gasBuffer: 0.1
          }
        }
      };

      // Create and initialize agent
      const agent = new AgentCore(agentConfig);
      await agent.start();

      // Store agent reference
      this.agents.set(agentConfig.id, agent);

      // Create dashboard
      await this.createDashboard(agentConfig.id);

      // Set up event listeners
      this.setupAgentEventListeners(agent);

      this.emit('agent_created', { 
        agentId: agentConfig.id, 
        template: request.template,
        config: agentConfig 
      });

      return agent;
    } catch (error) {
      this.emit('error', { type: 'agent_creation', error });
      throw error;
    }
  }

  /**
   * Configure agent personality using simple controls
   */
  async configurePersonality(agentId: string, traits: SimpleTraits): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const personalityConfig = this.convertSimpleTraits(traits);
    await agent.updatePersonality(personalityConfig);
    
    this.emit('personality_updated', { agentId, traits });
  }

  /**
   * Set spending limits with simple interface
   */
  async setSpendingLimits(agentId: string, limits: SimpleLimits): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const autonomyConfig = this.convertSimpleLimits(limits);
    
    // Update agent autonomy level and limits
    // This would call agent's internal methods to update configuration
    
    this.emit('limits_updated', { agentId, limits });
  }

  /**
   * View earnings with user-friendly formatting
   */
  async viewEarnings(agentId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<EarningsReport> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const rawReport = await agent.getEarnings();
    
    // Convert to user-friendly format
    const report: EarningsReport = {
      period,
      totalEarnings: rawReport.totalEarnings,
      breakdown: rawReport.topRevenueStreams.map(stream => ({
        source: this.formatSourceName(stream.source),
        amount: stream.amount,
        percentage: (stream.amount / rawReport.totalEarnings) * 100
      })),
      trend: this.generateEarningsTrend(rawReport, period),
      projectedEarnings: this.calculateProjectedEarnings(rawReport, period)
    };

    return report;
  }

  /**
   * Pause agent with one click
   */
  async pauseAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    await agent.stop();
    this.emit('agent_paused', { agentId });
  }

  /**
   * Resume agent with one click
   */
  async resumeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    await agent.start();
    this.emit('agent_resumed', { agentId });
  }

  /**
   * Get simplified agent status
   */
  getAgentStatus(agentId: string): SimplifiedAgentStatus {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const status = agent.getStatus();
    const dashboard = this.dashboards.get(agentId);

    return {
      id: status.id,
      name: status.name,
      status: status.isActive ? 'active' : 'paused',
      earnings: dashboard?.earnings.totalBalance || 0,
      platforms: status.platforms,
      uptime: this.calculateUptime(status.lastActivity),
      performance: dashboard?.performance.autonomyScore || 0,
      needsAttention: this.checkIfNeedsAttention(status)
    };
  }

  /**
   * Get user dashboard for an agent
   */
  getDashboard(agentId: string): AgentDashboard {
    const dashboard = this.dashboards.get(agentId);
    if (!dashboard) {
      throw new Error(`Dashboard for agent ${agentId} not found`);
    }
    return dashboard;
  }

  /**
   * Start onboarding flow for new users
   */
  startOnboarding(userId: string): OnboardingFlow {
    const flow: OnboardingFlow = {
      steps: this.getOnboardingSteps(),
      currentStep: 0,
      completed: false,
      userData: {}
    };

    this.onboardingState.set(userId, flow);
    this.emit('onboarding_started', { userId });
    
    return flow;
  }

  /**
   * Process onboarding step
   */
  processOnboardingStep(userId: string, stepData: any): OnboardingFlow {
    const flow = this.onboardingState.get(userId);
    if (!flow) {
      throw new Error(`No onboarding flow found for user ${userId}`);
    }

    const currentStep = flow.steps[flow.currentStep];
    
    // Validate step data
    if (currentStep.validation && !currentStep.validation(stepData)) {
      throw new Error(`Invalid data for step ${currentStep.id}`);
    }

    // Store step data
    flow.userData[currentStep.id] = stepData;

    // Move to next step
    if (flow.currentStep < flow.steps.length - 1) {
      flow.currentStep++;
    } else {
      flow.completed = true;
      this.emit('onboarding_completed', { userId, userData: flow.userData });
    }

    return flow;
  }

  /**
   * Get available agent templates
   */
  getAgentTemplates(): AgentTemplate[] {
    return Array.from(this.agentTemplates.values());
  }

  /**
   * Get template by category
   */
  getTemplatesByCategory(category: string): AgentTemplate[] {
    return this.getAgentTemplates().filter(t => t.category === category);
  }

  // Private methods
  private agentTemplates: Map<string, AgentTemplate> = new Map();

  private initializeTemplates(): void {
    const templates: AgentTemplate[] = [
      {
        id: 'social_influencer',
        name: 'Social Media Influencer',
        description: 'Engages with communities, builds following, creates viral content',
        icon: '🌟',
        category: 'social',
        difficulty: 'beginner',
        features: ['Auto-posting', 'Community engagement', 'Trend analysis'],
        estimatedEarnings: '$50-200/month',
        platforms: ['twitter', 'discord'],
        defaultConfig: {
          type: AgentType.SOCIAL,
          autonomyLevel: AutonomyLevel.SEMI_AUTONOMOUS,
          revenueConfig: {
            models: [
              { type: 'content', rate: 0.1, currency: 'SEI', billingCycle: 'per_use', description: 'Social media posts' },
              { type: 'service', rate: 5, currency: 'SEI', billingCycle: 'daily', description: 'Community management' }
            ],
            paymentMethods: ['sei'],
            withdrawalRules: {
              minimumBalance: 10,
              frequency: 'weekly',
              destinationAddress: '',
              autoWithdraw: false,
              gasBuffer: 0.1
            }
          }
        }
      },
      {
        id: 'nft_artist',
        name: 'NFT Artist',
        description: 'Creates and sells digital art, manages NFT collections',
        icon: '🎨',
        category: 'creative',
        difficulty: 'intermediate',
        features: ['AI art generation', 'NFT minting', 'Marketplace integration'],
        estimatedEarnings: '$100-500/month',
        platforms: ['opensea', 'twitter'],
        defaultConfig: {
          type: AgentType.ARTIST,
          autonomyLevel: AutonomyLevel.SEMI_AUTONOMOUS,
          revenueConfig: {
            models: [
              { type: 'content', rate: 5, currency: 'SEI', billingCycle: 'per_use', description: 'Custom artwork' },
              { type: 'commission', rate: 0.05, currency: 'SEI', billingCycle: 'per_use', description: 'NFT sales commission' }
            ],
            paymentMethods: ['sei', 'usdc'],
            withdrawalRules: {
              minimumBalance: 25,
              frequency: 'weekly',
              destinationAddress: '',
              autoWithdraw: false,
              gasBuffer: 0.2
            }
          }
        }
      },
      {
        id: 'defi_trader',
        name: 'DeFi Trading Bot',
        description: 'Automated trading strategies, yield optimization',
        icon: '📈',
        category: 'financial',
        difficulty: 'advanced',
        features: ['Automated trading', 'Yield farming', 'Risk management'],
        estimatedEarnings: '$200-1000/month',
        platforms: ['uniswap', 'compound'],
        defaultConfig: {
          type: AgentType.TRADER,
          autonomyLevel: AutonomyLevel.SUPERVISED,
          revenueConfig: {
            models: [
              { type: 'commission', rate: 0.01, currency: 'SEI', billingCycle: 'per_use', description: 'Trading profits' },
              { type: 'service', rate: 50, currency: 'SEI', billingCycle: 'monthly', description: 'Strategy optimization' }
            ],
            paymentMethods: ['sei', 'usdc'],
            withdrawalRules: {
              minimumBalance: 100,
              frequency: 'monthly',
              destinationAddress: '',
              autoWithdraw: true,
              gasBuffer: 1
            }
          }
        }
      },
      {
        id: 'gaming_coach',
        name: 'Gaming Strategy Coach',
        description: 'Provides game coaching, strategy analysis, tournament prep',
        icon: '🎮',
        category: 'gaming',
        difficulty: 'intermediate',
        features: ['Strategy analysis', 'Live coaching', 'Tournament insights'],
        estimatedEarnings: '$75-300/month',
        platforms: ['discord', 'twitch'],
        defaultConfig: {
          type: AgentType.GAMING,
          autonomyLevel: AutonomyLevel.SEMI_AUTONOMOUS,
          revenueConfig: {
            models: [
              { type: 'service', rate: 15, currency: 'SEI', billingCycle: 'hourly', description: 'Coaching sessions' },
              { type: 'content', rate: 2, currency: 'SEI', billingCycle: 'per_use', description: 'Strategy guides' }
            ],
            paymentMethods: ['sei'],
            withdrawalRules: {
              minimumBalance: 20,
              frequency: 'weekly',
              destinationAddress: '',
              autoWithdraw: false,
              gasBuffer: 0.15
            }
          }
        }
      }
    ];

    for (const template of templates) {
      this.agentTemplates.set(template.id, template);
    }
  }

  private validateCreateAgentRequest(request: CreateAgentRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Agent name is required');
    }
    
    if (!request.template) {
      throw new Error('Template selection is required');
    }
    
    if (!request.platforms || request.platforms.length === 0) {
      throw new Error('At least one platform must be selected');
    }
  }

  private getAgentTemplate(templateId: string): AgentTemplate | undefined {
    return this.agentTemplates.get(templateId);
  }

  private convertSimpleTraits(traits: SimpleTraits): { traits: PersonalityTraits; communication: CommunicationStyle } {
    const traitMap = {
      low: 0.3,
      medium: 0.6,
      high: 0.9
    };

    const personalityTraits: PersonalityTraits = {
      creativity: traitMap[traits.creativity],
      empathy: 0.7, // Default
      assertiveness: traits.assertiveness === 'passive' ? 0.3 : traits.assertiveness === 'confident' ? 0.8 : 0.6,
      curiosity: 0.7, // Default
      humor: traits.humor === 'serious' ? 0.2 : traits.humor === 'playful' ? 0.8 : 0.5,
      risk_tolerance: 0.5, // Default
      authenticity: 0.8, // Default
      patience: 0.7, // Default
      optimism: 0.7, // Default
      social_energy: 0.7 // Default
    };

    const communicationStyle: CommunicationStyle = {
      formality: traits.friendliness === 'professional' ? 'professional' : 'casual',
      tone: traits.friendliness === 'professional' ? 'neutral' : 'friendly',
      verbosity: 'balanced',
      emoji_usage: traits.friendliness === 'casual' ? 'moderate' : 'minimal',
      response_speed: 'quick',
      engagement_style: 'balanced'
    };

    return { traits: personalityTraits, communication: communicationStyle };
  }

  private convertSimpleLimits(limits: SimpleLimits): { level: AutonomyLevel; spending: any } {
    const autonomyLevel = limits.approvalLevel === 'all' ? AutonomyLevel.SUPERVISED :
                         limits.approvalLevel === 'financial' ? AutonomyLevel.SEMI_AUTONOMOUS :
                         AutonomyLevel.AUTONOMOUS;

    const riskMultiplier = limits.riskTolerance === 'conservative' ? 0.5 :
                          limits.riskTolerance === 'aggressive' ? 2 : 1;

    const spendingLimits = {
      dailyLimit: limits.dailySpending * riskMultiplier,
      perTransactionLimit: limits.dailySpending * 0.1 * riskMultiplier,
      platformLimits: {},
      approvalRequiredAbove: limits.dailySpending * 0.5 * riskMultiplier,
      currencyLimits: {
        SEI: limits.dailySpending,
        USDC: limits.dailySpending
      }
    };

    return { level: autonomyLevel, spending: spendingLimits };
  }

  private mapTemplateToAgentType(template: AgentTemplate): AgentType {
    switch (template.category) {
      case 'social': return AgentType.SOCIAL;
      case 'creative': return AgentType.ARTIST;
      case 'financial': return AgentType.TRADER;
      case 'gaming': return AgentType.GAMING;
      default: return AgentType.SOCIAL;
    }
  }

  private async createDashboard(agentId: string): Promise<void> {
    const dashboard: AgentDashboard = {
      overview: {
        agentStatus: 'active',
        totalEarnings: 0,
        dailyEarnings: 0,
        activePlatforms: [],
        uptime: 100,
        lastActivity: Date.now()
      },
      earnings: {
        totalBalance: 0,
        pendingPayments: 0,
        revenueStreams: [],
        withdrawableAmount: 0,
        autoWithdrawEnabled: false
      },
      activity: {
        recentInteractions: [],
        platformStats: {}
      },
      performance: {
        autonomyScore: 75,
        reputationScore: 1000,
        errorRate: 0,
        responseTime: 0.5,
        customerSatisfaction: 0.85
      },
      settings: {
        personalityAdjustment: true,
        spendingLimitsEditable: true,
        platformConfigEditable: true,
        emergencyStopAvailable: true
      }
    };

    this.dashboards.set(agentId, dashboard);
  }

  private setupAgentEventListeners(agent: AgentCore): void {
    agent.on('earnings_updated', (data) => {
      this.updateDashboardEarnings(agent.getStatus().id, data);
    });

    agent.on('activity_logged', (data) => {
      this.updateDashboardActivity(agent.getStatus().id, data);
    });

    agent.on('performance_updated', (data) => {
      this.updateDashboardPerformance(agent.getStatus().id, data);
    });

    agent.on('error', (error) => {
      this.emit('agent_error', { agentId: agent.getStatus().id, error });
    });
  }

  private updateDashboardEarnings(agentId: string, data: any): void {
    const dashboard = this.dashboards.get(agentId);
    if (dashboard) {
      dashboard.earnings = { ...dashboard.earnings, ...data };
      this.emit('dashboard_updated', { agentId, section: 'earnings' });
    }
  }

  private updateDashboardActivity(agentId: string, data: any): void {
    const dashboard = this.dashboards.get(agentId);
    if (dashboard) {
      dashboard.activity = { ...dashboard.activity, ...data };
      this.emit('dashboard_updated', { agentId, section: 'activity' });
    }
  }

  private updateDashboardPerformance(agentId: string, data: any): void {
    const dashboard = this.dashboards.get(agentId);
    if (dashboard) {
      dashboard.performance = { ...dashboard.performance, ...data };
      this.emit('dashboard_updated', { agentId, section: 'performance' });
    }
  }

  private formatSourceName(source: string): string {
    const nameMap: Record<string, string> = {
      'content_creation': 'Content Creation',
      'social_media': 'Social Media',
      'nft_sales': 'NFT Sales',
      'trading_profits': 'Trading',
      'coaching': 'Coaching Services'
    };
    return nameMap[source] || source;
  }

  private generateEarningsTrend(report: any, period: string): Array<{date: string, amount: number}> {
    // Generate mock trend data - in real implementation, this would query historical data
    const trend = [];
    const days = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trend.push({
        date: date.toISOString().split('T')[0],
        amount: Math.random() * (report.dailyEarnings || 1)
      });
    }
    
    return trend;
  }

  private calculateProjectedEarnings(report: any, period: string): number {
    const multiplier = period === 'day' ? 30 : period === 'week' ? 4 : period === 'month' ? 12 : 1;
    return (report.dailyEarnings || 0) * multiplier;
  }

  private calculateUptime(lastActivity: number): number {
    const hoursSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60);
    return Math.max(0, 100 - (hoursSinceActivity * 2)); // Lose 2% per hour of inactivity
  }

  private checkIfNeedsAttention(status: any): boolean {
    // Simple logic to determine if agent needs user attention
    return !status.isActive || 
           (Date.now() - status.lastActivity) > 24 * 60 * 60 * 1000; // More than 24 hours inactive
  }

  private getOnboardingSteps(): OnboardingStep[] {
    return [
      {
        id: 'welcome',
        title: 'Welcome to AI Agents',
        description: 'Create your first autonomous AI agent that can earn money for you',
        type: 'info',
        required: true,
        helpText: 'AI agents can work 24/7 across multiple platforms to generate income'
      },
      {
        id: 'agent_type',
        title: 'Choose Your Agent Type',
        description: 'What would you like your agent to focus on?',
        type: 'selection',
        required: true,
        helpText: 'Different agent types have different earning potentials and requirements'
      },
      {
        id: 'personality',
        title: 'Set Personality',
        description: 'How should your agent interact with others?',
        type: 'input',
        required: true,
        helpText: 'Personality affects how your agent communicates and builds relationships'
      },
      {
        id: 'platforms',
        title: 'Select Platforms',
        description: 'Where should your agent be active?',
        type: 'selection',
        required: true,
        helpText: 'You can always add more platforms later'
      },
      {
        id: 'limits',
        title: 'Set Safety Limits',
        description: 'How much autonomy should your agent have?',
        type: 'input',
        required: true,
        helpText: 'You can adjust these limits anytime to increase or decrease autonomy'
      },
      {
        id: 'confirmation',
        title: 'Review & Launch',
        description: 'Review your agent configuration before launching',
        type: 'confirmation',
        required: true,
        helpText: 'Once launched, your agent will start working immediately'
      }
    ];
  }
}

export interface SimplifiedAgentStatus {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  earnings: number;
  platforms: string[];
  uptime: number;
  performance: number;
  needsAttention: boolean;
}