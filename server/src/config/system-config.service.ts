import { Injectable } from '@nestjs/common';
import {
  Prisma,
  AuditAction,
  AuditTargetType,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

const SINGLETON_ID = 'singleton';

// Admin-editable runtime rules. Defaults mirror the canonical numbers in
// DEVELOPMENT.md §7B / domain.constants.ts. Persisted in the SystemConfig singleton so
// the System Config screen survives reloads (see issue #23).

export interface TierConfig {
  tier: string;
  label: string;
  col: string;
  threshold: number;
  books: number;
  devices: number;
  rooms: number;
}

export interface PenaltyConfig {
  rule: string;
  value: string;
}

export interface ToggleConfig {
  label: string;
  on: boolean;
}

export interface SystemConfigData {
  tiers: TierConfig[];
  penalties: PenaltyConfig[];
  toggles: ToggleConfig[];
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfigData = {
  tiers: [
    {
      tier: 'Tier 1',
      label: 'Restricted',
      col: '#ef4444',
      threshold: 0,
      books: 1,
      devices: 1,
      rooms: 1,
    },
    {
      tier: 'Tier 2',
      label: 'Basic',
      col: '#d97706',
      threshold: 200,
      books: 2,
      devices: 1,
      rooms: 1,
    },
    {
      tier: 'Tier 3',
      label: 'Regular',
      col: '#16a34a',
      threshold: 500,
      books: 3,
      devices: 2,
      rooms: 1,
    },
    {
      tier: 'Tier 4',
      label: 'Trusted',
      col: '#3b82f6',
      threshold: 1000,
      books: 4,
      devices: 3,
      rooms: 2,
    },
    {
      tier: 'Tier 5',
      label: 'Elite',
      col: '#8b5cf6',
      threshold: 2000,
      books: 5,
      devices: 3,
      rooms: 2,
    },
  ],
  penalties: [
    { rule: 'Book returned on time', value: '+25' },
    { rule: 'Book returned early (3+ days)', value: '+50' },
    { rule: 'Book late (per day, days 2–7)', value: '−20/day' },
    { rule: 'Device returned on time / early', value: '+30 / +40' },
    { rule: 'Device returned damaged', value: '−300' },
    { rule: 'Room attended (QR check-in)', value: '+20' },
    { rule: 'Room no-show', value: '−150' },
    { rule: 'Approved booking cancelled', value: '−25' },
    { rule: 'Recall flag set (days overdue)', value: '2' },
    { rule: 'Escalate to admin (days overdue)', value: '7' },
  ],
  toggles: [
    { label: 'Waitlist justification messages', on: true },
    { label: 'Collaborative recommendations (Redis-cached)', on: true },
    { label: 'QR-based checkout / return', on: true },
    { label: 'Overdue sweep job', on: true },
    { label: 'Tier 4–5 device approval required', on: true },
    { label: 'Faculty (lecturer) priority weighting', on: true },
  ],
};

@Injectable()
export class SystemConfigService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** Returns the stored config, lazily creating it with defaults on first read. */
  async get(): Promise<SystemConfigData> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { id: SINGLETON_ID },
    });
    const data = row
      ? (row.data as unknown as SystemConfigData)
      : ((
          await this.prisma.systemConfig.create({
            data: {
              id: SINGLETON_ID,
              data: DEFAULT_SYSTEM_CONFIG as unknown as Prisma.InputJsonObject,
            },
          })
        ).data as unknown as SystemConfigData);

    if (data && data.tiers) {
      data.tiers = data.tiers.map((t) => ({
        ...t,
        threshold:
          t.threshold !== undefined && t.threshold !== null
            ? Number(t.threshold)
            : t.threshold,
        books:
          t.books !== undefined && t.books !== null ? Number(t.books) : t.books,
        devices:
          t.devices !== undefined && t.devices !== null
            ? Number(t.devices)
            : t.devices,
        rooms:
          t.rooms !== undefined && t.rooms !== null ? Number(t.rooms) : t.rooms,
      }));
    }
    return data;
  }

  /** Merge the provided sections over the current config and persist (upsert). Logs to audit trail. */
  async update(
    patch: Partial<SystemConfigData>,
    actorId?: string | null,
  ): Promise<SystemConfigData> {
    const current = await this.get();

    const updatedTiers = patch.tiers?.map((t) => ({
      ...t,
      threshold:
        t.threshold !== undefined && t.threshold !== null
          ? Number(t.threshold)
          : t.threshold,
      books:
        t.books !== undefined && t.books !== null ? Number(t.books) : t.books,
      devices:
        t.devices !== undefined && t.devices !== null
          ? Number(t.devices)
          : t.devices,
      rooms:
        t.rooms !== undefined && t.rooms !== null ? Number(t.rooms) : t.rooms,
    }));

    const next: SystemConfigData = {
      tiers: updatedTiers ?? current.tiers,
      penalties: patch.penalties ?? current.penalties,
      toggles: patch.toggles ?? current.toggles,
    };
    const row = await this.prisma.systemConfig.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        data: next as unknown as Prisma.InputJsonObject,
      },
      update: { data: next as unknown as Prisma.InputJsonObject },
    });

    const differences: {
      tiers?: Array<{
        tier: string;
        changes: Record<string, { from: any; to: any }>;
      }>;
      penalties?: Array<{ rule: string; from: string; to: string }>;
      toggles?: Array<{ label: string; from: boolean; to: boolean }>;
    } = {};

    // 1. Compare Tiers
    if (patch.tiers) {
      const tierDiffs: Array<{
        tier: string;
        changes: Record<string, { from: any; to: any }>;
      }> = [];
      for (const nextTier of next.tiers) {
        const currTier = current.tiers.find((t) => t.tier === nextTier.tier);
        if (currTier) {
          const changes: Record<string, { from: any; to: any }> = {};
          for (const field of [
            'threshold',
            'books',
            'devices',
            'rooms',
            'label',
            'col',
          ] as const) {
            if (currTier[field] !== nextTier[field]) {
              changes[field] = { from: currTier[field], to: nextTier[field] };
            }
          }
          if (Object.keys(changes).length > 0) {
            tierDiffs.push({ tier: nextTier.tier, changes });
          }
        }
      }
      if (tierDiffs.length > 0) {
        differences.tiers = tierDiffs;
      }
    }

    // 2. Compare Penalties
    if (patch.penalties) {
      const penaltyDiffs: Array<{ rule: string; from: string; to: string }> =
        [];
      for (const nextPen of next.penalties) {
        const currPen = current.penalties.find((p) => p.rule === nextPen.rule);
        if (currPen) {
          if (currPen.value !== nextPen.value) {
            penaltyDiffs.push({
              rule: nextPen.rule,
              from: currPen.value,
              to: nextPen.value,
            });
          }
        }
      }
      if (penaltyDiffs.length > 0) {
        differences.penalties = penaltyDiffs;
      }
    }

    // 3. Compare Toggles
    if (patch.toggles) {
      const toggleDiffs: Array<{ label: string; from: boolean; to: boolean }> =
        [];
      for (const nextTog of next.toggles) {
        const currTog = current.toggles.find((t) => t.label === nextTog.label);
        if (currTog) {
          if (currTog.on !== nextTog.on) {
            toggleDiffs.push({
              label: nextTog.label,
              from: currTog.on,
              to: nextTog.on,
            });
          }
        }
      }
      if (toggleDiffs.length > 0) {
        differences.toggles = toggleDiffs;
      }
    }

    // Log the configuration update
    await this.audit.log(
      actorId ?? null,
      AuditAction.CONFIG_UPDATED,
      AuditTargetType.SystemConfig,
      SINGLETON_ID,
      {
        patch: patch as unknown as Prisma.InputJsonObject,
        differences: differences,
      },
    );

    return row.data as unknown as SystemConfigData;
  }
}
