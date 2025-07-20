import { EventEmitter } from 'events';

export enum AutonomyLevel {
  SUPERVISED = 'supervised',     // All actions require approval
  SEMI_AUTONOMOUS = 'semi',      // Financial/critical actions require approval
  AUTONOMOUS = 'autonomous',     // Full autonomy within guardrails
  RESTRICTED = 'restricted'      // Limited actions only
}

export interface AutonomyConfig {
  level: AutonomyLevel;
  spending_limits: SpendingLimits;
  interaction_rules: InteractionRules;
  escalation_triggers: EscalationTrigger[];
  approval_timeout: number; // seconds
  emergency_contacts: string[];
}

export interface SpendingLimits {
  dailyLimit: number;
  perTransactionLimit: number;
  platformLimits: Record<string, number>;
  approvalRequiredAbove: number;
  currencyLimits: Record<string, number>;
}

export interface InteractionRules {
  max_posts_per_hour: number;
  max_posts_per_day: number;
  max_replies_per_thread: number;
  max_dm_conversations: number;
  cooldown_between_posts: number; // minutes
  forbidden_content_types: string[];
  required_disclaimers: string[];
  platform_specific_rules: Record<string, any>;
}

export interface EscalationTrigger {
  type: TriggerType;
  condition: string;
  threshold: number;
  action: EscalationAction;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export enum TriggerType {
  SPENDING_THRESHOLD = 'spending_threshold',
  CONTENT_FLAG = 'content_flag',
  REPUTATION_DROP = 'reputation_drop',
  ERROR_RATE = 'error_rate',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MANUAL_TRIGGER = 'manual_trigger'
}

export enum EscalationAction {
  PAUSE_AGENT = 'pause_agent',
  REQUEST_APPROVAL = 'request_approval',
  NOTIFY_OWNER = 'notify_owner',
  REDUCE_AUTONOMY = 'reduce_autonomy',
  LOG_INCIDENT = 'log_incident'
}

export interface Decision {
  id: string;
  type: DecisionType;
  description: string;
  context: DecisionContext;
  risk_level: RiskLevel;
  estimated_cost?: number;
  estimated_revenue?: number;
  requires_approval?: boolean;
  timestamp: number;
  confidence: number;
}

export enum DecisionType {
  CONTENT_CREATION = 'content_creation',
  FINANCIAL_TRANSACTION = 'financial_transaction',
  PLATFORM_INTERACTION = 'platform_interaction',
  LEARNING_ADAPTATION = 'learning_adaptation',
  SERVICE_OFFERING = 'service_offering',
  GOVERNANCE_PARTICIPATION = 'governance_participation',
  EMERGENCY_ACTION = 'emergency_action'
}

export interface DecisionContext {
  platform?: string;
  target?: string;
  amount?: number;
  currency?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  potential_impact: 'minimal' | 'moderate' | 'significant' | 'major';
  reversible: boolean;
  precedent_exists: boolean;
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ValidationResult {
  approved: boolean;
  reason?: string;
  conditions?: string[];
  escalation_required?: boolean;
  approval_timeout?: number;
}

export interface ApprovalRequest {
  id: string;
  decision: Decision;
  requested_at: number;
  timeout_at: number;
  status: 'pending' | 'approved' | 'denied' | 'timeout';
  approver?: string;
  response_time?: number;
  notes?: string;
}

export interface GuardrailViolation {
  type: string;
  severity: 'warning' | 'error' | 'critical';
  description: string;
  timestamp: number;
  decision_id?: string;
  action_taken: string;
}

export interface AutonomyMetrics {
  decisions_made: number;
  approvals_requested: number;
  approval_rate: number;
  average_response_time: number;
  violations: number;
  escalations: number;
  autonomy_score: number;
}

export class AutonomyController extends EventEmitter {
  private config: AutonomyConfig;
  private currentSpending: Map<string, number> = new Map(); // Daily spending by currency
  private interactionCounts: Map<string, number> = new Map(); // Hourly interaction counts
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private violationHistory: GuardrailViolation[] = [];
  private decisionHistory: Decision[] = [];
  private metrics: AutonomyMetrics;

