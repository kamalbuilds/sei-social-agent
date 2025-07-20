import { EventEmitter } from 'events';

export interface PlatformEvent {
  id: string;
  platform: string;
  type: EventType;
  data: EventData;
  timestamp: number;
  metadata: Record<string, any>;
  source: EventSource;
}

export enum EventType {
  MESSAGE_RECEIVED = 'message_received',
  MENTION = 'mention',
  REACTION = 'reaction',
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',
  SHARE = 'share',
  COMMENT = 'comment',
  PAYMENT_RECEIVED = 'payment_received',
  GAME_INVITATION = 'game_invitation',
  MARKET_SIGNAL = 'market_signal',
  CUSTOM = 'custom'
}

export interface EventData {
  content?: string;
  author?: PlatformUser;
  target?: PlatformUser;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface EventSource {
  id: string;
  type: 'user' | 'bot' | 'system';
  platform: string;
}

export interface PlatformUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  verified?: boolean;
  followerCount?: number;
  metadata?: Record<string, any>;
}

export interface Content {
  id?: string;
  type: ContentType;
  text?: string;
  media?: MediaAttachment[];
  metadata?: Record<string, any>;
  replyTo?: string;
  mentions?: string[];
  hashtags?: string[];
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  POLL = 'poll',
  THREAD = 'thread',
  LIVESTREAM = 'livestream'
}

export interface MediaAttachment {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  filename?: string;
  size?: number;
  duration?: number;
  thumbnail?: string;
  altText?: string;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: PlatformUser;
  error?: string;
}

export interface EventFilter {
  type?: EventType[];
  author?: string[];
  keywords?: string[];
  hashtags?: string[];
  mentioned?: boolean;
  minFollowers?: number;
  verified?: boolean;
}

export interface AgentResponse {
  type: ResponseType;
  content?: Content;
  action?: PlatformAction;
  delay?: number;
  conditions?: ResponseCondition[];
}

export enum ResponseType {
  POST = 'post',
  REPLY = 'reply',
  REACT = 'react',
  FOLLOW = 'follow',
  SHARE = 'share',
  DELETE = 'delete',
  EDIT = 'edit',
  CUSTOM = 'custom'
}

export interface PlatformAction {
  type: string;
  parameters: Record<string, any>;
  requiresApproval?: boolean;
  estimatedCost?: number;
}

export interface ResponseCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less';
  value: any;
}

export interface PlatformConfig {
  name: string;
  credentials: PlatformCredentials;
  limits: PlatformLimits;
  features: PlatformFeatures;
  webhooks?: WebhookConfig;
}

export interface PlatformCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  username?: string;
  password?: string;
  customFields?: Record<string, string>;
}

export interface PlatformLimits {
  postsPerHour: number;
  postsPerDay: number;
  followsPerHour: number;
  followsPerDay: number;
  maxContentLength: number;
  maxMediaSize: number;
  rateLimitWindow: number;
}

export interface PlatformFeatures {
  supportedContentTypes: ContentType[];
  supportedEventTypes: EventType[];
  hasDirectMessages: boolean;
  hasGroups: boolean;
  hasLivestreaming: boolean;
  hasPayments: boolean;
  hasPolls: boolean;
  hasThreads: boolean;
  hasReactions: boolean;
  hasVerification: boolean;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: EventType[];
}

export abstract class PlatformAdapter extends EventEmitter {
  protected config: PlatformConfig;
  protected isConnected: boolean = false;
  protected rateLimiter: RateLimiter;
  protected lastActivity: number = 0;

  constructor(config: PlatformConfig) {
    super();
    this.config = config;
    this.rateLimiter = new RateLimiter(config.limits);
  }

  abstract connect(): Promise<void>;
  abstract authenticate(): Promise<AuthResult>;
  abstract disconnect(): Promise<void>;
  abstract post(content: Content): Promise<PostResult>;
  abstract listen(filters: EventFilter[]): AsyncIterator<PlatformEvent>;
  abstract react(event: PlatformEvent, response: AgentResponse): Promise<void>;
  abstract getUser(userId: string): Promise<PlatformUser>;
  abstract getUserPosts(userId: string, limit?: number): Promise<Content[]>;
  abstract deletePost(postId: string): Promise<boolean>;
  abstract editPost(postId: string, content: Content): Promise<PostResult>;

