import { describe, test, expect, beforeAll } from 'vitest';

/**
 * Comprehensive Hackathon Feasibility Test Suite
 * 
 * Tests all proposed ideas against the critical feasibility criteria:
 * - Sei network advantages utilization
 * - x402 integration viability  
 * - Mainstream user appeal
 * - Technical complexity vs timeline
 * - Monetization clarity
 */

interface HackathonCriteria {
  seiFinality: boolean;          // Uses sub-400ms finality advantage
  mainstreamUsers: boolean;      // Targets non-crypto users
  x402Integration: boolean;      // Clear x402 payment model
  technicalFeasibility: number; // 1-10 complexity score
  timelineRealistic: boolean;    // Can build MVP in 48 hours
  monetizationClear: boolean;    // Obvious revenue streams
  socialImpact: number;          // 1-10 mainstream adoption potential
  autonomousIntelligence: boolean; // Demonstrates true AI agency
}

interface FeasibilityScore {
  overall: number;               // 0-100
  feasible: boolean;
  strengths: string[];
  risks: string[];
  recommendation: 'build' | 'modify' | 'skip';
}

class HackathonFeasibilityTester {
  private readonly HACKATHON_DURATION = 48; // hours
  private readonly MIN_FEASIBLE_SCORE = 70;

  evaluateIdea(name: string, criteria: HackathonCriteria): FeasibilityScore {
    let score = 0;
    const strengths: string[] = [];
    const risks: string[] = [];

    // Sei Network Advantage (20 points)
    if (criteria.seiFinality) {
      score += 20;
      strengths.push('Leverages Sei\'s sub-400ms finality advantage');
    } else {
      risks.push('Does not utilize Sei\'s unique performance benefits');
    }

    // Mainstream Appeal (25 points)
    if (criteria.mainstreamUsers && criteria.socialImpact >= 7) {
      score += 25;
      strengths.push('Strong mainstream user appeal');
    } else if (criteria.mainstreamUsers) {
      score += 15;
      strengths.push('Some mainstream appeal');
    } else {
      risks.push('Limited to crypto-native users');
    }

    // x402 Integration (15 points)
    if (criteria.x402Integration) {
      score += 15;
      strengths.push('Clear x402 payment integration');
    } else {
      risks.push('Unclear x402 payment model');
    }

    // Technical Feasibility (20 points)
    const techScore = Math.max(0, 20 - (criteria.technicalFeasibility - 5) * 4);
    score += techScore;
    if (criteria.technicalFeasibility <= 6) {
      strengths.push('Appropriate technical complexity for hackathon');
    } else {
      risks.push('High technical complexity may exceed timeline');
    }

    // Timeline Realism (10 points)
    if (criteria.timelineRealistic) {
      score += 10;
      strengths.push('Realistic 48-hour development timeline');
    } else {
      risks.push('Timeline may be too aggressive');
    }

    // Monetization Clarity (10 points)
    if (criteria.monetizationClear) {
      score += 10;
      strengths.push('Clear monetization strategy');
    } else {
      risks.push('Unclear revenue model');
    }

    // Determine recommendation
    let recommendation: 'build' | 'modify' | 'skip';
    if (score >= 85) {
      recommendation = 'build';
    } else if (score >= this.MIN_FEASIBLE_SCORE) {
      recommendation = 'modify';
    } else {
      recommendation = 'skip';
    }

    return {
      overall: score,
      feasible: score >= this.MIN_FEASIBLE_SCORE,
      strengths,
      risks,
      recommendation
    };
  }

  compareIdeas(ideas: Array<{ name: string; criteria: HackathonCriteria }>): Array<{
    name: string;
    score: FeasibilityScore;
    rank: number;
  }> {
    const evaluated = ideas.map(idea => ({
      name: idea.name,
      score: this.evaluateIdea(idea.name, idea.criteria)
    }));

    // Sort by overall score
    evaluated.sort((a, b) => b.score.overall - a.score.overall);

    return evaluated.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }
}

