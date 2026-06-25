import { Injectable } from '@nestjs/common';
import {
  Prisma,
  AuditAction,
  AuditTargetType,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type AuditListParams = {
  page: number;
  limit: number;
  actorId?: string;
  action?: AuditAction;
  targetType?: AuditTargetType;
  startDate?: string;
  endDate?: string;
  id?: string;
  sortOrder?: 'asc' | 'desc';
};

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(
    actorId: string | null,
    action: AuditAction,
    targetType: AuditTargetType,
    targetId?: string,
    metadata?: Prisma.InputJsonObject,
  ) {
    return this.prisma.log.create({
      data: { actorId, action, targetType, targetId, metadata },
    });
  }

  async findMany(params: AuditListParams) {
    const {
      page,
      limit,
      actorId,
      action,
      targetType,
      startDate,
      endDate,
      id,
      sortOrder = 'desc',
    } = params;

    const where: Prisma.LogWhereInput = {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(id ? { id: { startsWith: id } } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.log.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: { actor: { select: { id: true, name: true, role: true } } },
      }),
      this.prisma.log.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
