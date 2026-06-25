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
    const { page, limit, actorId, action, targetType } = params;
    const where = {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.log.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
