import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RoomController } from './room.controller.js';

describe('RoomController', () => {
  let controller: RoomController;
  let rooms: {
    findMany: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    setMaintenance: jest.Mock;
  };

  beforeEach(() => {
    rooms = {
      findMany: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      setMaintenance: jest.fn(),
    };
    controller = new RoomController(rooms as any);
  });

  describe('GET /catalogue/rooms', () => {
    it('passes undefined dates when no slot filter given', () => {
      controller.findAll();
      expect(rooms.findMany).toHaveBeenCalledWith(undefined, undefined);
    });

    it('converts startAt/endAt strings to Date objects', () => {
      controller.findAll('2026-06-23T10:00:00Z', '2026-06-23T12:00:00Z');
      const [start, end] = rooms.findMany.mock.calls[0];
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
      expect((start as Date).toISOString()).toBe('2026-06-23T10:00:00.000Z');
    });
  });

  it('GET /:id delegates to findById', () => {
    controller.findOne('r1');
    expect(rooms.findById).toHaveBeenCalledWith('r1');
  });

  it('POST creates a room', () => {
    const dto = { name: 'R1', capacity: 4, roomQr: 'QR' } as any;
    controller.create(dto);
    expect(rooms.create).toHaveBeenCalledWith(dto);
  });

  it('PATCH updates a room', () => {
    controller.update('r1', { capacity: 6 });
    expect(rooms.update).toHaveBeenCalledWith('r1', { capacity: 6 });
  });

  it('DELETE removes a room', () => {
    controller.remove('r1');
    expect(rooms.remove).toHaveBeenCalledWith('r1');
  });

  it('PATCH :id/maintenance toggles maintenance', () => {
    controller.setMaintenance('r1', { underMaintenance: false });
    expect(rooms.setMaintenance).toHaveBeenCalledWith('r1', false);
  });
});
