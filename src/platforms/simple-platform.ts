import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface Content {
  id: string;
  platform: 'twitter' | 'discord' | 'linkedin';
  creator: {
    id: string;
    username: string;
    walletAddress?: string;
  };
  text: string;
  metrics: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
  };
  timestamp: Date;
  url: string;
}

export interface MonitoringOptions {
  keywords: string[];
  creators: string[];
}

export class PlatformSDK extends EventEmitter {
  private platforms: string[];
  private monitoring: boolean = false;
  
  constructor(enabledPlatforms: string[]) {
    super();
    this.platforms = enabledPlatforms;
  }

  async connectAll(): Promise<void> {
    // Mock connection for testing
    logger.info(`Connecting to platforms: ${this.platforms.join(', ')}`);
    
    // Simulate connection time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    logger.info('All platforms connected successfully');
  }

  async startMonitoring(options: MonitoringOptions): Promise<void> {
    if (this.monitoring) {
      logger.warn('Monitoring already active');
      return;
    }

    this.monitoring = true;
    logger.info(`Started monitoring with keywords: ${options.keywords.join(', ')}`);
    
    // Simulate content stream
    setTimeout(() => {
      if (this.monitoring) {
        this.emit('newContent', {
          id: 'test-content-1',
          platform: 'twitter',
          creator: {
            id: 'user123',
            username: 'testuser',
            walletAddress: '0x' + Math.random().toString(16).substr(2, 40)
          },
          text: 'This is a test post about #SeiNetwork and #Web3',
          metrics: {
            likes: 100,
            shares: 20,
            comments: 15,
            views: 500
          },
          timestamp: new Date(),
          url: 'https://twitter.com/testuser/status/123'
        });
      }
    }, 1000);
  }

  async replyToContent(content: Content, options: { message: string }): Promise<void> {
    logger.info(`Replying to content ${content.id} on ${content.platform}: ${options.message}`);
    // Mock reply
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async stopMonitoring(): Promise<void> {
    this.monitoring = false;
    logger.info('Stopped monitoring platforms');
  }

  async disconnect(): Promise<void> {
    await this.stopMonitoring();
    logger.info('Disconnected from all platforms');
  }

  getPlatformStats(): any {
    return {
      connected: this.platforms.length,
      monitoring: this.monitoring,
      platforms: this.platforms
    };
  }
}