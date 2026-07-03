/* eslint-disable */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookService } from './book.service.js';

describe('BookService', () => {
  let service: BookService;
  let prisma: any;
  let redis: any;

  beforeEach(() => {
    prisma = {
      bookTitle: {
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        findUnique: jest.fn(async () => null),
        update: jest.fn(async ({ data }: any) => ({ id: 't1', ...data })),
      },
      bookCopy: {
        findUnique: jest.fn(async () => null),
        update: jest.fn(async ({ data }: any) => ({ id: 'c1', ...data })),
      },
    };
    redis = {
      get: jest.fn(async () => null),
      set: jest.fn(async () => undefined),
      delByPattern: jest.fn(async () => undefined),
    };
    service = new BookService(prisma as any, redis as any);
  });

  describe('findMany role-based visibility', () => {
    it('students: hides archived titles and titles with all copies retired', async () => {
      await service.findMany({ page: 1, limit: 20, showHidden: false });
      const where = prisma.bookTitle.findMany.mock.calls[0][0].where;
      expect(where.archivedAt).toBeNull();
      expect(where.copies).toEqual({
        some: { status: { not: 'RETIRED' } },
      });
    });

    it('staff (showHidden): no visibility filters applied', async () => {
      await service.findMany({ page: 1, limit: 20, showHidden: true });
      const where = prisma.bookTitle.findMany.mock.calls[0][0].where;
      expect(where.archivedAt).toBeUndefined();
      expect(where.copies).toBeUndefined();
    });

    it('cache key differs between hidden and visible views', async () => {
      await service.findMany({ page: 1, limit: 20, showHidden: false });
      await service.findMany({ page: 1, limit: 20, showHidden: true });
      const [k1] = redis.get.mock.calls[0];
      const [k2] = redis.get.mock.calls[1];
      expect(k1).not.toEqual(k2);
    });
  });

  describe('findById archived visibility', () => {
    it('throws NotFound for a patron opening an archived title by direct URL', async () => {
      prisma.bookTitle.findUnique.mockResolvedValue({
        id: 't1',
        archivedAt: new Date(),
      });
      await expect(service.findById('t1', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the archived title for staff', async () => {
      prisma.bookTitle.findUnique.mockResolvedValue({
        id: 't1',
        archivedAt: new Date(),
      });
      const res: any = await service.findById('t1', true);
      expect(res.id).toBe('t1');
    });

    it('enforces the archived check even on a cache hit', async () => {
      redis.get.mockResolvedValue({
        id: 't1',
        archivedAt: '2026-06-01T00:00:00Z',
      });
      await expect(service.findById('t1', false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archive / unarchive', () => {
    it('archive stamps archivedAt and busts the cache', async () => {
      prisma.bookTitle.findUnique.mockResolvedValue({ id: 't1' });
      await service.archive('t1');
      expect(prisma.bookTitle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: { archivedAt: expect.any(Date) },
        }),
      );
      expect(redis.delByPattern).toHaveBeenCalledWith('catalogue:books:*');
    });

    it('unarchive clears archivedAt', async () => {
      prisma.bookTitle.findUnique.mockResolvedValue({ id: 't1' });
      await service.unarchive('t1');
      expect(prisma.bookTitle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { archivedAt: null } }),
      );
    });
  });

  describe('retireCopy guards', () => {
    it('rejects retiring a RESERVED copy (booking holds it)', async () => {
      prisma.bookCopy.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'RESERVED',
      });
      await expect(service.retireCopy('c1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects retiring a BORROWED copy', async () => {
      prisma.bookCopy.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'BORROWED',
      });
      await expect(service.retireCopy('c1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('retires an AVAILABLE copy', async () => {
      prisma.bookCopy.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'AVAILABLE',
      });
      await service.retireCopy('c1');
      expect(prisma.bookCopy.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'RETIRED' } }),
      );
    });
  });
});
