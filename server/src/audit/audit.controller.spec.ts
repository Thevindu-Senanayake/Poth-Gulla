import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuditController } from './audit.controller.js';

describe('AuditController', () => {
  let controller: AuditController;
  let audit: { findMany: jest.Mock };

  beforeEach(() => {
    audit = { findMany: jest.fn() };
    controller = new AuditController(audit as any);
  });

  it('GET /audit/logs passes parsed paging and filters', () => {
    controller.findMany('2', '50', 'actor-1', 'CREATE', 'BOOKING');
    expect(audit.findMany).toHaveBeenCalledWith({
      page: 2,
      limit: 50,
      actorId: 'actor-1',
      action: 'CREATE',
      targetType: 'BOOKING',
    });
  });

  it('floors page at 1 and clamps limit to 200', () => {
    controller.findMany('0', '9999');
    expect(audit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 200 }),
    );
  });

  it('defaults filters to undefined', () => {
    controller.findMany();
    expect(audit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: undefined,
        action: undefined,
        targetType: undefined,
      }),
    );
  });
});
