import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * Hackathon Idea Validation Framework
 * Tests feasibility against Sei network advantages and x402 protocol capabilities
 */

interface HackathonIdea {
  name: string;
  description: string;
  targetUsers: string[];
  seiAdvantages: string[];
  x402Use: string;
  monetization: string;
  complexity: 'low' | 'medium' | 'high';
  timeToMVP: number; // hours
}

interface ValidationResult {
  score: number;
  feasible: boolean;
  risks: string[];
  recommendations: string[];
}

class HackathonValidator {
  private seiFinality = 400; // ms
  private x402ProtocolAvailable = true;
  private hackathonDuration = 48; // hours

  validateIdea(idea: HackathonIdea): ValidationResult {
    let score = 0;
    const risks: string[] = [];
    const recommendations: string[] = [];

    // Test 1: Sei Network Advantage Utilization (30 points)
    if (this.testsSeiAdvantages(idea)) {
      score += 30;
    } else {
      risks.push('Does not leverage Sei\'s sub-400ms finality advantage');
    }

    // Test 2: Mainstream User Appeal (25 points)
    if (this.testsMainstreamAppeal(idea)) {
      score += 25;
    } else {
      risks.push('Limited mainstream user appeal');
    }

    // Test 3: x402 Integration Viability (20 points)
    if (this.testsx402Integration(idea)) {
      score += 20;
    } else {
      risks.push('x402 payment integration unclear');
    }

    // Test 4: Monetization Clarity (15 points)
    if (this.testsMonetization(idea)) {
      score += 15;
    } else {
      risks.push('Unclear revenue model');
    }

    // Test 5: Hackathon Timeline Feasibility (10 points)
    if (this.testsTimelineFeasibility(idea)) {
      score += 10;
    } else {
      risks.push('Too complex for hackathon timeline');
    }

    // Generate recommendations
    if (score < 60) {
      recommendations.push('Consider simplifying scope');
    }
    if (score >= 80) {
      recommendations.push('High potential - focus on execution');
    }

    return {
      score,
      feasible: score >= 70,
      risks,
      recommendations
    };
  }

  private testsSeiAdvantages(idea: HackathonIdea): boolean {
    const seiKeywords = [
      'instant', 'real-time', 'high-frequency', 'gaming', 
      'sub-second', 'fast', 'finality', 'performance'
    ];
    
    return idea.seiAdvantages.some(advantage => 
      seiKeywords.some(keyword => 
        advantage.toLowerCase().includes(keyword)
      )
    );
  }

  private testsMainstreamAppeal(idea: HackathonIdea): boolean {
    const mainstreamUsers = [
      'social media users', 'content creators', 'gamers',
      'artists', 'musicians', 'everyday users', 'consumers'
    ];
    
    return idea.targetUsers.some(user => 
      mainstreamUsers.some(mainstream => 
        user.toLowerCase().includes(mainstream)
      )
    );
  }

  private testsx402Integration(idea: HackathonIdea): boolean {
    const x402UseCase = idea.x402Use.toLowerCase();
    const validUseCases = [
      'micropayments', 'tips', 'subscriptions', 'per-use',
      'API calls', 'content access', 'service fees'
    ];
    
    return validUseCases.some(useCase => 
      x402UseCase.includes(useCase)
    );
  }

  private testsMonetization(idea: HackathonIdea): boolean {
    return idea.monetization.length > 0 && 
           !idea.monetization.toLowerCase().includes('unclear');
  }

  private testsTimelineFeasibility(idea: HackathonIdea): boolean {
    const complexityMultiplier = {
      'low': 1,
      'medium': 1.5,
      'high': 2.5
    };
    
    const estimatedTime = idea.timeToMVP * complexityMultiplier[idea.complexity];
    return estimatedTime <= this.hackathonDuration;
  }
}

