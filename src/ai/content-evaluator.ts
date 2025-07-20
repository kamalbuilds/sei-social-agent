import OpenAI from 'openai';
import { logger } from '../utils/logger';

interface EvaluationCriteria {
  topics: string[];
  minQuality: number;
}

interface ContentEvaluation {
  qualityScore: number;
  relevanceScore: number;
  originalityScore: number;
  engagementPotential: number;
  reason: string;
  tags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export class ContentEvaluator {
  private openai: OpenAI;
  private evaluationCache: Map<string, ContentEvaluation> = new Map();
  private modelPreferences: any = {};

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async loadModels(): Promise<void> {
    logger.info('Loading AI models for content evaluation...');
    
    // Initialize evaluation prompts and models
    this.modelPreferences = {
      systemPrompt: `You are an expert content evaluator for a social tipping system. 
      Evaluate content based on quality, originality, relevance, and potential value to the community.
      Score content from 0-100 based on these criteria:
      - Quality (40%): Grammar, clarity, depth, accuracy
      - Originality (30%): Unique insights, creative expression
      - Relevance (20%): Topic alignment, timeliness
      - Engagement (10%): Potential for meaningful discussion
      
      Provide a brief reason for your scoring.`,
      
      temperature: 0.7,
      model: 'gpt-4-turbo-preview'
    };

    logger.info('AI models loaded successfully');
  }

  async evaluate(content: any, criteria: EvaluationCriteria): Promise<ContentEvaluation> {
    // Check cache first
    const cacheKey = `${content.id}-${JSON.stringify(criteria)}`;
    if (this.evaluationCache.has(cacheKey)) {
      logger.debug(`Using cached evaluation for content ${content.id}`);
      return this.evaluationCache.get(cacheKey)!;
    }

    try {
      // Prepare evaluation prompt
      const evaluationPrompt = this.buildEvaluationPrompt(content, criteria);
      
      // Call OpenAI for evaluation
      const response = await this.openai.chat.completions.create({
        model: this.modelPreferences.model,
        messages: [
          { role: 'system', content: this.modelPreferences.systemPrompt },
          { role: 'user', content: evaluationPrompt }
        ],
        temperature: this.modelPreferences.temperature,
        response_format: { type: 'json_object' }
      });

      // Parse response
      const evaluation = this.parseEvaluation(response.choices[0].message.content!);
      
      // Apply topic relevance boost
      if (criteria.topics.length > 0) {
        evaluation.qualityScore = this.applyTopicBoost(
          evaluation.qualityScore,
          content.text,
          criteria.topics
        );
      }

      // Cache the evaluation
      this.evaluationCache.set(cacheKey, evaluation);
      
      // Clear old cache entries if too large
      if (this.evaluationCache.size > 1000) {
        const firstKey = this.evaluationCache.keys().next().value;
        this.evaluationCache.delete(firstKey);
      }

      logger.debug(`Content ${content.id} evaluated: Score ${evaluation.qualityScore}`);
      return evaluation;

    } catch (error) {
      logger.error('Error evaluating content:', error);
      
      // Fallback to basic evaluation
      return this.basicEvaluation(content, criteria);
    }
  }

  private buildEvaluationPrompt(content: any, criteria: EvaluationCriteria): string {
    return `
    Evaluate the following social media content:
    
    Platform: ${content.platform}
    Author: ${content.creator.username}
    Content: "${content.text}"
    Metrics: ${JSON.stringify(content.metrics)}
    
    Evaluation Criteria:
    - Preferred Topics: ${criteria.topics.join(', ')}
    - Minimum Quality Score: ${criteria.minQuality}
    
    Please provide a JSON response with:
    {
      "qualityScore": <0-100>,
      "relevanceScore": <0-100>,
      "originalityScore": <0-100>,
      "engagementPotential": <0-100>,
      "reason": "<brief explanation>",
      "tags": ["<relevant tags>"],
      "sentiment": "<positive|neutral|negative>"
    }
    `;
  }

  private parseEvaluation(response: string): ContentEvaluation {
    try {
      const parsed = JSON.parse(response);
      
      return {
        qualityScore: Math.min(100, Math.max(0, parsed.qualityScore || 0)),
        relevanceScore: Math.min(100, Math.max(0, parsed.relevanceScore || 0)),
        originalityScore: Math.min(100, Math.max(0, parsed.originalityScore || 0)),
        engagementPotential: Math.min(100, Math.max(0, parsed.engagementPotential || 0)),
        reason: parsed.reason || 'No specific reason provided',
        tags: parsed.tags || [],
        sentiment: parsed.sentiment || 'neutral'
      };
    } catch (error) {
      logger.error('Failed to parse AI evaluation:', error);
      
      return {
        qualityScore: 50,
        relevanceScore: 50,
        originalityScore: 50,
        engagementPotential: 50,
        reason: 'Failed to parse AI evaluation',
        tags: [],
        sentiment: 'neutral'
      };
    }
  }

  private applyTopicBoost(baseScore: number, text: string, topics: string[]): number {
    const lowerText = text.toLowerCase();
    let boost = 0;
    
    for (const topic of topics) {
      if (lowerText.includes(topic.toLowerCase())) {
        boost += 5; // 5 point boost per matching topic
      }
    }
    
    return Math.min(100, baseScore + boost);
  }

  private basicEvaluation(content: any, criteria: EvaluationCriteria): ContentEvaluation {
    // Fallback evaluation based on simple heuristics
    let score = 50; // Base score
    
    // Length bonus
    if (content.text.length > 100) score += 10;
    if (content.text.length > 280) score += 10;
    
    // Engagement bonus
    const totalEngagement = content.metrics.likes + content.metrics.shares + content.metrics.comments;
    if (totalEngagement > 10) score += 10;
    if (totalEngagement > 100) score += 10;
    
    // Topic matching
    const lowerText = content.text.toLowerCase();
    for (const topic of criteria.topics) {
      if (lowerText.includes(topic.toLowerCase())) {
        score += 5;
      }
    }
    
    // Media bonus
    if (content.mediaUrls && content.mediaUrls.length > 0) {
      score += 5;
    }
    
    return {
      qualityScore: Math.min(100, score),
      relevanceScore: 50,
      originalityScore: 50,
      engagementPotential: 50,
      reason: 'Basic heuristic evaluation',
      tags: [],
      sentiment: 'neutral'
    };
  }

  async updatePreferences(preferences: any): Promise<void> {
    logger.info('Updating AI evaluation preferences...');
    
    // Update model preferences based on user feedback
    if (preferences.strictness) {
      this.modelPreferences.temperature = 1 - (preferences.strictness / 100);
    }
    
    if (preferences.focusAreas) {
      // Adjust system prompt to emphasize certain areas
      this.modelPreferences.systemPrompt += `\nFocus especially on: ${preferences.focusAreas.join(', ')}`;
    }
    
    // Clear cache when preferences change
    this.evaluationCache.clear();
    
    logger.info('AI preferences updated');
  }

  async learnFromFeedback(contentId: string, feedback: 'good' | 'bad'): Promise<void> {
    // In production, this would train a custom model
    // For now, just log the feedback
    logger.info(`Feedback received for content ${contentId}: ${feedback}`);
  }

  getStats(): any {
    return {
      cacheSize: this.evaluationCache.size,
      model: this.modelPreferences.model,
      temperature: this.modelPreferences.temperature
    };
  }
}