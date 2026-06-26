import { Injectable, OnModuleDestroy, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationService implements OnModuleDestroy {
  // One Subject per active SSE connection. Multiple tabs → multiple Subjects
  // for the same userId, all receive the same events.
  private readonly streams = new Map<string, Set<Subject<MessageEvent>>>();

  constructor(private prisma: PrismaService) {}

  onModuleDestroy() {
    this.streams.forEach((set) => set.forEach((s) => s.complete()));
    this.streams.clear();
  }

  /** Return an Observable for one SSE connection. Cleans up on disconnect. */
  getStream(userId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    if (!this.streams.has(userId)) this.streams.set(userId, new Set());
    this.streams.get(userId)!.add(subject);

    return new Observable((subscriber) => {
      const sub = subject.subscribe(subscriber);
      return () => {
        sub.unsubscribe();
        const set = this.streams.get(userId);
        if (set) {
          set.delete(subject);
          if (set.size === 0) this.streams.delete(userId);
        }
      };
    });
  }

  async create(userId: string, type: string, message: string) {
    const n = await this.prisma.notification.create({
      data: { userId, type, message },
    });
    // Push to every open tab for this user
    this.streams.get(userId)?.forEach((s) =>
      s.next({
        data: JSON.stringify({
          id: n.id,
          type: n.type,
          message: n.message,
          read: false,
          createdAt: n.createdAt,
        }),
      }),
    );
    return n;
  }

  async findForUser(userId: string, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return {
      data,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return { updated: count };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