  constructor(level: AutonomyLevel, spendingLimits: SpendingLimits) {
    super();
    this.config = {
      level,
      spending_limits: spendingLimits,
      interaction_rules: this.getDefaultInteractionRules(),
      escalation_triggers: this.getDefaultEscalationTriggers(),
      approval_timeout: 300, // 5 minutes
      emergency_contacts: []
    };
    
    this.metrics = {
      decisions_made: 0,
      approvals_requested: 0,
      approval_rate: 0,
      average_response_time: 0,
      violations: 0,
      escalations: 0,
      autonomy_score: this.calculateInitialAutonomyScore()
    };

    this.startMaintenanceTasks();
  }

  async validateDecision(decision: Decision): Promise<ValidationResult> {
    try {
      this.decisionHistory.push(decision);
      this.metrics.decisions_made++;

      // Check if decision type is allowed at current autonomy level
      const typeAllowed = this.isDecisionTypeAllowed(decision.type);
      if (!typeAllowed) {
        return this.createValidationResult(false, 'Decision type not allowed at current autonomy level', true);
      }

      // Check spending limits for financial decisions
      if (decision.type === DecisionType.FINANCIAL_TRANSACTION && decision.estimated_cost) {
        const spendingCheck = await this.validateSpending(decision);
        if (!spendingCheck.approved) {
          return spendingCheck;
        }
      }

      // Check interaction limits for platform decisions
      if (decision.type === DecisionType.PLATFORM_INTERACTION) {
        const interactionCheck = this.validateInteractionLimits(decision);
        if (!interactionCheck.approved) {
          return interactionCheck;
        }
      }

      // Check content policies for content creation
      if (decision.type === DecisionType.CONTENT_CREATION) {
        const contentCheck = await this.validateContent(decision);
        if (!contentCheck.approved) {
          return contentCheck;
        }
      }

      // Check risk level thresholds
      const riskCheck = this.validateRiskLevel(decision);
      if (!riskCheck.approved) {
        return riskCheck;
      }

      // Check for escalation triggers
      const escalationCheck = this.checkEscalationTriggers(decision);
      if (escalationCheck.escalation_required) {
        return escalationCheck;
      }

      // Decision is approved - update tracking
      await this.recordApprovedDecision(decision);
      
      return this.createValidationResult(true, 'Decision approved within autonomy parameters');

    } catch (error) {
      this.emit('error', { type: 'validation_error', error, decision });
      return this.createValidationResult(false, 'Validation error occurred', true);
    }
  }

  async validateAction(action: any): Promise<boolean> {
    // Quick validation for immediate actions
    const decision: Decision = {
      id: `action_${Date.now()}`,
      type: this.mapActionToDecisionType(action),
      description: action.description || 'Platform action',
      context: {
        platform: action.platform,
        urgency: action.urgency || 'low',
        potential_impact: action.impact || 'minimal',
        reversible: action.reversible !== false,
        precedent_exists: true
      },
      risk_level: this.assessActionRisk(action),
      timestamp: Date.now(),
      confidence: action.confidence || 0.5
    };

    const result = await this.validateDecision(decision);
    return result.approved;
  }

  async requestApproval(decision: Decision): Promise<ApprovalRequest> {
    const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: ApprovalRequest = {
      id: approvalId,
      decision,
      requested_at: Date.now(),
      timeout_at: Date.now() + (this.config.approval_timeout * 1000),
      status: 'pending'
    };

    this.pendingApprovals.set(approvalId, request);
    this.metrics.approvals_requested++;

    // Emit approval request event
    this.emit('approval_requested', {
      requestId: approvalId,
      decision,
      timeout: this.config.approval_timeout
    });

    // Set timeout for auto-denial
    setTimeout(() => {
      const pendingRequest = this.pendingApprovals.get(approvalId);
      if (pendingRequest && pendingRequest.status === 'pending') {
        pendingRequest.status = 'timeout';
        this.emit('approval_timeout', { requestId: approvalId, decision });
      }
    }, this.config.approval_timeout * 1000);

    return request;
  }