describe('Hackathon Idea Validation Framework', () => {
  let validator: HackathonValidator;

  beforeEach(() => {
    validator = new HackathonValidator();
  });

  describe('Social Tipping Agent', () => {
    const socialTippingAgent: HackathonIdea = {
      name: 'Social Tipping Agent',
      description: 'AI agent that monitors social platforms and automatically tips creators using x402 micropayments',
      targetUsers: ['social media users', 'content creators', 'Twitter users', 'Discord communities'],
      seiAdvantages: ['instant tip delivery', 'sub-400ms finality for real-time interactions'],
      x402Use: 'micropayments for social tips and content creator rewards',
      monetization: 'Small transaction fees on tips, premium agent features',
      complexity: 'low',
      timeToMVP: 24
    };

    test('should score highly for feasibility', () => {
      const result = validator.validateIdea(socialTippingAgent);
      
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.feasible).toBe(true);
      expect(result.risks).toHaveLength(0);
    });

    test('should leverage Sei advantages correctly', () => {
      const result = validator.validateIdea(socialTippingAgent);
      
      expect(result.score).toBeGreaterThanOrEqual(30); // Sei advantage points
    });
  });

  describe('Gaming NPC Economy Agent', () => {
    const gamingNPCAgent: HackathonIdea = {
      name: 'Gaming NPC Economy Agent',
      description: 'Autonomous NPCs that earn and spend real crypto through gameplay',
      targetUsers: ['gamers', 'game developers', 'NFT collectors'],
      seiAdvantages: ['high-frequency gaming transactions', 'real-time economic decisions'],
      x402Use: 'per-action payments for NPC services and in-game purchases',
      monetization: 'Transaction fees on NPC trades, premium NPC features',
      complexity: 'medium',
      timeToMVP: 36
    };

    test('should be feasible with medium risk', () => {
      const result = validator.validateIdea(gamingNPCAgent);
      
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.feasible).toBe(true);
    });

    test('should identify integration complexity risks', () => {
      const result = validator.validateIdea(gamingNPCAgent);
      
      // Should pass but may have some complexity concerns
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('Artist Collaboration Agent', () => {
    const artistAgent: HackathonIdea = {
      name: 'Artist Collaboration Agent',
      description: 'AI that discovers artists and facilitates collaborations with automated revenue splits',
      targetUsers: ['artists', 'musicians', 'creative professionals'],
      seiAdvantages: ['instant payment settlements', 'fast collaboration finalization'],
      x402Use: 'collaboration discovery fees and automated revenue distribution',
      monetization: 'Commission on successful collaborations, discovery service fees',
      complexity: 'medium',
      timeToMVP: 40
    };

    test('should be feasible with good mainstream appeal', () => {
      const result = validator.validateIdea(artistAgent);
      
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.feasible).toBe(true);
    });
  });

  describe('Yield Farming Assistant (Low Mainstream Appeal)', () => {
    const yieldAgent: HackathonIdea = {
      name: 'Yield Farming Assistant',
      description: 'AI that optimizes DeFi yield across protocols',
      targetUsers: ['DeFi users', 'crypto traders', 'yield farmers'],
      seiAdvantages: ['fast arbitrage opportunities', 'quick position adjustments'],
      x402Use: 'per-optimization fees and strategy access',
      monetization: 'Performance fees on yield improvements',
      complexity: 'high',
      timeToMVP: 48
    };

    test('should score lower due to limited mainstream appeal', () => {
      const result = validator.validateIdea(yieldAgent);
      
      // Should lose points for mainstream appeal
      expect(result.score).toBeLessThan(85);
      expect(result.risks).toContain('Limited mainstream user appeal');
    });

    test('should flag timeline concerns for high complexity', () => {
      const result = validator.validateIdea(yieldAgent);
      
      // High complexity + 48 hour MVP should raise concerns
      expect(result.risks.length).toBeGreaterThan(0);
    });
  });

  describe('Content Creator Economy Agent', () => {
    const creatorAgent: HackathonIdea = {
      name: 'Content Creator Economy Agent',
      description: 'Helps creators monetize across platforms with automated pricing and distribution',
      targetUsers: ['content creators', 'influencers', 'YouTubers', 'streamers'],
      seiAdvantages: ['instant subscriber payments', 'real-time revenue tracking'],
      x402Use: 'subscription management and per-content access fees',
      monetization: 'Platform fees on creator earnings, premium tools',
      complexity: 'low',
      timeToMVP: 30
    };

    test('should score very highly across all metrics', () => {
      const result = validator.validateIdea(creatorAgent);
      
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.feasible).toBe(true);
      expect(result.recommendations).toContain('High potential - focus on execution');
    });
  });

  describe('Edge Cases and Validation', () => {
    test('should reject ideas without clear Sei advantages', () => {
      const badIdea: HackathonIdea = {
        name: 'Generic Agent',
        description: 'Does generic things',
        targetUsers: ['crypto users'],
        seiAdvantages: ['uses blockchain'],
        x402Use: 'payments',
        monetization: 'fees',
        complexity: 'low',
        timeToMVP: 24
      };

      const result = validator.validateIdea(badIdea);
      
      expect(result.score).toBeLessThan(70);
      expect(result.feasible).toBe(false);
    });

    test('should handle missing monetization strategy', () => {
      const noMonetization: HackathonIdea = {
        name: 'Free Agent',
        description: 'Provides free services',
        targetUsers: ['everyone'],
        seiAdvantages: ['fast transactions'],
        x402Use: 'no payments needed',
        monetization: '',
        complexity: 'low',
        timeToMVP: 12
      };

      const result = validator.validateIdea(noMonetization);
      
      expect(result.risks).toContain('Unclear revenue model');
    });
  });

  describe('Integration with Existing Codebase', () => {
    test('should validate x402 protocol compatibility', () => {
      // Test that ideas properly leverage existing x402 infrastructure
      const x402CompatibleIdea: HackathonIdea = {
        name: 'x402 Test Agent',
        description: 'Tests x402 integration',
        targetUsers: ['developers'],
        seiAdvantages: ['fast payments'],
        x402Use: 'micropayments for API calls and service access',
        monetization: 'per-use fees',
        complexity: 'low',
        timeToMVP: 16
      };

      const result = validator.validateIdea(x402CompatibleIdea);
      
      // Should get full points for x402 integration
      expect(result.score).toBeGreaterThanOrEqual(20);
    });

    test('should consider existing sei-agent-kit capabilities', () => {
      // Ideas should leverage existing toolkit
      const seiKitIdea: HackathonIdea = {
        name: 'Sei Integration Agent',
        description: 'Uses sei-agent-kit features',
        targetUsers: ['crypto users'],
        seiAdvantages: ['instant finality', 'high throughput for social interactions'],
        x402Use: 'subscription payments',
        monetization: 'subscription fees',
        complexity: 'low',
        timeToMVP: 20
      };

      const result = validator.validateIdea(seiKitIdea);
      
      expect(result.feasible).toBe(true);
    });
  });
});

