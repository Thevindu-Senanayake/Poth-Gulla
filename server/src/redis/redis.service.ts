import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  // Whether we've already logged the current outage, so we warn once per streak
  // instead of on every reconnect attempt.
  private outageLogged = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url =
      this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.client = new Redis(url, {
      lazyConnect: true,
      // Fail commands fast while down rather than queueing them - every cache
      // call already falls back to Postgres on error.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      // Keep retrying so a late-starting Redis reconnects, but back off (1s, 2s,
      // … capped at 30s) instead of hammering once a second.
      retryStrategy: (times) => Math.min(times * 1000, 30000),
    });

    this.client.on('ready', () => {
      if (this.outageLogged)
        this.logger.log('Redis reconnected - caching enabled');
      this.outageLogged = false;
    });

    this.client.on('error', (err) => {
      // Log only the first error of an outage; suppress the reconnect-loop spam.
      if (this.outageLogged) return;
      this.outageLogged = true;
      const reason =
        err?.message ||
        (err as { code?: string })?.code ||
        err?.name ||
        'unknown error';
      this.logger.warn(
        `Redis unavailable - caching disabled, falling back to the database (${reason}). Retrying in the background.`,
      );
    });

    this.client.connect().catch(() => {
      // The 'error' handler above already reported it; nothing more to do.
    });
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => undefined);
  }

  /** True only when a command can actually be issued (connection is live). */
  private get ready(): boolean {
    return this.client?.status === 'ready';
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.ready) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.ready) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // cache miss is non-fatal
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.ready || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch {
      // ignore
    }
  }

  /** Delete all keys matching a glob pattern using SCAN + DEL (non-blocking). */
  async delByPattern(pattern: string): Promise<void> {
    if (!this.ready) return;
    try {
      let cursor = '0';
      const toDelete: string[] = [];
      do {
        const [next, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = next;
        toDelete.push(...keys);
      } while (cursor !== '0');
      if (toDelete.length > 0) await this.client.del(...toDelete);
    } catch {
      // ignore
    }
  }
}