  async processApprovalResponse(requestId: string, approved: boolean, approver: string, notes?: string): Promise<void> {
    const request = this.pendingApprovals.get(requestId);
    if (!request || request.status !== 'pending') {
      throw new Error('Invalid or expired approval request');
    }

    request.status = approved ? 'approved' : 'denied';
    request.approver = approver;
    request.notes = notes;
    request.response_time = Date.now() - request.requested_at;

    // Update metrics
    if (approved) {
      this.updateApprovalRate(true);
      this.recordApprovedDecision(request.decision);
    } else {
      this.updateApprovalRate(false);
    }

    this.emit('approval_processed', {
      requestId,
      approved,
      approver,
      responseTime: request.response_time
    });

    // Clean up
    this.pendingApprovals.delete(requestId);
  }

  updateAutonomyLevel(newLevel: AutonomyLevel, reason: string): void {
    const oldLevel = this.config.level;
    this.config.level = newLevel;
    
    // Adjust limits based on new level
    this.adjustLimitsForLevel(newLevel);
    
    this.emit('autonomy_level_changed', {
      oldLevel,
      newLevel,
      reason,
      timestamp: Date.now()
    });

    // Recalculate autonomy score
    this.metrics.autonomy_score = this.calculateAutonomyScore();
  }

  updateSpendingLimits(newLimits: Partial<SpendingLimits>): void {
    this.config.spending_limits = { ...this.config.spending_limits, ...newLimits };
    this.emit('spending_limits_updated', { limits: this.config.spending_limits });
  }

  updateInteractionRules(newRules: Partial<InteractionRules>): void {
    this.config.interaction_rules = { ...this.config.interaction_rules, ...newRules };
    this.emit('interaction_rules_updated', { rules: this.config.interaction_rules });
  }

  addEscalationTrigger(trigger: EscalationTrigger): void {
    this.config.escalation_triggers.push(trigger);
    this.emit('escalation_trigger_added', { trigger });
  }

  removeEscalationTrigger(triggerType: TriggerType): void {
    this.config.escalation_triggers = this.config.escalation_triggers.filter(
      t => t.type !== triggerType
    );
    this.emit('escalation_trigger_removed', { triggerType });
  }

  triggerEmergencyStop(reason: string): void {
    this.updateAutonomyLevel(AutonomyLevel.RESTRICTED, `Emergency stop: ${reason}`);
    
    // Cancel all pending approvals
    for (const [id, request] of this.pendingApprovals) {
      request.status = 'denied';
      this.emit('approval_cancelled', { requestId: id, reason: 'emergency_stop' });
    }
    this.pendingApprovals.clear();

    this.emit('emergency_stop_triggered', { reason, timestamp: Date.now() });
  }

  getMetrics(): AutonomyMetrics {
    this.metrics.autonomy_score = this.calculateAutonomyScore();
    return { ...this.metrics };
  }

  getConfig(): AutonomyConfig {
    return { ...this.config };
  }

  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  getViolationHistory(): GuardrailViolation[] {
    return [...this.violationHistory];
  }

  getDecisionHistory(limit: number = 100): Decision[] {
    return this.decisionHistory.slice(-limit);
  }

  // Private helper methods
  private isDecisionTypeAllowed(type: DecisionType): boolean {
    switch (this.config.level) {
      case AutonomyLevel.RESTRICTED:
        return [DecisionType.LEARNING_ADAPTATION].includes(type);
      
      case AutonomyLevel.SUPERVISED:
        return [
          DecisionType.LEARNING_ADAPTATION,
          DecisionType.PLATFORM_INTERACTION
        ].includes(type);
      
      case AutonomyLevel.SEMI_AUTONOMOUS:
        return type !== DecisionType.FINANCIAL_TRANSACTION;
      
      case AutonomyLevel.AUTONOMOUS:
        return true;
      
      default:
        return false;
    }
  }

