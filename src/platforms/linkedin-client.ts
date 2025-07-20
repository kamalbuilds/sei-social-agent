import { EventEmitter } from 'events';
import axios from 'axios';
import { logger } from '../utils/logger';

export class LinkedInClient extends EventEmitter {
  private accessToken?: string;
  private profileId?: string;
  private pollInterval?: NodeJS.Timeout;

  async connect(): Promise<void> {
    // LinkedIn API requires OAuth 2.0
    // For hackathon, we'll use a simplified approach
    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    
    if (this.accessToken) {
      // Get profile info
      const profile = await this.getProfile();
      this.profileId = profile.id;
      logger.info(`Connected to LinkedIn as ${profile.localizedFirstName} ${profile.localizedLastName}`);
    } else {
      logger.warn('LinkedIn access token not configured');
    }
  }

  private async getProfile(): Promise<any> {
    const response = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    return response.data;
  }

  async startMonitoring(options: any): Promise<void> {
    if (!this.accessToken) {
      logger.warn('LinkedIn monitoring not available without access token');
      return;
    }

    // Poll for new posts every minute
    this.pollInterval = setInterval(async () => {
      const posts = await this.fetchContent(options);
      for (const post of posts) {
        this.emit('newContent', post);
      }
    }, 60000);
  }

  async fetchContent(options: any): Promise<any[]> {
    if (!this.accessToken) return [];

    try {
      // LinkedIn's API for fetching posts is limited
      // This is a simplified example
      const response = await axios.get(
        'https://api.linkedin.com/v2/shares',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            q: 'owner',
            owners: `urn:li:person:${this.profileId}`,
            count: 10
          }
        }
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Failed to fetch LinkedIn content:', error);
      return [];
    }
  }

  async reply(postId: string, message: string): Promise<void> {
    if (!this.accessToken) throw new Error('LinkedIn not connected');

    // LinkedIn API for comments
    await axios.post(
      'https://api.linkedin.com/v2/socialActions/urn:li:share:' + postId + '/comments',
      {
        actor: `urn:li:person:${this.profileId}`,
        message: {
          text: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  async stopMonitoring(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  async disconnect(): Promise<void> {
    await this.stopMonitoring();
    this.accessToken = undefined;
    this.profileId = undefined;
  }

  getStats(): any {
    return {
      connected: !!this.accessToken,
      profileId: this.profileId
    };
  }
}