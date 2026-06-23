import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client!: Redis;

    constructor(private config: ConfigService) {}

    onModuleInit() {
        const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
        this.client.on('error', err => this.logger.warn(`Redis error: ${err.message}`));
        this.client.connect().catch(err =>
            this.logger.warn(`Redis unavailable — caching disabled: ${err.message}`),
        );
    }

    async onModuleDestroy() {
        await this.client.quit().catch(() => undefined);
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const raw = await this.client.get(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    }

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch {
            // cache miss is non-fatal
        }
    }

    async del(...keys: string[]): Promise<void> {
        if (keys.length === 0) return;
        try {
            await this.client.del(...keys);
        } catch {
            // ignore
        }
    }

    /** Delete all keys matching a glob pattern using SCAN + DEL (non-blocking). */
    async delByPattern(pattern: string): Promise<void> {
        try {
            let cursor = '0';
            const toDelete: string[] = [];
            do {
                const [next, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = next;
                toDelete.push(...keys);
            } while (cursor !== '0');
            if (toDelete.length > 0) await this.client.del(...toDelete);
        } catch {
            // ignore
        }
    }
}
