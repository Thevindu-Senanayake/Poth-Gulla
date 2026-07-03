/* eslint-disable */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service.js';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'n1',
          read: false,
          createdAt: new Date(),
          ...data,
        })),
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    service = new NotificationService(prisma as any);
  });

  describe('create + SSE push', () => {
    it('persists the notification and pushes it to the connected stream', async () => {
      const received = firstValueFrom(service.getStream('u1'));
      await service.create('u1', 'BOOKING_APPROVED', 'Your booking is ready');

      const event: any = await received;
      const payload = JSON.parse(event.data as string);
      expect(payload.type).toBe('BOOKING_APPROVED');
      expect(payload.message).toBe('Your booking is ready');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          type: 'BOOKING_APPROVED',
          message: 'Your booking is ready',
        },
      });
    });

    it('does not push to other users streams', async () => {
      const other: any[] = [];
      const sub = service.getStream('u2').subscribe((e) => other.push(e));
      await service.create('u1', 'BOOKING_APPROVED', 'not for u2');
      sub.unsubscribe();
      expect(other).toHaveLength(0);
    });

    it('still persists when nobody is connected', async () => {
      await service.create('lonely', 'BOOKING_PENDING', 'no listeners');
      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('markRead ownership', () => {
    it('scopes the update to the calling user (no cross-user reads)', async () => {
      await service.markRead('n1', 'u1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', userId: 'u1' },
        data: { read: true },
      });
    });

    it('reports zero updates when the notification belongs to someone else', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });
      const res = await service.markRead('n1', 'intruder');
      expect(res).toEqual({ updated: 0 });
    });
  });

  it('markAllRead only touches the callers unread rows', async () => {
    await service.markAllRead('u1');
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', read: false },
      data: { read: true },
    });
  });

  it('findForUser paginates and reports meta', async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
    prisma.notification.count.mockResolvedValue(11);
    const res = await service.findForUser('u1', { page: 2, limit: 5 });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, skip: 5, take: 5 }),
    );
    expect(res.meta).toEqual({ page: 2, limit: 5, total: 11, pages: 3 });
  });
});
