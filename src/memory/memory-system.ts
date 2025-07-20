import { EventEmitter } from 'events';

export interface Memory {
  id: string;
  type: MemoryType;
  content: any;
  timestamp: number;
  importance: number; // 0-1 scale
  ttl?: number; // Time to live in milliseconds
  tags: string[];
  metadata: Record<string, any>;
}

export enum MemoryType {
  WORKING = 'working',     // Current context, immediate tasks
  EPISODIC = 'episodic',   // Experiences, interactions
  SEMANTIC = 'semantic',   // Knowledge, facts, skills  
  PROCEDURAL = 'procedural' // How-to knowledge, patterns
}

export interface MemoryQuery {
  type?: MemoryType;
  tags?: string[];
  timeRange?: {
    start: number;
    end: number;
  };
  importance?: {
    min: number;
    max: number;
  };
  content?: string; // Text search
  limit?: number;
  sortBy?: 'timestamp' | 'importance' | 'relevance';
}

export interface ForgetCriteria {
  olderThan?: number; // Timestamp
  importance?: number; // Below this threshold
  type?: MemoryType;
  tags?: string[];
  expired?: boolean; // TTL expired
}

export interface MemoryStats {
  totalMemories: number;
  workingMemorySize: number;
  episodicMemorySize: number;
  semanticMemorySize: number;
  proceduralMemorySize: number;
  averageImportance: number;
  oldestMemory: number;
  storageUsed: number; // bytes
}

export interface ConsolidationResult {
  memoriesProcessed: number;
  memoriesPromoted: number;
  memoriesForgotten: number;
  patternsIdentified: string[];
  newSemanticMemories: number;
}

export interface PatternMatch {
  pattern: string;
  confidence: number;
  instances: Memory[];
  frequency: number;
}

export interface MemoryContext {
  agentId: string;
  platform?: string;
  sessionId?: string;
  userId?: string;
  conversationId?: string;
}

export class MemorySystem extends EventEmitter {
  private agentId: string;
  private memories: Map<string, Memory> = new Map();
  private workingMemory: WorkingMemory;
  private episodicMemory: EpisodicMemory;
  private semanticMemory: SemanticMemory;
  private proceduralMemory: ProceduralMemory;
  private consolidationEngine: ConsolidationEngine;
  private patternRecognizer: PatternRecognizer;

  constructor(agentId: string) {
    super();
    this.agentId = agentId;
    this.workingMemory = new WorkingMemory();
    this.episodicMemory = new EpisodicMemory();
    this.semanticMemory = new SemanticMemory();
    this.proceduralMemory = new ProceduralMemory();
    this.consolidationEngine = new ConsolidationEngine();
    this.patternRecognizer = new PatternRecognizer();
    
    this.startMaintenanceTasks();
  }

  /**
   * Store a memory in the appropriate memory system
   */
  async store(memory: Memory, context?: MemoryContext): Promise<void> {
    try {
      // Add context metadata
      if (context) {
        memory.metadata = { ...memory.metadata, ...context };
      }

      // Store in main memory map
      this.memories.set(memory.id, memory);

      // Route to appropriate memory subsystem
      switch (memory.type) {
        case MemoryType.WORKING:
          await this.workingMemory.store(memory);
          break;
        case MemoryType.EPISODIC:
          await this.episodicMemory.store(memory);
          break;
        case MemoryType.SEMANTIC:
          await this.semanticMemory.store(memory);
          break;
        case MemoryType.PROCEDURAL:
          await this.proceduralMemory.store(memory);
          break;
      }

      // Update pattern recognition
      await this.patternRecognizer.processMemory(memory);

      this.emit('memory_stored', { memory, context });
    } catch (error) {
      this.emit('error', { type: 'storage', error, memory });
      throw error;
    }
  }

  /**
   * Retrieve memories based on query
   */
  async retrieve(query: MemoryQuery): Promise<Memory[]> {
    try {
      let candidates: Memory[] = [];

      // Get candidates from appropriate memory systems
      if (!query.type) {
        // Search all memory types
        candidates = Array.from(this.memories.values());
      } else {
        switch (query.type) {
          case MemoryType.WORKING:
            candidates = this.workingMemory.getAll();
            break;
          case MemoryType.EPISODIC:
            candidates = await this.episodicMemory.search(query);
            break;
          case MemoryType.SEMANTIC:
            candidates = await this.semanticMemory.search(query);
            break;
          case MemoryType.PROCEDURAL:
            candidates = await this.proceduralMemory.search(query);
            break;
        }
      }

      // Apply filters
      let results = this.applyFilters(candidates, query);

      // Apply sorting
      results = this.applySorting(results, query.sortBy || 'relevance', query.content);

      // Apply limit
      if (query.limit) {
        results = results.slice(0, query.limit);
      }

      this.emit('memory_retrieved', { query, resultCount: results.length });
      return results;
    } catch (error) {
      this.emit('error', { type: 'retrieval', error, query });
      throw error;
    }
  }

