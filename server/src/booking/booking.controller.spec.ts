import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../../generated/prisma/client.js';
import { BookingController } from './booking.controller.js';

const staff = { userId: 's1', email: 's@x.com', role: Role.LIBRARY_STAFF };
const student = { userId: 'u1', email: 'u@x.com', role: Role.STUDENT };

describe('BookingController', () => {
  let controller: BookingController;
  let bookings: {
    create: jest.Mock;
    findMine: jest.Mock;
    findMany: jest.Mock;
    findById: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    cancel: jest.Mock;
  };

  beforeEach(() => {
    bookings = {
      create: jest.fn(),
      findMine: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      cancel: jest.fn(),
    };
    controller = new BookingController(bookings as any);
  });

  describe('POST /bookings', () => {
    it('creates a booking for the current user', () => {
      const dto = { resourceType: 'BOOK' } as any;
      controller.create(student, dto);
      expect(bookings.create).toHaveBeenCalledWith('u1', dto);
    });
  });

  describe('GET /bookings/me', () => {
    it('returns own bookings with parsed paging', async () => {
      bookings.findMine.mockResolvedValue([[{ id: 'b1' }], 1]);
      const res = await controller.findMine(student, '2', '10');
      expect(bookings.findMine).toHaveBeenCalledWith('u1', {
        page: 2,
        limit: 10,
        status: undefined,
        resourceType: undefined,
      });
      expect(res).toEqual({ data: [{ id: 'b1' }], total: 1, page: 2 });
    });

    it('clamps limit to 100', async () => {
      bookings.findMine.mockResolvedValue([[], 0]);
      await controller.findMine(student, '1', '500');
      expect(bookings.findMine).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ limit: 100 }),
      );
    });
  });

  describe('GET /bookings (all)', () => {
    it('lists all bookings with filters', async () => {
      bookings.findMany.mockResolvedValue([[], 0]);
      await controller.findAll('1', '20', 'u9', 'DEVICE', 'PENDING');
      expect(bookings.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        userId: 'u9',
        resourceType: 'DEVICE',
        status: 'PENDING',
      });
    });
  });

  describe('GET /bookings/:id', () => {
    it('returns the booking for its owner', async () => {
      bookings.findById.mockResolvedValue({ id: 'b1', userId: 'u1' });
      await expect(controller.findOne('b1', student as any)).resolves.toEqual({
        id: 'b1',
        userId: 'u1',
      });
    });

    it('allows staff to view any booking', async () => {
      bookings.findById.mockResolvedValue({ id: 'b1', userId: 'someoneElse' });
      await expect(
        controller.findOne('b1', staff as any),
      ).resolves.toBeTruthy();
    });

    it('forbids a non-owner non-staff user', async () => {
      bookings.findById.mockResolvedValue({ id: 'b1', userId: 'other' });
      await expect(controller.findOne('b1', student as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFound when the booking does not exist', async () => {
      bookings.findById.mockResolvedValue(null);
      await expect(controller.findOne('x', staff as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve / reject', () => {
    it('approves', () => {
      controller.approve('b1');
      expect(bookings.approve).toHaveBeenCalledWith('b1');
    });
    it('rejects', () => {
      controller.reject('b1');
      expect(bookings.reject).toHaveBeenCalledWith('b1');
    });
  });

  describe('cancel / cancel-any', () => {
    it('cancels own booking (non-emergency=false flag passed)', () => {
      controller.cancel('b1', student);
      expect(bookings.cancel).toHaveBeenCalledWith('u1', 'b1', false);
    });
    it('cancels any booking with staff override flag true', () => {
      controller.cancelAny('b1', staff);
      expect(bookings.cancel).toHaveBeenCalledWith('s1', 'b1', true);
    });
  });
});
