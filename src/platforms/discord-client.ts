import { EventEmitter } from 'events';
import { Client, GatewayIntentBits, Message } from 'discord.js';
import { logger } from '../utils/logger';

export class DiscordClient extends EventEmitter {
  private client?: Client;
  private monitoredChannels: Set<string> = new Set();

  async connect(): Promise<void> {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
      ]
    });

    await this.client.login(process.env.DISCORD_BOT_TOKEN);
    
    this.client.on('ready', () => {
      logger.info(`Connected to Discord as ${this.client?.user?.tag}`);
    });
  }

  async startMonitoring(options: any): Promise<void> {
    if (!this.client) throw new Error('Discord client not connected');

    // Monitor messages in specified guild
    this.client.on('messageCreate', (message: Message) => {
      if (message.author.bot) return;

      // Check if message contains keywords
      const hasKeyword = options.keywords.some((keyword: string) => 
        message.content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        this.emit('newContent', message);
      }
    });

    // Monitor reactions for engagement metrics
    this.client.on('messageReactionAdd', (reaction, user) => {
      // Update engagement metrics
    });
  }

  async fetchContent(options: any): Promise<any[]> {
    if (!this.client) return [];

    const messages: any[] = [];
    const guild = this.client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);
    
    if (guild) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isTextBased()) {
          const channelMessages = await channel.messages.fetch({ limit: 10 });
          messages.push(...channelMessages.values());
        }
      }
    }

    return messages;
  }

  async reply(messageId: string, content: string): Promise<void> {
    if (!this.client) throw new Error('Discord client not connected');

    // Find message across all channels
    const guild = this.client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);
    if (guild) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isTextBased()) {
          try {
            const message = await channel.messages.fetch(messageId);
            await message.reply(content);
            return;
          } catch {
            // Message not in this channel
          }
        }
      }
    }
  }

  async stopMonitoring(): Promise<void> {
    if (this.client) {
      this.client.removeAllListeners('messageCreate');
      this.client.removeAllListeners('messageReactionAdd');
    }
    this.monitoredChannels.clear();
  }

  async disconnect(): Promise<void> {
    await this.stopMonitoring();
    if (this.client) {
      await this.client.destroy();
      this.client = undefined;
    }
  }

  getStats(): any {
    return {
      connected: !!this.client,
      guilds: this.client?.guilds.cache.size || 0,
      monitoredChannels: this.monitoredChannels.size
    };
  }
}