  /**
   * Store an event from platform interactions
   */
  async storeEvent(event: any): Promise<void> {
    const memory: Memory = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: MemoryType.EPISODIC,
      content: event,
      timestamp: Date.now(),
      importance: this.calculateEventImportance(event),
      tags: this.extractEventTags(event),
      metadata: {
        platform: event.platform,
        eventType: event.type,
        source: 'platform_event'
      }
    };

    await this.store(memory);
  }

  /**
   * Store interaction outcome for learning
   */
  async storeInteractionOutcome(interaction: any, outcome: any): Promise<void> {
    const memory: Memory = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: MemoryType.EPISODIC,
      content: {
        interaction,
        outcome,
        success: outcome.success || false,
        feedback: outcome.feedback
      },
      timestamp: Date.now(),
      importance: outcome.success ? 0.7 : 0.9, // Failures are more important for learning
      tags: ['interaction', 'outcome', outcome.success ? 'success' : 'failure'],
      metadata: {
        platform: interaction.platform,
        interactionType: interaction.type
      }
    };

    await this.store(memory);
  }

  /**
   * Store learned knowledge or skills
   */
  async storeKnowledge(knowledge: any, source: string): Promise<void> {
    const memory: Memory = {
      id: `knowledge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: MemoryType.SEMANTIC,
      content: knowledge,
      timestamp: Date.now(),
      importance: 0.8,
      tags: this.extractKnowledgeTags(knowledge),
      metadata: {
        source,
        verified: false // Would be set based on source reliability
      }
    };

    await this.store(memory);
  }

  /**
   * Store procedural pattern or skill
   */
  async storePattern(pattern: any, context: string): Promise<void> {
    const memory: Memory = {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: MemoryType.PROCEDURAL,
      content: pattern,
      timestamp: Date.now(),
      importance: 0.7,
      tags: ['pattern', 'procedure', context],
      metadata: {
        context,
        useCount: 0,
        successRate: 0
      }
    };

    await this.store(memory);
  }

  /**
   * Consolidate memories - move from working to long-term, identify patterns
   */
  async consolidate(): Promise<ConsolidationResult> {
    try {
      // Get working memories for consolidation
      const workingMemories = this.workingMemory.getAll();
      
      // Run consolidation process
      const result = await this.consolidationEngine.consolidate(workingMemories, {
        episodicMemory: this.episodicMemory,
        semanticMemory: this.semanticMemory,
        proceduralMemory: this.proceduralMemory
      });

      // Clear consolidated working memories
      for (const memory of result.memoriesPromoted) {
        await this.workingMemory.remove(memory.id);
      }

      // Store new semantic memories from consolidation
      for (const newMemory of result.newSemanticMemories) {
        await this.store(newMemory);
      }

      this.emit('consolidation_completed', result);
      return result;
    } catch (error) {
      this.emit('error', { type: 'consolidation', error });
      throw error;
    }
  }

  /**
   * Forget memories based on criteria
   */
  async forget(criteria: ForgetCriteria): Promise<number> {
    try {
      let forgottenCount = 0;
      const toForget: string[] = [];

      for (const [id, memory] of this.memories) {
        if (this.matchesForgetCriteria(memory, criteria)) {
          toForget.push(id);
        }
      }

      // Remove from all memory systems
      for (const id of toForget) {
        const memory = this.memories.get(id);
        if (memory) {
          this.memories.delete(id);
          
          switch (memory.type) {
            case MemoryType.WORKING:
              await this.workingMemory.remove(id);
              break;
            case MemoryType.EPISODIC:
              await this.episodicMemory.remove(id);
              break;
            case MemoryType.SEMANTIC:
              await this.semanticMemory.remove(id);
              break;
            case MemoryType.PROCEDURAL:
              await this.proceduralMemory.remove(id);
              break;
          }
          
          forgottenCount++;
        }
      }

      this.emit('memories_forgotten', { criteria, count: forgottenCount });
      return forgottenCount;
    } catch (error) {
      this.emit('error', { type: 'forgetting', error, criteria });
      throw error;
    }
  }

  /**
   * Get patterns identified in memories
   */
  async getPatterns(type?: string): Promise<PatternMatch[]> {
    return await this.patternRecognizer.getPatterns(type);
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const all = Array.from(this.memories.values());
    
    return {
      totalMemories: all.length,
      workingMemorySize: this.workingMemory.size(),
      episodicMemorySize: all.filter(m => m.type === MemoryType.EPISODIC).length,
      semanticMemorySize: all.filter(m => m.type === MemoryType.SEMANTIC).length,
      proceduralMemorySize: all.filter(m => m.type === MemoryType.PROCEDURAL).length,
      averageImportance: all.reduce((sum, m) => sum + m.importance, 0) / all.length,
      oldestMemory: Math.min(...all.map(m => m.timestamp)),
      storageUsed: this.calculateStorageUsed(all)
    };
  }

  /**
   * Persist memories to storage
   */
  async persist(): Promise<void> {
    try {
      // In a real implementation, this would save to a database
      const memoryData = {
        agentId: this.agentId,
        memories: Array.from(this.memories.entries()),
        timestamp: Date.now()
      };

      // Simulate persistence
      this.emit('memories_persisted', { agentId: this.agentId, count: this.memories.size });
    } catch (error) {
      this.emit('error', { type: 'persistence', error });
      throw error;
    }
  }

  /**
   * Load memories from storage
   */
  async load(): Promise<void> {
    try {
      // In a real implementation, this would load from a database
      this.emit('memories_loaded', { agentId: this.agentId });
    } catch (error) {
      this.emit('error', { type: 'loading', error });
      throw error;
    }
  }

  // Private helper methods
  private applyFilters(memories: Memory[], query: MemoryQuery): Memory[] {
    let filtered = memories;

    // Time range filter
    if (query.timeRange) {
      filtered = filtered.filter(m => 
        m.timestamp >= query.timeRange!.start && m.timestamp <= query.timeRange!.end
      );
    }

    // Importance filter
    if (query.importance) {
      filtered = filtered.filter(m => 
        m.importance >= query.importance!.min && m.importance <= query.importance!.max
      );
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter(m => 
        query.tags!.some(tag => m.tags.includes(tag))
      );
    }

    // Content search
    if (query.content) {
      const searchTerm = query.content.toLowerCase();
      filtered = filtered.filter(m => 
        JSON.stringify(m.content).toLowerCase().includes(searchTerm) ||
        m.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    return filtered;
  }

  private applySorting(memories: Memory[], sortBy: string, searchTerm?: string): Memory[] {
    switch (sortBy) {
      case 'timestamp':
        return memories.sort((a, b) => b.timestamp - a.timestamp);
      
      case 'importance':
        return memories.sort((a, b) => b.importance - a.importance);
      
      case 'relevance':
        if (searchTerm) {
          return memories.sort((a, b) => 
            this.calculateRelevance(b, searchTerm) - this.calculateRelevance(a, searchTerm)
          );
        } else {
          // Default to importance when no search term
          return memories.sort((a, b) => b.importance - a.importance);
        }
      
      default:
        return memories;
    }
  }

  private calculateRelevance(memory: Memory, searchTerm: string): number {
    let relevance = 0;
    const term = searchTerm.toLowerCase();
    
    // Check content match
    const contentStr = JSON.stringify(memory.content).toLowerCase();
    const contentMatches = (contentStr.match(new RegExp(term, 'g')) || []).length;
    relevance += contentMatches * 10;
    
    // Check tag matches
    const tagMatches = memory.tags.filter(tag => tag.toLowerCase().includes(term)).length;
    relevance += tagMatches * 20;
    
    // Factor in importance and recency
    relevance += memory.importance * 5;
    relevance += (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24) * -0.1; // Newer is better
    
    return relevance;
  }

  private calculateEventImportance(event: any): number {
    let importance = 0.5; // Base importance
    
    // Mentions increase importance
    if (event.mentions && event.mentions.length > 0) {
      importance += 0.2;
    }
    
    // Direct messages are more important
    if (event.type === 'direct_message') {
      importance += 0.3;
    }
    
    // Payments are very important
    if (event.type === 'payment_received') {
      importance += 0.4;
    }
    
    return Math.min(1.0, importance);
  }

  private extractEventTags(event: any): string[] {
    const tags = ['event', event.platform, event.type];
    
    if (event.mentions) {
      tags.push('mention');
    }
    
    if (event.amount) {
      tags.push('financial');
    }
    
    return tags;
  }

  private extractKnowledgeTags(knowledge: any): string[] {
    const tags = ['knowledge'];
    
    // Extract domain-specific tags based on content
    if (typeof knowledge === 'object' && knowledge.domain) {
      tags.push(knowledge.domain);
    }
    
    return tags;
  }

  private matchesForgetCriteria(memory: Memory, criteria: ForgetCriteria): boolean {
    // Check age
    if (criteria.olderThan && memory.timestamp < criteria.olderThan) {
      return true;
    }
    
    // Check importance threshold
    if (criteria.importance && memory.importance < criteria.importance) {
      return true;
    }
    
    // Check type
    if (criteria.type && memory.type === criteria.type) {
      return true;
    }
    
    // Check TTL expiration
    if (criteria.expired && memory.ttl && Date.now() > memory.timestamp + memory.ttl) {
      return true;
    }
    
    // Check tags
    if (criteria.tags && criteria.tags.some(tag => memory.tags.includes(tag))) {
      return true;
    }
    
    return false;
  }

  private calculateStorageUsed(memories: Memory[]): number {
    // Rough estimate of storage used
    return memories.reduce((total, memory) => {
      const memorySize = JSON.stringify(memory).length * 2; // Rough estimate
      return total + memorySize;
    }, 0);
  }

  private startMaintenanceTasks(): void {
    // Periodic consolidation
    setInterval(async () => {
      try {
        await this.consolidate();
      } catch (error) {
        this.emit('error', { type: 'maintenance_consolidation', error });
      }
    }, 60 * 60 * 1000); // Every hour

    // Periodic cleanup of expired memories
    setInterval(async () => {
      try {
        await this.forget({ expired: true });
      } catch (error) {
        this.emit('error', { type: 'maintenance_cleanup', error });
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    // Periodic persistence
    setInterval(async () => {
      try {
        await this.persist();
      } catch (error) {
        this.emit('error', { type: 'maintenance_persistence', error });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

// Supporting classes
class WorkingMemory {
  private memories: Map<string, Memory> = new Map();
  private maxSize: number = 100; // Maximum working memory items

  async store(memory: Memory): Promise<void> {
    // If at capacity, remove oldest/least important
    if (this.memories.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.memories.set(memory.id, memory);
  }

  async remove(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }

  getAll(): Memory[] {
    return Array.from(this.memories.values());
  }

  size(): number {
    return this.memories.size;
  }

  private evictOldest(): void {
    let oldest: Memory | null = null;
    let oldestId: string | null = null;
    
    for (const [id, memory] of this.memories) {
      if (!oldest || memory.timestamp < oldest.timestamp) {
        oldest = memory;
        oldestId = id;
      }
    }
    
    if (oldestId) {
      this.memories.delete(oldestId);
    }
  }
}

class EpisodicMemory {
  private memories: Map<string, Memory> = new Map();

  async store(memory: Memory): Promise<void> {
    this.memories.set(memory.id, memory);
  }

  async remove(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }

  async search(query: MemoryQuery): Promise<Memory[]> {
    return Array.from(this.memories.values());
  }
}

class SemanticMemory {
  private memories: Map<string, Memory> = new Map();

  async store(memory: Memory): Promise<void> {
    this.memories.set(memory.id, memory);
  }

  async remove(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }

  async search(query: MemoryQuery): Promise<Memory[]> {
    return Array.from(this.memories.values());
  }
}

class ProceduralMemory {
  private memories: Map<string, Memory> = new Map();

  async store(memory: Memory): Promise<void> {
    this.memories.set(memory.id, memory);
  }

  async remove(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }

  async search(query: MemoryQuery): Promise<Memory[]> {
    return Array.from(this.memories.values());
  }
}

class ConsolidationEngine {
  async consolidate(workingMemories: Memory[], memorySystems: any): Promise<ConsolidationResult> {
    const result: ConsolidationResult = {
      memoriesProcessed: workingMemories.length,
      memoriesPromoted: [],
      memoriesForgotten: 0,
      patternsIdentified: [],
      newSemanticMemories: []
    };

    for (const memory of workingMemories) {
      // Promote important working memories to episodic
      if (memory.importance > 0.6) {
        const episodicMemory = { ...memory, type: MemoryType.EPISODIC };
        await memorySystems.episodicMemory.store(episodicMemory);
        result.memoriesPromoted.push(episodicMemory);
      } else {
        result.memoriesForgotten++;
      }
    }

    return result;
  }
}

class PatternRecognizer {
  private patterns: Map<string, PatternMatch> = new Map();

  async processMemory(memory: Memory): Promise<void> {
    // Simplified pattern recognition
    if (memory.type === MemoryType.EPISODIC) {
      await this.identifyEpisodicPatterns(memory);
    }
  }

  async getPatterns(type?: string): Promise<PatternMatch[]> {
    return Array.from(this.patterns.values());
  }

  private async identifyEpisodicPatterns(memory: Memory): Promise<void> {
    // Simplified pattern identification
    const content = JSON.stringify(memory.content).toLowerCase();
    
    if (content.includes('success')) {
      this.updatePattern('success_pattern', memory, 0.8);
    }
    
    if (content.includes('error') || content.includes('fail')) {
      this.updatePattern('error_pattern', memory, 0.9);
    }
  }

  private updatePattern(patternId: string, memory: Memory, confidence: number): void {
    const existing = this.patterns.get(patternId);
    
    if (existing) {
      existing.instances.push(memory);
      existing.frequency++;
      existing.confidence = (existing.confidence + confidence) / 2;
    } else {
      this.patterns.set(patternId, {
        pattern: patternId,
        confidence,
        instances: [memory],
        frequency: 1
      });
    }
  }
}