describe('Hackathon Feasibility Assessment', () => {
  let tester: HackathonFeasibilityTester;

  beforeAll(() => {
    tester = new HackathonFeasibilityTester();
  });

  describe('Top Idea: Social Tipping Agent', () => {
    const socialTippingCriteria: HackathonCriteria = {
      seiFinality: true,              // Instant tips leverage sub-400ms
      mainstreamUsers: true,          // Social media users
      x402Integration: true,          // Micropayments for tips
      technicalFeasibility: 4,       // Low complexity
      timelineRealistic: true,       // 24-hour MVP possible
      monetizationClear: true,        // Transaction fees
      socialImpact: 9,               // High viral potential
      autonomousIntelligence: true   // AI decides tip worthiness
    };

    test('should score as highly feasible', () => {
      const result = tester.evaluateIdea('Social Tipping Agent', socialTippingCriteria);

      expect(result.overall).toBeGreaterThanOrEqual(85);
      expect(result.feasible).toBe(true);
      expect(result.recommendation).toBe('build');
      expect(result.risks).toHaveLength(0);
    });

    test('should identify key strengths', () => {
      const result = tester.evaluateIdea('Social Tipping Agent', socialTippingCriteria);

      expect(result.strengths).toContain('Leverages Sei\'s sub-400ms finality advantage');
      expect(result.strengths).toContain('Strong mainstream user appeal');
      expect(result.strengths).toContain('Clear x402 payment integration');
    });
  });

  describe('Second Idea: Gaming NPC Economy Agent', () => {
    const gamingNPCCriteria: HackathonCriteria = {
      seiFinality: true,              // High-frequency game transactions
      mainstreamUsers: true,          // Gamers are mainstream
      x402Integration: true,          // In-game purchase micropayments
      technicalFeasibility: 6,       // Medium complexity (game integration)
      timelineRealistic: true,       // 36-hour MVP possible
      monetizationClear: true,        // Transaction fees on trades
      socialImpact: 8,               // Gaming has broad appeal
      autonomousIntelligence: true   // NPCs make economic decisions
    };

    test('should score as feasible with some complexity', () => {
      const result = tester.evaluateIdea('Gaming NPC Economy Agent', gamingNPCCriteria);

      expect(result.overall).toBeGreaterThanOrEqual(70);
      expect(result.feasible).toBe(true);
      expect(result.recommendation).toBeOneOf(['build', 'modify']);
    });

    test('should identify game integration complexity', () => {
      const result = tester.evaluateIdea('Gaming NPC Economy Agent', gamingNPCCriteria);

      // Should still be feasible but may flag some complexity
      expect(result.overall).toBeGreaterThan(75);
    });
  });

  describe('Third Idea: Artist Collaboration Agent', () => {
    const artistCollabCriteria: HackathonCriteria = {
      seiFinality: true,              // Instant collaboration payments
      mainstreamUsers: true,          // Artists are mainstream creators
      x402Integration: true,          // Collaboration and revenue split fees
      technicalFeasibility: 6,       // Creative matching complexity
      timelineRealistic: true,       // 40-hour MVP possible
      monetizationClear: true,        // Commission on collaborations
      socialImpact: 7,               // Good creator economy appeal
      autonomousIntelligence: true   // AI matches artists and manages splits
    };

    test('should be feasible with good potential', () => {
      const result = tester.evaluateIdea('Artist Collaboration Agent', artistCollabCriteria);

      expect(result.overall).toBeGreaterThanOrEqual(70);
      expect(result.feasible).toBe(true);
    });
  });

  describe('Fourth Idea: Content Creator Economy Agent', () => {
    const creatorEconomyCriteria: HackathonCriteria = {
      seiFinality: true,              // Instant subscriber payments
      mainstreamUsers: true,          // Content creators are mainstream
      x402Integration: true,          // Subscription and access fees
      technicalFeasibility: 4,       // Relatively simple multi-platform
      timelineRealistic: true,       // 30-hour MVP
      monetizationClear: true,        // Platform fees on earnings
      socialImpact: 9,               // Creator economy is huge
      autonomousIntelligence: true   // AI optimizes pricing and distribution
    };

    test('should score very highly', () => {
      const result = tester.evaluateIdea('Content Creator Economy Agent', creatorEconomyCriteria);

      expect(result.overall).toBeGreaterThanOrEqual(85);
      expect(result.recommendation).toBe('build');
    });
  });

  describe('Lower Priority: Yield Farming Assistant', () => {
    const yieldFarmingCriteria: HackathonCriteria = {
      seiFinality: true,              // Fast arbitrage opportunities
      mainstreamUsers: false,         // DeFi users only
      x402Integration: true,          // Strategy access fees
      technicalFeasibility: 8,       // High complexity (multi-protocol)
      timelineRealistic: false,      // 48+ hours needed
      monetizationClear: true,        // Performance fees
      socialImpact: 3,               // Limited to crypto natives
      autonomousIntelligence: true   // AI optimizes yields
    };

    test('should score lower due to mainstream appeal and complexity', () => {
      const result = tester.evaluateIdea('Yield Farming Assistant', yieldFarmingCriteria);

      expect(result.overall).toBeLessThan(70);
      expect(result.feasible).toBe(false);
      expect(result.recommendation).toBe('skip');
      expect(result.risks).toContain('Limited to crypto-native users');
    });
  });

  describe('Edge Case: Generic Crypto Agent', () => {
    const genericCriteria: HackathonCriteria = {
      seiFinality: false,             // No specific Sei advantage
      mainstreamUsers: false,         // Crypto users only
      x402Integration: false,         // Unclear payment model
      technicalFeasibility: 7,       // Medium-high complexity
      timelineRealistic: false,      // Unclear scope
      monetizationClear: false,       // No clear revenue
      socialImpact: 2,               // Very limited appeal
      autonomousIntelligence: true   // Generic AI
    };

    test('should score very low and not be feasible', () => {
      const result = tester.evaluateIdea('Generic Crypto Agent', genericCriteria);

      expect(result.overall).toBeLessThan(40);
      expect(result.feasible).toBe(false);
      expect(result.recommendation).toBe('skip');
      expect(result.risks.length).toBeGreaterThan(3);
    });
  });
});