  async executeAction(response: AgentResponse): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Platform not connected');
    }

    // Check rate limits
    await this.rateLimiter.checkLimit(response.type);

    switch (response.type) {
      case ResponseType.POST:
        if (response.content) {
          await this.post(response.content);
        }
        break;
      case ResponseType.REPLY:
        if (response.content) {
          await this.reply(response.content);
        }
        break;
      case ResponseType.REACT:
        if (response.action) {
          await this.addReaction(response.action.parameters.postId, response.action.parameters.reaction);
        }
        break;
      case ResponseType.FOLLOW:
        if (response.action) {
          await this.followUser(response.action.parameters.userId);
        }
        break;
      case ResponseType.SHARE:
        if (response.action) {
          await this.sharePost(response.action.parameters.postId);
        }
        break;
      default:
        await this.executeCustomAction(response);
    }

    this.lastActivity = Date.now();
  }

  protected async reply(content: Content): Promise<PostResult> {
    // Default implementation - platforms can override
    return await this.post(content);
  }

  protected async addReaction(postId: string, reaction: string): Promise<void> {
    throw new Error('Reactions not supported on this platform');
  }

  protected async followUser(userId: string): Promise<void> {
    throw new Error('Following not supported on this platform');
  }

  protected async sharePost(postId: string): Promise<void> {
    throw new Error('Sharing not supported on this platform');
  }

  protected async executeCustomAction(response: AgentResponse): Promise<void> {
    throw new Error('Custom actions not implemented');
  }

  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  getStatus(): PlatformStatus {
    return {
      platform: this.config.name,
      connected: this.isConnected,
      lastActivity: this.lastActivity,
      rateLimitStatus: this.rateLimiter.getStatus()
    };
  }

  protected emitEvent(event: PlatformEvent): void {
    this.emit('event', event);
  }

  protected emitError(error: Error): void {
    this.emit('error', error);
  }
}

export interface PlatformStatus {
  platform: string;
  connected: boolean;
  lastActivity: number;
  rateLimitStatus: RateLimitStatus;
}

export interface RateLimitStatus {
  postsRemaining: number;
  followsRemaining: number;
  resetTime: number;
}

class RateLimiter {
  private limits: PlatformLimits;
  private usage: Map<string, UsageCounter> = new Map();

  constructor(limits: PlatformLimits) {
    this.limits = limits;
  }

  async checkLimit(actionType: ResponseType): Promise<void> {
    const counter = this.getCounter(actionType);
    
    if (counter.isLimitExceeded()) {
      const resetTime = counter.getResetTime();
      const waitTime = resetTime - Date.now();
      
      if (waitTime > 0) {
        throw new Error(`Rate limit exceeded. Reset in ${Math.ceil(waitTime / 1000)} seconds`);
      }
    }

    counter.increment();
  }

  private getCounter(actionType: ResponseType): UsageCounter {
    const key = actionType;
    if (!this.usage.has(key)) {
      this.usage.set(key, new UsageCounter(this.getLimitForAction(actionType)));
    }
    return this.usage.get(key)!;
  }

  private getLimitForAction(actionType: ResponseType): number {
    switch (actionType) {
      case ResponseType.POST:
      case ResponseType.REPLY:
        return this.limits.postsPerHour;
      case ResponseType.FOLLOW:
        return this.limits.followsPerHour;
      default:
        return this.limits.postsPerHour; // Default to post limit
    }
  }

  getStatus(): RateLimitStatus {
    const postCounter = this.getCounter(ResponseType.POST);
    const followCounter = this.getCounter(ResponseType.FOLLOW);

    return {
      postsRemaining: postCounter.getRemainingLimit(),
      followsRemaining: followCounter.getRemainingLimit(),
      resetTime: Math.max(postCounter.getResetTime(), followCounter.getResetTime())
    };
  }
}

class UsageCounter {
  private limit: number;
  private usage: number = 0;
  private windowStart: number = Date.now();
  private windowSize: number = 60 * 60 * 1000; // 1 hour

  constructor(limit: number) {
    this.limit = limit;
  }

  increment(): void {
    this.resetIfNeeded();
    this.usage++;
  }

  isLimitExceeded(): boolean {
    this.resetIfNeeded();
    return this.usage >= this.limit;
  }

  getRemainingLimit(): number {
    this.resetIfNeeded();
    return Math.max(0, this.limit - this.usage);
  }

  getResetTime(): number {
    return this.windowStart + this.windowSize;
  }

  private resetIfNeeded(): void {
    const now = Date.now();
    if (now >= this.windowStart + this.windowSize) {
      this.usage = 0;
      this.windowStart = now;
    }
  }
}

// Platform-specific adapter implementations would extend PlatformAdapter
export class DiscordAdapter extends PlatformAdapter {
  // Discord-specific implementation
}

export class TwitterAdapter extends PlatformAdapter {
  // Twitter-specific implementation  
}

export class TelegramAdapter extends PlatformAdapter {
  // Telegram-specific implementation
}

export class GamePlatformAdapter extends PlatformAdapter {
  // Gaming platform-specific implementation
}