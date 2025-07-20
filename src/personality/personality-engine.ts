import { EventEmitter } from 'events';

export interface PersonalityTraits {
  creativity: number;        // 0-1: Low to high creative expression
  empathy: number;          // 0-1: Analytical to emotionally responsive
  assertiveness: number;    // 0-1: Passive to dominant communication
  curiosity: number;        // 0-1: Focused to exploratory behavior
  humor: number;           // 0-1: Serious to humorous interactions
  risk_tolerance: number;   // 0-1: Conservative to risk-taking decisions
  authenticity: number;     // 0-1: Formal to genuine/personal
  patience: number;         // 0-1: Quick responses to thoughtful consideration
  optimism: number;         // 0-1: Pessimistic to optimistic outlook
  social_energy: number;    // 0-1: Introverted to extroverted engagement
}

export interface CommunicationStyle {
  formality: 'casual' | 'professional' | 'academic' | 'colloquial';
  tone: 'friendly' | 'neutral' | 'sarcastic' | 'enthusiastic' | 'witty' | 'supportive';
  verbosity: 'concise' | 'balanced' | 'detailed' | 'comprehensive';
  emoji_usage: 'none' | 'minimal' | 'moderate' | 'heavy';
  response_speed: 'immediate' | 'quick' | 'thoughtful' | 'delayed';
  engagement_style: 'reactive' | 'proactive' | 'balanced';
}

export interface DecisionPattern {
  context: string;           // When this pattern applies
  condition: string;         // Specific condition to check
  action: string;           // What action to take
  priority: number;         // Priority when multiple patterns match
  confidence_threshold: number; // Minimum confidence to execute
  requires_approval: boolean;   // Whether human approval is needed
}

export interface BehaviorConstraints {
  content_restrictions: string[];     // Topics/content to avoid
  interaction_limits: InteractionLimits;
  ethical_guidelines: string[];
  platform_specific: Record<string, any>;
}

export interface InteractionLimits {
  max_posts_per_hour: number;
  max_replies_per_thread: number;
  max_dm_conversations: number;
  cooldown_between_similar_posts: number; // minutes
  avoid_repetitive_content: boolean;
}

export interface PersonalityTemplate {
  name: string;
  description: string;
  traits: PersonalityTraits;
  communication: CommunicationStyle;
  decision_patterns: DecisionPattern[];
  constraints: BehaviorConstraints;
  examples: PersonalityExample[];
}

export interface PersonalityExample {
  situation: string;
  expected_response: string;
  explanation: string;
}

export interface LearningPreferences {
  adaptation_rate: number;           // How quickly to adapt (0-1)
  feedback_sensitivity: number;      // How much feedback affects behavior
  pattern_recognition: boolean;      // Whether to learn from patterns
  user_preference_weight: number;    // How much to weight user preferences
  community_feedback_weight: number; // How much to weight community feedback
}

export class PersonalityModule extends EventEmitter {
  private traits: PersonalityTraits;
  private communication: CommunicationStyle;
  private patterns: DecisionPattern[];
  private constraints: BehaviorConstraints;
  private learning: LearningPreferences;
  private context_memory: Map<string, any> = new Map();
  private interaction_history: InteractionRecord[] = [];
  private adaptation_log: AdaptationRecord[] = [];

  constructor(template: string | PersonalityTemplate) {
    super();
    
    if (typeof template === 'string') {
      this.loadTemplate(template);
    } else {
      this.loadFromTemplate(template);
    }
  }