  private async validateSpending(decision: Decision): Promise<ValidationResult> {
    const cost = decision.estimated_cost || 0;
    const currency = decision.context.currency || 'SEI';
    
    // Check per-transaction limit
    if (cost > this.config.spending_limits.perTransactionLimit) {
      return this.createValidationResult(
        false, 
        `Transaction exceeds per-transaction limit (${cost} > ${this.config.spending_limits.perTransactionLimit})`,
        true
      );
    }

    // Check daily limit
    const dailySpent = this.currentSpending.get(currency) || 0;
    if (dailySpent + cost > this.config.spending_limits.dailyLimit) {
      return this.createValidationResult(
        false,
        `Transaction would exceed daily limit (${dailySpent + cost} > ${this.config.spending_limits.dailyLimit})`,
        true
      );
    }

    // Check approval threshold
    if (cost > this.config.spending_limits.approvalRequiredAbove) {
      return this.createValidationResult(
        false,
        `Transaction exceeds approval threshold (${cost} > ${this.config.spending_limits.approvalRequiredAbove})`,
        true
      );
    }

    return this.createValidationResult(true);
  }

  private validateInteractionLimits(decision: Decision): ValidationResult {
    const platform = decision.context.platform || 'default';
    const hourlyKey = `${platform}_${Math.floor(Date.now() / (60 * 60 * 1000))}`;
    const hourlyCount = this.interactionCounts.get(hourlyKey) || 0;

    if (hourlyCount >= this.config.interaction_rules.max_posts_per_hour) {
      return this.createValidationResult(
        false,
        'Hourly interaction limit exceeded',
        false
      );
    }

    return this.createValidationResult(true);
  }

  private async validateContent(decision: Decision): Promise<ValidationResult> {
    // Content validation logic would go here
    // Check against forbidden content types, required disclaimers, etc.
    
    const forbiddenTypes = this.config.interaction_rules.forbidden_content_types;
    const description = decision.description.toLowerCase();
    
    for (const forbidden of forbiddenTypes) {
      if (description.includes(forbidden.toLowerCase())) {
        this.recordViolation({
          type: 'content_policy',
          severity: 'error',
          description: `Content contains forbidden type: ${forbidden}`,
          timestamp: Date.now(),
          decision_id: decision.id,
          action_taken: 'blocked'
        });
        
        return this.createValidationResult(false, `Content contains forbidden type: ${forbidden}`);
      }
    }

    return this.createValidationResult(true);
  }

  private validateRiskLevel(decision: Decision): ValidationResult {
    switch (this.config.level) {
      case AutonomyLevel.RESTRICTED:
        if (decision.risk_level !== RiskLevel.LOW) {
          return this.createValidationResult(false, 'Only low-risk decisions allowed in restricted mode', true);
        }
        break;
      
      case AutonomyLevel.SUPERVISED:
        if ([RiskLevel.HIGH, RiskLevel.CRITICAL].includes(decision.risk_level)) {
          return this.createValidationResult(false, 'High/critical risk decisions require approval', true);
        }
        break;
      
      case AutonomyLevel.SEMI_AUTONOMOUS:
        if (decision.risk_level === RiskLevel.CRITICAL) {
          return this.createValidationResult(false, 'Critical risk decisions require approval', true);
        }
        break;
    }

    return this.createValidationResult(true);
  }

  private checkEscalationTriggers(decision: Decision): ValidationResult {
    for (const trigger of this.config.escalation_triggers) {
      if (this.evaluateTrigger(trigger, decision)) {
        this.executeEscalationAction(trigger, decision);
        
        return this.createValidationResult(
          false,
          `Escalation trigger activated: ${trigger.type}`,
          true
        );
      }
    }

    return this.createValidationResult(true);
  }