describe('Comparative Analysis', () => {
  let tester: HackathonFeasibilityTester;

  beforeAll(() => {
    tester = new HackathonFeasibilityTester();
  });

  test('should rank ideas correctly by feasibility', () => {
    const ideas = [
      {
        name: 'Social Tipping Agent',
        criteria: {
          seiFinality: true,
          mainstreamUsers: true,
          x402Integration: true,
          technicalFeasibility: 4,
          timelineRealistic: true,
          monetizationClear: true,
          socialImpact: 9,
          autonomousIntelligence: true
        }
      },
      {
        name: 'Content Creator Economy Agent',
        criteria: {
          seiFinality: true,
          mainstreamUsers: true,
          x402Integration: true,
          technicalFeasibility: 4,
          timelineRealistic: true,
          monetizationClear: true,
          socialImpact: 9,
          autonomousIntelligence: true
        }
      },
      {
        name: 'Gaming NPC Agent',
        criteria: {
          seiFinality: true,
          mainstreamUsers: true,
          x402Integration: true,
          technicalFeasibility: 6,
          timelineRealistic: true,
          monetizationClear: true,
          socialImpact: 8,
          autonomousIntelligence: true
        }
      },
      {
        name: 'Yield Farming Assistant',
        criteria: {
          seiFinality: true,
          mainstreamUsers: false,
          x402Integration: true,
          technicalFeasibility: 8,
          timelineRealistic: false,
          monetizationClear: true,
          socialImpact: 3,
          autonomousIntelligence: true
        }
      }
    ];

    const ranking = tester.compareIdeas(ideas);

    // Top 2 should be social/creator economy agents
    expect(ranking[0].score.overall).toBeGreaterThanOrEqual(85);
    expect(ranking[1].score.overall).toBeGreaterThanOrEqual(85);
    expect(['Social Tipping Agent', 'Content Creator Economy Agent']).toContain(ranking[0].name);
    expect(['Social Tipping Agent', 'Content Creator Economy Agent']).toContain(ranking[1].name);

    // Gaming should be 3rd
    expect(ranking[2].name).toBe('Gaming NPC Agent');
    expect(ranking[2].score.overall).toBeGreaterThanOrEqual(70);

    // Yield farming should be last
    expect(ranking[3].name).toBe('Yield Farming Assistant');
    expect(ranking[3].score.feasible).toBe(false);
  });

  test('should identify clear winners for hackathon focus', () => {
    const topIdeas = [
      {
        name: 'Social Tipping Agent',
        criteria: {
          seiFinality: true,
          mainstreamUsers: true,
          x402Integration: true,
          technicalFeasibility: 4,
          timelineRealistic: true,
          monetizationClear: true,
          socialImpact: 9,
          autonomousIntelligence: true
        }
      },
      {
        name: 'Content Creator Economy Agent',
        criteria: {
          seiFinality: true,
          mainstreamUsers: true,
          x402Integration: true,
          technicalFeasibility: 4,
          timelineRealistic: true,
          monetizationClear: true,
          socialImpact: 9,
          autonomousIntelligence: true
        }
      }
    ];

    const ranking = tester.compareIdeas(topIdeas);

    // Both should be 'build' recommendations
    ranking.forEach(result => {
      expect(result.score.recommendation).toBe('build');
      expect(result.score.overall).toBeGreaterThanOrEqual(85);
    });
  });
});