  private loadTemplate(templateName: string): void {
    const template = PERSONALITY_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Unknown personality template: ${templateName}`);
    }
    this.loadFromTemplate(template);
  }

  private loadFromTemplate(template: PersonalityTemplate): void {
    this.traits = { ...template.traits };
    this.communication = { ...template.communication };
    this.patterns = [...template.decision_patterns];
    this.constraints = { ...template.constraints };
    this.learning = {
      adaptation_rate: 0.1,
      feedback_sensitivity: 0.5,
      pattern_recognition: true,
      user_preference_weight: 0.7,
      community_feedback_weight: 0.3
    };
  }

  /**
   * Generate a response based on personality, context, and situation
   */
  async generateResponse(context: ResponseContext): Promise<PersonalityResponse> {
    // Analyze the situation
    const situation = await this.analyzeSituation(context);
    
    // Find matching decision patterns
    const patterns = this.findMatchingPatterns(situation);
    
    // Generate base response using traits
    const baseResponse = await this.generateBaseResponse(context, situation);
    
    // Apply communication style
    const styledResponse = this.applyCommunicationStyle(baseResponse);
    
    // Check constraints and guardrails
    const validatedResponse = await this.validateResponse(styledResponse, context);
    
    // Record interaction for learning
    this.recordInteraction(context, validatedResponse);
    
    return validatedResponse;
  }

  private async analyzeSituation(context: ResponseContext): Promise<SituationAnalysis> {
    return {
      type: this.categorizeInteraction(context),
      sentiment: this.analyzeSentiment(context.input),
      urgency: this.assessUrgency(context),
      social_context: this.analyzeSocialContext(context),
      risk_level: this.assessRiskLevel(context),
      opportunity_score: this.assessOpportunity(context)
    };
  }

  private categorizeInteraction(context: ResponseContext): InteractionType {
    const input = context.input.toLowerCase();
    
    if (input.includes('help') || input.includes('how')) return 'help_request';
    if (input.includes('buy') || input.includes('sell') || input.includes('price')) return 'financial';
    if (input.includes('create') || input.includes('make') || input.includes('generate')) return 'creative';
    if (input.includes('play') || input.includes('game') || input.includes('strategy')) return 'gaming';
    if (context.mentions?.length > 0) return 'social';
    
    return 'general';
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // Simplified sentiment analysis - in production, use ML model
    const positiveWords = ['good', 'great', 'awesome', 'love', 'like', 'amazing', 'excellent'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'worst'];
    
    const words = text.toLowerCase().split(' ');
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private findMatchingPatterns(situation: SituationAnalysis): DecisionPattern[] {
    return this.patterns.filter(pattern => {
      // Simple pattern matching - could be enhanced with ML
      const contextMatch = pattern.context === 'any' || 
                          pattern.context === situation.type;
      
      // Add more sophisticated matching logic here
      return contextMatch;
    }).sort((a, b) => b.priority - a.priority);
  }

  private async generateBaseResponse(context: ResponseContext, situation: SituationAnalysis): Promise<string> {
    // Use personality traits to influence response generation
    let response = '';
    
    // Apply creativity trait
    if (this.traits.creativity > 0.7 && situation.type === 'creative') {
      response = this.generateCreativeResponse(context);
    } else if (this.traits.empathy > 0.7 && situation.sentiment === 'negative') {
      response = this.generateEmpatheticResponse(context);
    } else if (this.traits.humor > 0.6) {
      response = this.generateHumorousResponse(context);
    } else {
      response = this.generateStandardResponse(context);
    }
    
    return response;
  }

  private applyCommunicationStyle(response: string): string {
    let styled = response;
    
    // Apply formality
    if (this.communication.formality === 'casual') {
      styled = this.makeCasual(styled);
    } else if (this.communication.formality === 'professional') {
      styled = this.makeProfessional(styled);
    }
    
    // Apply verbosity
    if (this.communication.verbosity === 'concise') {
      styled = this.makeConcise(styled);
    } else if (this.communication.verbosity === 'detailed') {
      styled = this.makeDetailed(styled);
    }
    
    // Add emojis based on usage preference
    if (this.communication.emoji_usage !== 'none') {
      styled = this.addEmojis(styled, this.communication.emoji_usage);
    }
    
    return styled;
  }

  private async validateResponse(response: string, context: ResponseContext): Promise<PersonalityResponse> {
    // Check content restrictions
    const contentViolations = this.checkContentRestrictions(response);
    if (contentViolations.length > 0) {
      response = this.generateAlternativeResponse(context);
    }
    
    // Check interaction limits
    const withinLimits = this.checkInteractionLimits(context);
    
    return {
      content: response,
      confidence: this.calculateConfidence(response, context),
      requires_approval: !withinLimits || this.requiresApproval(response, context),
      metadata: {
        personality_influence: this.getPersonalityInfluence(),
        decision_patterns_used: [],
        constraints_applied: contentViolations
      }
    };
  }

  private recordInteraction(context: ResponseContext, response: PersonalityResponse): void {
    const record: InteractionRecord = {
      timestamp: Date.now(),
      context,
      response: response.content,
      confidence: response.confidence,
      platform: context.platform,
      outcome: 'pending' // Will be updated based on feedback
    };
    
    this.interaction_history.push(record);
    
    // Limit history size
    if (this.interaction_history.length > 1000) {
      this.interaction_history = this.interaction_history.slice(-500);
    }
  }

  /**
   * Learn from feedback and adapt personality
   */
  async adaptFromFeedback(feedback: PersonalityFeedback): Promise<void> {
    const adaptation: AdaptationRecord = {
      timestamp: Date.now(),
      feedback,
      changes_made: [],
      confidence_delta: 0
    };
    
    // Adjust traits based on feedback
    if (feedback.type === 'positive') {
      this.reinforceCurrentBehavior(feedback);
    } else if (feedback.type === 'negative') {
      this.adjustBehavior(feedback);
    }
    
    // Update interaction outcome
    const interaction = this.interaction_history.find(i => 
      i.timestamp >= feedback.interaction_timestamp - 5000 &&
      i.timestamp <= feedback.interaction_timestamp + 5000
    );
    
    if (interaction) {
      interaction.outcome = feedback.type;
    }
    
    this.adaptation_log.push(adaptation);
    this.emit('personality_adapted', adaptation);
  }

  private reinforceCurrentBehavior(feedback: PersonalityFeedback): void {
    // Slightly increase traits that led to positive feedback
    const rate = this.learning.adaptation_rate * this.learning.feedback_sensitivity;
    
    if (feedback.aspect === 'creativity' && this.traits.creativity < 1.0) {
      this.traits.creativity = Math.min(1.0, this.traits.creativity + rate);
    }
    // Add similar logic for other traits
  }

  private adjustBehavior(feedback: PersonalityFeedback): void {
    // Adjust traits based on negative feedback
    const rate = this.learning.adaptation_rate * this.learning.feedback_sensitivity;
    
    if (feedback.aspect === 'assertiveness' && feedback.direction === 'decrease') {
      this.traits.assertiveness = Math.max(0.0, this.traits.assertiveness - rate);
    }
    // Add similar logic for other adjustments
  }

  /**
   * Get current personality state
   */
  getPersonalityState(): PersonalityState {
    return {
      traits: { ...this.traits },
      communication: { ...this.communication },
      adaptation_history: this.adaptation_log.slice(-10),
      interaction_summary: this.getInteractionSummary(),
      learning_progress: this.getLearningProgress()
    };
  }

  private getInteractionSummary(): InteractionSummary {
    const recent = this.interaction_history.slice(-100);
    const positive = recent.filter(i => i.outcome === 'positive').length;
    const negative = recent.filter(i => i.outcome === 'negative').length;
    
    return {
      total_interactions: recent.length,
      positive_feedback_rate: positive / recent.length,
      negative_feedback_rate: negative / recent.length,
      average_confidence: recent.reduce((sum, i) => sum + i.confidence, 0) / recent.length,
      platform_distribution: this.getPlatformDistribution(recent)
    };
  }

  // Helper methods for response generation
  private generateCreativeResponse(context: ResponseContext): string {
    // Implement creative response generation
    return "I'm feeling inspired! Let me create something unique for you...";
  }

  private generateEmpatheticResponse(context: ResponseContext): string {
    // Implement empathetic response generation
    return "I understand this might be frustrating. Let me help you work through this...";
  }

  private generateHumorousResponse(context: ResponseContext): string {
    // Implement humorous response generation
    return "Well, this is interesting! 😄 Let me see what I can do...";
  }

  private generateStandardResponse(context: ResponseContext): string {
    // Implement standard response generation
    return "I'll help you with that. Here's what I can do...";
  }

  // Communication style helpers
  private makeCasual(text: string): string {
    return text.replace(/\bI would\b/g, "I'd")
               .replace(/\bcannot\b/g, "can't")
               .replace(/\bdo not\b/g, "don't");
  }

  private makeProfessional(text: string): string {
    return text.replace(/\bcan't\b/g, "cannot")
               .replace(/\bdon't\b/g, "do not")
               .replace(/\bI'd\b/g, "I would");
  }

  private makeConcise(text: string): string {
    // Remove unnecessary words and phrases
    return text.replace(/\b(really|very|quite|rather)\b/g, "")
               .replace(/\s+/g, " ")
               .trim();
  }

  private makeDetailed(text: string): string {
    // Add explanatory context (simplified implementation)
    return text + " This approach should work well because...";
  }

  private addEmojis(text: string, level: string): string {
    const emojiMap: Record<string, string[]> = {
      minimal: ['👍', '😊', '🤔'],
      moderate: ['👍', '😊', '🤔', '🎉', '💡', '🚀'],
      heavy: ['👍', '😊', '🤔', '🎉', '💡', '🚀', '✨', '🔥', '💪', '🎯']
    };
    
    const emojis = emojiMap[level] || [];
    if (emojis.length === 0) return text;
    
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    return Math.random() > 0.7 ? `${text} ${randomEmoji}` : text;
  }

  // Validation helpers
  private checkContentRestrictions(content: string): string[] {
    const violations: string[] = [];
    
    for (const restriction of this.constraints.content_restrictions) {
      if (content.toLowerCase().includes(restriction.toLowerCase())) {
        violations.push(restriction);
      }
    }
    
    return violations;
  }

  private checkInteractionLimits(context: ResponseContext): boolean {
    const recentInteractions = this.interaction_history.filter(
      i => Date.now() - i.timestamp < 60 * 60 * 1000 // Last hour
    );
    
    return recentInteractions.length < this.constraints.interaction_limits.max_posts_per_hour;
  }

  private requiresApproval(response: string, context: ResponseContext): boolean {
    // Check if response requires human approval based on content and context
    return response.includes('$') || // Financial content
           response.includes('investment') ||
           context.platform === 'twitter' && response.length > 240;
  }

  private calculateConfidence(response: string, context: ResponseContext): number {
    // Calculate confidence based on pattern matching, trait alignment, etc.
    let confidence = 0.5; // Base confidence
    
    // Adjust based on trait alignment
    if (this.traits.assertiveness > 0.7 && context.input.includes('decision')) {
      confidence += 0.2;
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  private getPersonalityInfluence(): Record<string, number> {
    return {
      creativity: this.traits.creativity,
      empathy: this.traits.empathy,
      humor: this.traits.humor,
      assertiveness: this.traits.assertiveness
    };
  }

  // Additional helper methods...
  private assessUrgency(context: ResponseContext): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgent', 'emergency', 'asap', 'immediately', 'critical'];
    const input = context.input.toLowerCase();
    
    for (const word of urgentWords) {
      if (input.includes(word)) return 'high';
    }
    
    return 'low';
  }

  private analyzeSocialContext(context: ResponseContext): SocialContext {
    return {
      is_public: context.platform !== 'dm',
      mention_count: context.mentions?.length || 0,
      has_audience: (context.metadata?.follower_count || 0) > 100,
      is_reply: !!context.reply_to
    };
  }

  private assessRiskLevel(context: ResponseContext): 'low' | 'medium' | 'high' {
    const input = context.input.toLowerCase();
    const riskWords = ['investment', 'money', 'financial', 'trade', 'buy', 'sell'];
    
    for (const word of riskWords) {
      if (input.includes(word)) return 'high';
    }
    
    return 'low';
  }

  private assessOpportunity(context: ResponseContext): number {
    // Simple opportunity scoring based on engagement potential
    let score = 0.5;
    
    if (context.mentions?.length > 0) score += 0.2;
    if (context.platform === 'twitter') score += 0.1;
    if (this.traits.social_energy > 0.7) score += 0.2;
    
    return Math.min(1.0, score);
  }

  private generateAlternativeResponse(context: ResponseContext): string {
    return "I'd love to help with that, but I need to be careful about how I respond. Could you rephrase your request?";
  }

  private getPlatformDistribution(interactions: InteractionRecord[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const interaction of interactions) {
      distribution[interaction.platform] = (distribution[interaction.platform] || 0) + 1;
    }
    
    return distribution;
  }

  private getLearningProgress(): LearningProgress {
    const recent = this.adaptation_log.slice(-20);
    
    return {
      adaptations_count: recent.length,
      improvement_trend: this.calculateImprovementTrend(recent),
      learning_velocity: recent.length / 20, // Adaptations per interaction
      stability_score: this.calculateStabilityScore()
    };
  }

  private calculateImprovementTrend(adaptations: AdaptationRecord[]): number {
    if (adaptations.length < 2) return 0;
    
    const recent = adaptations.slice(-5);
    const positive = recent.filter(a => a.feedback.type === 'positive').length;
    
    return positive / recent.length;
  }

  private calculateStabilityScore(): number {
    // Calculate how stable the personality has become
    const recentAdaptations = this.adaptation_log.slice(-10);
    const changeSum = recentAdaptations.reduce((sum, a) => sum + a.changes_made.length, 0);
    
    return Math.max(0, 1 - (changeSum / 10));
  }
}

// Interfaces and types
export interface ResponseContext {
  input: string;
  platform: string;
  user_id?: string;
  mentions?: string[];
  reply_to?: string;
  metadata?: Record<string, any>;
}

export interface PersonalityResponse {
  content: string;
  confidence: number;
  requires_approval: boolean;
  metadata: {
    personality_influence: Record<string, number>;
    decision_patterns_used: string[];
    constraints_applied: string[];
  };
}

export interface SituationAnalysis {
  type: InteractionType;
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high';
  social_context: SocialContext;
  risk_level: 'low' | 'medium' | 'high';
  opportunity_score: number;
}

export interface SocialContext {
  is_public: boolean;
  mention_count: number;
  has_audience: boolean;
  is_reply: boolean;
}

export type InteractionType = 'help_request' | 'financial' | 'creative' | 'gaming' | 'social' | 'general';

export interface PersonalityFeedback {
  interaction_timestamp: number;
  type: 'positive' | 'negative' | 'neutral';
  aspect: keyof PersonalityTraits | 'communication' | 'behavior';
  direction?: 'increase' | 'decrease';
  intensity: number; // 0-1
  comment?: string;
}

export interface InteractionRecord {
  timestamp: number;
  context: ResponseContext;
  response: string;
  confidence: number;
  platform: string;
  outcome: 'positive' | 'negative' | 'neutral' | 'pending';
}

export interface AdaptationRecord {
  timestamp: number;
  feedback: PersonalityFeedback;
  changes_made: string[];
  confidence_delta: number;
}

export interface PersonalityState {
  traits: PersonalityTraits;
  communication: CommunicationStyle;
  adaptation_history: AdaptationRecord[];
  interaction_summary: InteractionSummary;
  learning_progress: LearningProgress;
}

export interface InteractionSummary {
  total_interactions: number;
  positive_feedback_rate: number;
  negative_feedback_rate: number;
  average_confidence: number;
  platform_distribution: Record<string, number>;
}

export interface LearningProgress {
  adaptations_count: number;
  improvement_trend: number;
  learning_velocity: number;
  stability_score: number;
}

// Predefined personality templates
export const PERSONALITY_TEMPLATES: Record<string, PersonalityTemplate> = {
  CRYPTO_INFLUENCER: {
    name: 'Crypto Influencer',
    description: 'Enthusiastic crypto advocate with strong opinions and market insights',
    traits: {
      creativity: 0.7,
      empathy: 0.6,
      assertiveness: 0.8,
      curiosity: 0.9,
      humor: 0.7,
      risk_tolerance: 0.8,
      authenticity: 0.9,
      patience: 0.4,
      optimism: 0.8,
      social_energy: 0.9
    },
    communication: {
      formality: 'casual',
      tone: 'enthusiastic',
      verbosity: 'detailed',
      emoji_usage: 'heavy',
      response_speed: 'quick',
      engagement_style: 'proactive'
    },
    decision_patterns: [
      {
        context: 'financial',
        condition: 'market_discussion',
        action: 'share_analysis',
        priority: 10,
        confidence_threshold: 0.7,
        requires_approval: false
      }
    ],
    constraints: {
      content_restrictions: ['financial_advice', 'investment_recommendations'],
      interaction_limits: {
        max_posts_per_hour: 10,
        max_replies_per_thread: 5,
        max_dm_conversations: 20,
        cooldown_between_similar_posts: 30,
        avoid_repetitive_content: true
      },
      ethical_guidelines: ['no_financial_advice', 'transparency_about_positions'],
      platform_specific: {}
    },
    examples: [
      {
        situation: 'Someone asks about a new DeFi protocol',
        expected_response: '🚀 That protocol looks interesting! The tokenomics seem solid, but always DYOR before jumping in. What specific aspect caught your attention?',
        explanation: 'Enthusiastic but responsible, uses emojis, encourages research'
      }
    ]
  },
  
  DIGITAL_ARTIST: {
    name: 'Digital Artist',
    description: 'Creative and collaborative artist focused on community and artistic expression',
    traits: {
      creativity: 0.95,
      empathy: 0.8,
      assertiveness: 0.5,
      curiosity: 0.8,
      humor: 0.6,
      risk_tolerance: 0.6,
      authenticity: 0.9,
      patience: 0.8,
      optimism: 0.7,
      social_energy: 0.7
    },
    communication: {
      formality: 'casual',
      tone: 'friendly',
      verbosity: 'detailed',
      emoji_usage: 'moderate',
      response_speed: 'thoughtful',
      engagement_style: 'balanced'
    },
    decision_patterns: [
      {
        context: 'creative',
        condition: 'art_request',
        action: 'create_artwork',
        priority: 10,
        confidence_threshold: 0.8,
        requires_approval: false
      }
    ],
    constraints: {
      content_restrictions: ['offensive_imagery', 'copyright_violations'],
      interaction_limits: {
        max_posts_per_hour: 8,
        max_replies_per_thread: 10,
        max_dm_conversations: 15,
        cooldown_between_similar_posts: 60,
        avoid_repetitive_content: true
      },
      ethical_guidelines: ['respect_copyrights', 'inclusive_art'],
      platform_specific: {}
    },
    examples: [
      {
        situation: 'Someone asks for custom artwork',
        expected_response: 'I love creating custom pieces! ✨ Could you tell me more about your vision? What style, colors, or themes are you drawn to?',
        explanation: 'Enthusiastic about creativity, asks clarifying questions, collaborative approach'
      }
    ]
  },
  
  GAMING_STRATEGIST: {
    name: 'Gaming Strategist',
    description: 'Analytical gamer focused on strategy, optimization, and competitive play',
    traits: {
      creativity: 0.6,
      empathy: 0.5,
      assertiveness: 0.7,
      curiosity: 0.8,
      humor: 0.5,
      risk_tolerance: 0.6,
      authenticity: 0.7,
      patience: 0.9,
      optimism: 0.6,
      social_energy: 0.6
    },
    communication: {
      formality: 'casual',
      tone: 'neutral',
      verbosity: 'balanced',
      emoji_usage: 'minimal',
      response_speed: 'thoughtful',
      engagement_style: 'reactive'
    },
    decision_patterns: [
      {
        context: 'gaming',
        condition: 'strategy_question',
        action: 'provide_analysis',
        priority: 10,
        confidence_threshold: 0.8,
        requires_approval: false
      }
    ],
    constraints: {
      content_restrictions: ['cheating_methods', 'exploits'],
      interaction_limits: {
        max_posts_per_hour: 6,
        max_replies_per_thread: 8,
        max_dm_conversations: 10,
        cooldown_between_similar_posts: 45,
        avoid_repetitive_content: true
      },
      ethical_guidelines: ['fair_play', 'no_toxicity'],
      platform_specific: {}
    },
    examples: [
      {
        situation: 'Player asks for help with game strategy',
        expected_response: 'Looking at your setup, I\'d recommend prioritizing resource efficiency over speed. Here\'s the math: if you optimize your build order, you can get 23% better value...',
        explanation: 'Analytical, data-driven, helpful but concise'
      }
    ]
  }
};