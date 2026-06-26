import { Injectable } from '@nestjs/common';
import {
  Prisma,
  AuditAction,
  AuditTargetType,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { tierFromPointsWithConfig } from '../users/tier.utils.js';

const SINGLETON_ID = 'singleton';

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
  key: string; // PointAction key (or RECALL_DAYS / ESCALATE_DAYS for threshold entries)
  label: string; // admin-facing display label
  amount: number; // machine-readable numeric value used in calculations
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
    {
      key: 'BOOK_RETURNED_ON_TIME',
      label: 'Book returned on time',
      amount: 25,
    },
    {
      key: 'BOOK_RETURNED_EARLY',
      label: 'Book returned early (3+ days)',
      amount: 50,
    },
    { key: 'BOOK_LATE_1D', label: 'Book late (1 day)', amount: -10 },
    {
      key: 'BOOK_LATE_PER_DAY',
      label: 'Book late (per day, days 2-7)',
      amount: -20,
    },
    {
      key: 'BOOK_LATE_7D_PLUS',
      label: 'Book late (7+ days, flat penalty)',
      amount: -220,
    },
    {
      key: 'DEVICE_RETURNED_ON_TIME',
      label: 'Device returned on time',
      amount: 30,
    },
    {
      key: 'DEVICE_RETURNED_EARLY',
      label: 'Device returned early',
      amount: 40,
    },
    { key: 'DEVICE_LATE_1_3D', label: 'Device late (1-3 days)', amount: -80 },
    {
      key: 'DEVICE_LATE_3D_PLUS',
      label: 'Device late (3+ days, flat penalty)',
      amount: -160,
    },
    { key: 'DEVICE_DAMAGED', label: 'Device returned damaged', amount: -300 },
    { key: 'ROOM_ATTENDED', label: 'Room attended (QR check-in)', amount: 20 },
    { key: 'ROOM_NO_SHOW', label: 'Room no-show', amount: -150 },
    {
      key: 'BOOKING_CANCELLED',
      label: 'Approved booking cancelled',
      amount: -25,
    },
    {
      key: 'RECALL_DAYS',
      label: 'Recall flag after (days overdue)',
      amount: 2,
    },
    {
      key: 'ESCALATE_DAYS',
      label: 'Escalate to admin (days overdue)',
      amount: 7,
    },
  ],
  toggles: [
    { label: 'Waitlist justification messages', on: true },
    { label: 'Collaborative recommendations (Redis-cached)', on: true },
    { label: 'QR-based checkout / return', on: true },
    { label: 'Overdue sweep job', on: true },
    { label: 'Tier 4-5 device approval required', on: true },
    { label: 'Faculty (lecturer) priority weighting', on: true },
  ],
};

/** Lookup a penalty amount from config, falling back to a provided default. */
export function penaltyAmount(
  config: SystemConfigData,
  key: string,
  fallback: number,
): number {
  return config.penalties.find((p) => p.key === key)?.amount ?? fallback;
}

@Injectable()
export class SystemConfigService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async get(): Promise<SystemConfigData> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { id: SINGLETON_ID },
    });

    let data = row
      ? (row.data as unknown as SystemConfigData)
      : ((
          await this.prisma.systemConfig.create({
            data: {
              id: SINGLETON_ID,
              data: DEFAULT_SYSTEM_CONFIG as unknown as Prisma.InputJsonObject,
            },
          })
        ).data as unknown as SystemConfigData);

    // Migrate from old format { rule, value } → { key, label, amount } in-memory.
    // The new format is persisted the next time the admin saves config.
    if (
      data.penalties?.length > 0 &&
      'rule' in (data.penalties[0] as any) &&
      !('key' in (data.penalties[0] as any))
    ) {
      data = { ...data, penalties: DEFAULT_SYSTEM_CONFIG.penalties };
    }

    if (data?.tiers) {
      data.tiers = data.tiers.map((t) => ({
        ...t,
        threshold: t.threshold != null ? Number(t.threshold) : t.threshold,
        books: t.books != null ? Number(t.books) : t.books,
        devices: t.devices != null ? Number(t.devices) : t.devices,
        rooms: t.rooms != null ? Number(t.rooms) : t.rooms,
      }));
    }

    if (data?.penalties) {
      data.penalties = data.penalties.map((p: any) => ({
        ...p,
        amount: p.amount != null ? Number(p.amount) : 0,
      }));
    }

    return data;
  }

  async update(
    patch: Partial<SystemConfigData>,
    actorId?: string | null,
  ): Promise<SystemConfigData> {
    const current = await this.get();

    const updatedTiers = patch.tiers?.map((t) => ({
      ...t,
      threshold: t.threshold != null ? Number(t.threshold) : t.threshold,
      books: t.books != null ? Number(t.books) : t.books,
      devices: t.devices != null ? Number(t.devices) : t.devices,
      rooms: t.rooms != null ? Number(t.rooms) : t.rooms,
    }));

    const updatedPenalties = patch.penalties?.map((p) => ({
      ...p,
      amount: p.amount != null ? Number(p.amount) : 0,
    }));

    const next: SystemConfigData = {
      tiers: updatedTiers ?? current.tiers,
      penalties: updatedPenalties ?? current.penalties,
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
      penalties?: Array<{
        key: string;
        label: string;
        from: number;
        to: number;
      }>;
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
          if (Object.keys(changes).length > 0)
            tierDiffs.push({ tier: nextTier.tier, changes });
        }
      }
      if (tierDiffs.length > 0) differences.tiers = tierDiffs;
    }

    // 2. Compare Penalties (keyed by `key`, diffing `amount`)
    if (patch.penalties) {
      const penaltyDiffs: Array<{
        key: string;
        label: string;
        from: number;
        to: number;
      }> = [];
      for (const nextPen of next.penalties) {
        const currPen = current.penalties.find((p) => p.key === nextPen.key);
        if (currPen && currPen.amount !== nextPen.amount) {
          penaltyDiffs.push({
            key: nextPen.key,
            label: nextPen.label,
            from: currPen.amount,
            to: nextPen.amount,
          });
        }
      }
      if (penaltyDiffs.length > 0) differences.penalties = penaltyDiffs;
    }

    // 3. Compare Toggles
    if (patch.toggles) {
      const toggleDiffs: Array<{ label: string; from: boolean; to: boolean }> =
        [];
      for (const nextTog of next.toggles) {
        const currTog = current.toggles.find((t) => t.label === nextTog.label);
        if (currTog && currTog.on !== nextTog.on) {
          toggleDiffs.push({
            label: nextTog.label,
            from: currTog.on,
            to: nextTog.on,
          });
        }
      }
      if (toggleDiffs.length > 0) differences.toggles = toggleDiffs;
    }

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

    // Recompute every patron user's tier when tier thresholds changed
    const thresholdChanged = differences.tiers?.some(
      (t) => 'threshold' in t.changes,
    );
    if (thresholdChanged) {
      const allUsers = await this.prisma.user.findMany({
        where: { tier: { not: null } },
        select: { id: true, userPoints: true },
      });
      await Promise.all(
        allUsers.map((u) =>
          this.prisma.user.update({
            where: { id: u.id },
            data: { tier: tierFromPointsWithConfig(u.userPoints, next.tiers) },
          }),
        ),
      );
    }

    return row.data as unknown as SystemConfigData;
  }
}