describe('Feasibility Score Calibration', () => {
  let validator: HackathonValidator;

  beforeEach(() => {
    validator = new HackathonValidator();
  });

  test('perfect idea should score 100', () => {
    const perfectIdea: HackathonIdea = {
      name: 'Perfect Agent',
      description: 'Perfect implementation',
      targetUsers: ['social media users', 'content creators'],
      seiAdvantages: ['instant transactions', 'sub-400ms finality', 'real-time interactions'],
      x402Use: 'micropayments for tips and content access',
      monetization: 'Transaction fees and premium features',
      complexity: 'low',
      timeToMVP: 20
    };

    const result = validator.validateIdea(perfectIdea);
    
    expect(result.score).toBe(100);
    expect(result.feasible).toBe(true);
    expect(result.risks).toHaveLength(0);
  });

  test('should have consistent scoring across similar ideas', () => {
    const idea1 = {
      name: 'Social Agent 1',
      description: 'Social platform integration',
      targetUsers: ['social media users'],
      seiAdvantages: ['instant payments'],
      x402Use: 'tips',
      monetization: 'fees',
      complexity: 'low' as const,
      timeToMVP: 24
    };

    const idea2 = {
      name: 'Social Agent 2', 
      description: 'Social platform integration',
      targetUsers: ['social media users'],
      seiAdvantages: ['instant payments'],
      x402Use: 'tips',
      monetization: 'fees',
      complexity: 'low' as const,
      timeToMVP: 24
    };

    const result1 = validator.validateIdea(idea1);
    const result2 = validator.validateIdea(idea2);

    expect(Math.abs(result1.score - result2.score)).toBeLessThanOrEqual(5);
  });
});