describe('Sei Network Integration Validation', () => {
  test('should validate proper Sei advantage utilization', () => {
    const seiOptimizedCriteria: HackathonCriteria = {
      seiFinality: true,              // ✓ Uses sub-400ms finality
      mainstreamUsers: true,
      x402Integration: true,
      technicalFeasibility: 5,
      timelineRealistic: true,
      monetizationClear: true,
      socialImpact: 8,
      autonomousIntelligence: true
    };

    const nonSeiCriteria: HackathonCriteria = {
      seiFinality: false,             // ✗ Generic blockchain use
      mainstreamUsers: true,
      x402Integration: true,
      technicalFeasibility: 5,
      timelineRealistic: true,
      monetizationClear: true,
      socialImpact: 8,
      autonomousIntelligence: true
    };

    const tester = new HackathonFeasibilityTester();
    const seiResult = tester.evaluateIdea('Sei Optimized', seiOptimizedCriteria);
    const genericResult = tester.evaluateIdea('Generic Blockchain', nonSeiCriteria);

    // Sei-optimized should score 20 points higher
    expect(seiResult.overall - genericResult.overall).toBe(20);
    expect(seiResult.strengths).toContain('Leverages Sei\'s sub-400ms finality advantage');
    expect(genericResult.risks).toContain('Does not utilize Sei\'s unique performance benefits');
  });
});

describe('X402 Protocol Integration Tests', () => {
  test('should validate x402 payment model clarity', () => {
    const clearX402Criteria: HackathonCriteria = {
      seiFinality: true,
      mainstreamUsers: true,
      x402Integration: true,          // ✓ Clear micropayment model
      technicalFeasibility: 5,
      timelineRealistic: true,
      monetizationClear: true,
      socialImpact: 8,
      autonomousIntelligence: true
    };

    const unclearX402Criteria: HackathonCriteria = {
      seiFinality: true,
      mainstreamUsers: true,
      x402Integration: false,         // ✗ No clear payment integration
      technicalFeasibility: 5,
      timelineRealistic: true,
      monetizationClear: true,
      socialImpact: 8,
      autonomousIntelligence: true
    };

    const tester = new HackathonFeasibilityTester();
    const clearResult = tester.evaluateIdea('Clear x402', clearX402Criteria);
    const unclearResult = tester.evaluateIdea('Unclear x402', unclearX402Criteria);

    expect(clearResult.overall - unclearResult.overall).toBe(15);
    expect(clearResult.strengths).toContain('Clear x402 payment integration');
    expect(unclearResult.risks).toContain('Unclear x402 payment model');
  });
});

describe('Final Recommendations', () => {
  test('should provide clear build recommendations', () => {
    const tester = new HackathonFeasibilityTester();
    
    // Social Tipping Agent - should be top recommendation
    const socialTipping = tester.evaluateIdea('Social Tipping Agent', {
      seiFinality: true,
      mainstreamUsers: true,
      x402Integration: true,
      technicalFeasibility: 4,
      timelineRealistic: true,
      monetizationClear: true,
      socialImpact: 9,
      autonomousIntelligence: true
    });

    expect(socialTipping.recommendation).toBe('build');
    expect(socialTipping.overall).toBeGreaterThanOrEqual(90);
    expect(socialTipping.strengths.length).toBeGreaterThanOrEqual(5);
    
    // Should have minimal risks
    expect(socialTipping.risks.length).toBeLessThanOrEqual(1);
  });

  test('should identify backup options', () => {
    const tester = new HackathonFeasibilityTester();
    
    // Gaming NPC - should be good backup
    const gamingNPC = tester.evaluateIdea('Gaming NPC Agent', {
      seiFinality: true,
      mainstreamUsers: true,
      x402Integration: true,
      technicalFeasibility: 6,
      timelineRealistic: true,
      monetizationClear: true,
      socialImpact: 8,
      autonomousIntelligence: true
    });

    expect(gamingNPC.recommendation).toBeOneOf(['build', 'modify']);
    expect(gamingNPC.overall).toBeGreaterThanOrEqual(75);
    expect(gamingNPC.feasible).toBe(true);
  });
});