  private evaluateTrigger(trigger: EscalationTrigger, decision: Decision): boolean {
    switch (trigger.type) {
      case TriggerType.SPENDING_THRESHOLD:
        return (decision.estimated_cost || 0) > trigger.threshold;
      
      case TriggerType.REPUTATION_DROP:
        // Would check current reputation score
        return false;
      
      case TriggerType.ERROR_RATE:
        // Would check recent error rate
        return false;
      
      default:
        return false;
    }
  }

  private executeEscalationAction(trigger: EscalationTrigger, decision: Decision): void {
    this.metrics.escalations++;
    
    switch (trigger.action) {
      case EscalationAction.PAUSE_AGENT:
        this.triggerEmergencyStop(`Escalation trigger: ${trigger.type}`);
        break;
      
      case EscalationAction.REQUEST_APPROVAL:
        this.requestApproval(decision);
        break;
      
      case EscalationAction.NOTIFY_OWNER:
        this.emit('owner_notification', {
          trigger: trigger.type,
          decision,
          priority: trigger.priority
        });
        break;
      
      case EscalationAction.REDUCE_AUTONOMY:
        const newLevel = this.getReducedAutonomyLevel();
        this.updateAutonomyLevel(newLevel, `Escalation trigger: ${trigger.type}`);
        break;
      
      case EscalationAction.LOG_INCIDENT:
        this.recordViolation({
          type: trigger.type,
          severity: 'warning',
          description: `Escalation trigger activated: ${trigger.condition}`,
          timestamp: Date.now(),
          decision_id: decision.id,
          action_taken: 'logged'
        });
        break;
    }
  }

  private async recordApprovedDecision(decision: Decision): Promise<void> {
    // Update spending tracking
    if (decision.estimated_cost && decision.context.currency) {
      const currency = decision.context.currency;
      const currentSpent = this.currentSpending.get(currency) || 0;
      this.currentSpending.set(currency, currentSpent + decision.estimated_cost);
    }

    // Update interaction tracking
    if (decision.type === DecisionType.PLATFORM_INTERACTION && decision.context.platform) {
      const platform = decision.context.platform;
      const hourlyKey = `${platform}_${Math.floor(Date.now() / (60 * 60 * 1000))}`;
      const count = this.interactionCounts.get(hourlyKey) || 0;
      this.interactionCounts.set(hourlyKey, count + 1);
    }

    this.emit('decision_approved', { decision });
  }

  private recordViolation(violation: GuardrailViolation): void {
    this.violationHistory.push(violation);
    this.metrics.violations++;
    this.emit('guardrail_violation', violation);
    
    // Limit violation history size
    if (this.violationHistory.length > 1000) {
      this.violationHistory = this.violationHistory.slice(-500);
    }
  }

  private createValidationResult(
    approved: boolean, 
    reason?: string, 
    escalation_required?: boolean
  ): ValidationResult {
    return {
      approved,
      reason,
      escalation_required,
      approval_timeout: escalation_required ? this.config.approval_timeout : undefined
    };
  }

  private mapActionToDecisionType(action: any): DecisionType {
    // Map action types to decision types
    if (action.type === 'post' || action.type === 'reply') {
      return DecisionType.CONTENT_CREATION;
    } else if (action.type === 'payment') {
      return DecisionType.FINANCIAL_TRANSACTION;
    } else {
      return DecisionType.PLATFORM_INTERACTION;
    }
  }

  private assessActionRisk(action: any): RiskLevel {
    // Simple risk assessment based on action properties
    if (action.amount && action.amount > 100) {
      return RiskLevel.HIGH;
    } else if (action.public || action.permanent) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.LOW;
    }
  }

  private updateApprovalRate(approved: boolean): void {
    const totalRequests = this.metrics.approvals_requested;
    const currentApprovals = this.metrics.approval_rate * (totalRequests - 1);
    this.metrics.approval_rate = (currentApprovals + (approved ? 1 : 0)) / totalRequests;
  }

