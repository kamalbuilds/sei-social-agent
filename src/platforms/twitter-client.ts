import { EventEmitter } from 'events';
import { TwitterApi } from 'twitter-api-v2';
import { logger } from '../utils/logger';

export class TwitterClient extends EventEmitter {
  private client?: TwitterApi;
  private streamRules: Set<string> = new Set();
  private stream?: any;

  async connect(): Promise<void> {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });

    // Verify credentials
    const user = await this.client.v2.me();
    logger.info(`Connected to Twitter as @${user.data.username}`);
  }

  async startMonitoring(options: any): Promise<void> {
    if (!this.client) throw new Error('Twitter client not connected');

    // Set up stream rules for keywords
    for (const keyword of options.keywords) {
      await this.client.v2.updateStreamRules({
        add: [{ value: keyword, tag: keyword }]
      });
      this.streamRules.add(keyword);
    }

    // Start filtered stream
    this.stream = await this.client.v2.searchStream({
      'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'entities'],
      'user.fields': ['username', 'description'],
      expansions: ['author_id']
    });

    this.stream.on('data', (tweet: any) => {
      this.emit('newContent', tweet.data);
    });
  }

  async fetchContent(options: any): Promise<any[]> {
    if (!this.client) return [];

    const tweets = await this.client.v2.search(
      options.keywords.join(' OR '),
      {
        max_results: 10,
        'tweet.fields': ['author_id', 'created_at', 'public_metrics']
      }
    );

    return tweets.data.data || [];
  }

  async reply(tweetId: string, message: string): Promise<void> {
    if (!this.client) throw new Error('Twitter client not connected');

    await this.client.v2.reply(message, tweetId);
  }

  async stopMonitoring(): Promise<void> {
    if (this.stream) {
      this.stream.close();
    }

    // Clear stream rules
    if (this.client && this.streamRules.size > 0) {
      const rules = await this.client.v2.streamRules();
      const ids = rules.data?.map(r => r.id) || [];
      if (ids.length > 0) {
        await this.client.v2.updateStreamRules({
          delete: { ids }
        });
      }
    }

    this.streamRules.clear();
  }

  async disconnect(): Promise<void> {
    await this.stopMonitoring();
    this.client = undefined;
  }

  getStats(): any {
    return {
      connected: !!this.client,
      streamRules: Array.from(this.streamRules)
    };
  }
}