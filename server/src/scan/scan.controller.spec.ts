import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '../../generated/prisma/client.js';
import { ScanController } from './scan.controller.js';

const staff = { userId: 's1', role: Role.LIBRARY_STAFF };

describe('ScanController', () => {
  let controller: ScanController;
  let scan: {
    checkout: jest.Mock;
    roomCheckin: jest.Mock;
    returnItem: jest.Mock;
  };

  beforeEach(() => {
    scan = {
      checkout: jest.fn(),
      roomCheckin: jest.fn(),
      returnItem: jest.fn(),
    };
    controller = new ScanController(scan as any);
  });

  it('POST /scan/checkout delegates to scan.checkout', () => {
    const dto = { bookingQr: 'B', assetTag: 'A' } as any;
    controller.checkout(dto);
    expect(scan.checkout).toHaveBeenCalledWith(dto);
  });

  it('POST /scan/room-checkin passes the current user id and dto', () => {
    const dto = { roomQr: 'ROOM-1' } as any;
    controller.roomCheckin(staff, dto);
    expect(scan.roomCheckin).toHaveBeenCalledWith('s1', dto);
  });

  it('POST /scan/return delegates to scan.returnItem', () => {
    const dto = { assetTag: 'A', condition: 'GOOD' } as any;
    controller.returnItem(dto);
    expect(scan.returnItem).toHaveBeenCalledWith(dto);
  });
});