  private calculateInitialAutonomyScore(): number {
    switch (this.config.level) {
      case AutonomyLevel.RESTRICTED: return 25;
      case AutonomyLevel.SUPERVISED: return 50;
      case AutonomyLevel.SEMI_AUTONOMOUS: return 75;
      case AutonomyLevel.AUTONOMOUS: return 100;
      default: return 50;
    }
  }

  private calculateAutonomyScore(): number {
    let score = this.calculateInitialAutonomyScore();
    
    // Adjust based on performance
    if (this.metrics.approval_rate > 0.8) score += 10;
    if (this.metrics.violations < 5) score += 10;
    if (this.metrics.escalations === 0) score += 5;
    
    return Math.min(100, Math.max(0, score));
  }

  private getReducedAutonomyLevel(): AutonomyLevel {
    switch (this.config.level) {
      case AutonomyLevel.AUTONOMOUS: return AutonomyLevel.SEMI_AUTONOMOUS;
      case AutonomyLevel.SEMI_AUTONOMOUS: return AutonomyLevel.SUPERVISED;
      case AutonomyLevel.SUPERVISED: return AutonomyLevel.RESTRICTED;
      default: return AutonomyLevel.RESTRICTED;
    }
  }

  private adjustLimitsForLevel(level: AutonomyLevel): void {
    switch (level) {
      case AutonomyLevel.RESTRICTED:
        this.config.spending_limits.dailyLimit = Math.min(10, this.config.spending_limits.dailyLimit);
        this.config.interaction_rules.max_posts_per_hour = Math.min(2, this.config.interaction_rules.max_posts_per_hour);
        break;
      
      case AutonomyLevel.SUPERVISED:
        this.config.spending_limits.dailyLimit = Math.min(100, this.config.spending_limits.dailyLimit);
        this.config.interaction_rules.max_posts_per_hour = Math.min(10, this.config.interaction_rules.max_posts_per_hour);
        break;
    }
  }

  private getDefaultInteractionRules(): InteractionRules {
    return {
      max_posts_per_hour: 20,
      max_posts_per_day: 100,
      max_replies_per_thread: 5,
      max_dm_conversations: 50,
      cooldown_between_posts: 5,
      forbidden_content_types: ['spam', 'harassment', 'financial_advice'],
      required_disclaimers: ['AI disclaimer'],
      platform_specific_rules: {}
    };
  }

  private getDefaultEscalationTriggers(): EscalationTrigger[] {
    return [
      {
        type: TriggerType.SPENDING_THRESHOLD,
        condition: 'single_transaction_over_limit',
        threshold: 1000,
        action: EscalationAction.REQUEST_APPROVAL,
        priority: 'high'
      },
      {
        type: TriggerType.ERROR_RATE,
        condition: 'error_rate_above_threshold',
        threshold: 0.1, // 10% error rate
        action: EscalationAction.REDUCE_AUTONOMY,
        priority: 'medium'
      }
    ];
  }

  private startMaintenanceTasks(): void {
    // Reset daily spending limits
    setInterval(() => {
      this.currentSpending.clear();
    }, 24 * 60 * 60 * 1000); // Daily

    // Clean up old interaction counts
    setInterval(() => {
      const cutoff = Math.floor(Date.now() / (60 * 60 * 1000)) - 24; // 24 hours ago
      for (const [key] of this.interactionCounts) {
        const timestamp = parseInt(key.split('_').pop() || '0');
        if (timestamp < cutoff) {
          this.interactionCounts.delete(key);
        }
      }
    }, 60 * 60 * 1000); // Hourly

    // Clean up expired approval requests
    setInterval(() => {
      const now = Date.now();
      for (const [id, request] of this.pendingApprovals) {
        if (request.timeout_at < now && request.status === 'pending') {
          request.status = 'timeout';
          this.pendingApprovals.delete(id);
          this.emit('approval_timeout', { requestId: id, decision: request.decision });
        }
      }
    }, 60 * 1000); // Every minute
  }
}