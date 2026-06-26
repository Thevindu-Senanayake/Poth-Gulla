import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  DEFAULT_SYSTEM_CONFIG,
  SystemConfigService,
} from './system-config.service.js';

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let prisma: {
    systemConfig: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      systemConfig: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };
    audit = { log: jest.fn() };
    service = new SystemConfigService(prisma as any, audit as any);
  });

  it('returns the stored config when the row exists', async () => {
    const stored = { tiers: [{ tier: 'Tier 1' }], penalties: [], toggles: [] };
    prisma.systemConfig.findUnique.mockResolvedValue({
      id: 'singleton',
      data: stored,
    });
    await expect(service.get()).resolves.toEqual(stored);
    expect(prisma.systemConfig.create).not.toHaveBeenCalled();
  });

  it('lazily seeds defaults when no row exists', async () => {
    prisma.systemConfig.findUnique.mockResolvedValue(null);
    prisma.systemConfig.create.mockImplementation(async ({ data }: any) => ({
      data: data.data,
    }));
    const cfg = await service.get();
    expect(cfg).toEqual(DEFAULT_SYSTEM_CONFIG);
    expect(prisma.systemConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: 'singleton' }),
      }),
    );
  });

  it('merges a partial patch over the current config and upserts', async () => {
    const current = {
      tiers: [
        {
          tier: 'old',
          threshold: 0,
          label: '',
          col: '',
          books: 1,
          devices: 1,
          rooms: 1,
        },
      ],
      penalties: [
        {
          key: 'BOOK_RETURNED_ON_TIME',
          label: 'Book returned on time',
          amount: 25,
        },
      ],
      toggles: [{ label: 't', on: true }],
    };
    prisma.systemConfig.findUnique.mockResolvedValue({ data: current });
    prisma.systemConfig.upsert.mockImplementation(async ({ update }: any) => ({
      data: update.data,
    }));
    audit.log.mockResolvedValue(null);

    const newTiers = [
      {
        tier: 'new',
        threshold: 250,
        label: '',
        col: '',
        books: 1,
        devices: 1,
        rooms: 1,
      },
    ];
    const result = await service.update({ tiers: newTiers });

    // tiers replaced; penalties/toggles carried over unchanged
    expect(result).toEqual({
      tiers: newTiers,
      penalties: current.penalties,
      toggles: current.toggles,
    });
    expect(prisma.systemConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'singleton' },
        update: {
          data: {
            tiers: newTiers,
            penalties: current.penalties,
            toggles: current.toggles,
          },
        },
      }),
    );
    // Verify CONFIG_UPDATED was logged with actorId = null when no actorId provided
    expect(audit.log).toHaveBeenCalledWith(
      null,
      'CONFIG_UPDATED',
      'SystemConfig',
      'singleton',
      {
        patch: { tiers: newTiers },
        differences: {},
      },
    );
  });
});
