import { Injectable } from '@nestjs/common';
import { Prisma, PointEvent, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { tierFromPoints } from '../users/tier.utils.js';
import { POINT_DELTA, PointAction } from './point-events.js';

@Injectable()
export class PointsService {
    constructor(private prisma: PrismaService) {}

    /**
     * Apply an arbitrary delta to a user's balance.
     * Floor is 0. Tier is recomputed (patron roles only). A PointEvent is persisted.
     */
    async apply(
        userId: string,
        action: PointAction,
        delta: number,
        metadata?: Prisma.InputJsonObject,
    ): Promise<User> {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const newPoints = Math.max(0, user.userPoints + delta);
        const newTier = user.tier != null ? tierFromPoints(newPoints) : null;

        const [updated] = await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: { userPoints: newPoints, tier: newTier },
            }),
            this.prisma.pointEvent.create({
                data: { userId, action, delta, balanceAfter: newPoints, metadata },
            }),
        ]);

        return updated;
    }

    /** Convenience wrapper: looks up the fixed delta from POINT_DELTA. */
    applyFixed(
        userId: string,
        action: Exclude<PointAction, 'BOOK_LATE_2_7D'>,
        metadata?: Prisma.InputJsonObject,
    ): Promise<User> {
        return this.apply(userId, action, POINT_DELTA[action], metadata);
    }

    async history(userId: string, page: number, limit: number): Promise<[PointEvent[], number]> {
        const where = { userId };
        return Promise.all([
            this.prisma.pointEvent.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.pointEvent.count({ where }),
        ]);
    }
}
