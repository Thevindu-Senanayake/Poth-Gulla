import { Injectable } from '@nestjs/common';
import { BookTitle } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

const TTL_RECS = 300; // 5 minutes

@Injectable()
export class RecommendationService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Tag-based recommendations.
   *
   * 1. Collect tags from every book the user has a COMPLETED borrowing for.
   * 2. Build a frequency map of those tags.
   * 3. Find all other book titles (never borrowed by this user) that share at
   *    least one tag.
   * 4. Score each candidate by summing the frequency of each shared tag
   *    (books with rarer shared tags rank higher than books matching only
   *    common ones).
   * 5. Return the top `limit` titles ordered by score descending.
   */
  async forUser(userId: string, limit = 10): Promise<BookTitle[]> {
    const cacheKey = `recommendations:${userId}:${limit}`;
    const cached = await this.redis.get<BookTitle[]>(cacheKey);
    if (cached) return cached;

    const result = await this.computeForUser(userId, limit);
    await this.redis.set(cacheKey, result, TTL_RECS);
    return result;
  }

  /** Invalidate cached recommendations for a user (call after they return a book). */
  async invalidate(userId: string): Promise<void> {
    await this.redis.delByPattern(`recommendations:${userId}:*`);
  }

  private async computeForUser(
    userId: string,
    limit: number,
  ): Promise<BookTitle[]> {
    const borrowedTitles = await this.prisma.bookTitle.findMany({
      where: {
        bookings: {
          some: {
            userId,
            borrowing: { status: 'RETURNED' },
          },
        },
      },
      select: { id: true, tags: true },
    });

    if (borrowedTitles.length === 0) return this.fallback(userId, limit);

    const borrowedIds = new Set(borrowedTitles.map((b) => b.id));

    const tagFreq = new Map<string, number>();
    for (const title of borrowedTitles) {
      for (const tag of title.tags) {
        tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
      }
    }

    const interestTags = [...tagFreq.keys()];
    if (interestTags.length === 0) return this.fallback(userId, limit);

    const candidates = await this.prisma.bookTitle.findMany({
      where: {
        id: { notIn: [...borrowedIds] },
        tags: { hasSome: interestTags },
      },
      include: { category: true, _count: { select: { copies: true } } },
    });

    const scored = candidates.map((title) => {
      const score = title.tags.reduce(
        (acc, tag) => acc + (tagFreq.get(tag) ?? 0),
        0,
      );
      return { title, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.title);
  }

  private fallback(userId: string, limit: number): Promise<BookTitle[]> {
    return this.prisma.bookTitle.findMany({
      where: { bookings: { none: { userId } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { category: true, _count: { select: { copies: true } } },
    });
  }
}
