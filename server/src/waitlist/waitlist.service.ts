import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    Booking,
    BookingStatus,
    ResourceType,
    Role,
    WaitlistEntry,
    WaitlistStatus,
} from '../../generated/prisma/client.js';
import { ROLE_WEIGHT } from '../common/domain.constants.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class WaitlistService {
    constructor(private prisma: PrismaService) {}

    /** priority_score = tier * 0.6 + role_weight * 0.4 */
    score(tier: number, role: Role): number {
        return tier * 0.6 + (ROLE_WEIGHT[role] ?? 0) * 0.4;
    }

    async enqueue(
        booking: Booking,
        user: { tier: number | null; role: Role },
        resourceKey: string,
        hasMessage: boolean,
    ): Promise<WaitlistEntry> {
        const tier = user.tier ?? 3;
        const priorityScore = this.score(tier, user.role);
        return this.prisma.waitlistEntry.create({
            data: {
                bookingId: booking.id,
                resourceType: booking.resourceType,
                resourceKey,
                priorityScore,
                hasMessage,
            },
        });
    }

    /**
     * Ordered queue for a resource.
     * hasMessage=true entries float to top (staff must review);
     * within each group, higher priorityScore wins.
     */
    async queue(resourceType: ResourceType, resourceKey: string): Promise<WaitlistEntry[]> {
        return this.prisma.waitlistEntry.findMany({
            where: { resourceType, resourceKey, status: WaitlistStatus.PENDING },
            orderBy: [{ hasMessage: 'desc' }, { priorityScore: 'desc' }],
        });
    }

    /**
     * Called when an APPROVED booking is freed.
     * Auto-promotes the highest-score message-free entry.
     * Messaged entries require explicit staff promotion.
     */
    async onResourceFreed(resourceType: ResourceType, resourceKey: string): Promise<void> {
        const next = await this.prisma.waitlistEntry.findFirst({
            where: { resourceType, resourceKey, status: WaitlistStatus.PENDING, hasMessage: false },
            orderBy: { priorityScore: 'desc' },
        });
        if (next) await this.promote(next.id);
    }

    async promote(entryId: string, staffNotes?: string): Promise<WaitlistEntry> {
        const entry = await this.prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entryId } });
        if (entry.status !== WaitlistStatus.PENDING) {
            throw new BadRequestException(`Entry is already ${entry.status}`);
        }
        const [updated] = await Promise.all([
            this.prisma.waitlistEntry.update({
                where: { id: entryId },
                data: { status: WaitlistStatus.PROMOTED, staffNotes },
            }),
            this.prisma.booking.update({
                where: { id: entry.bookingId },
                data: { status: BookingStatus.APPROVED, qrToken: randomUUID() },
            }),
        ]);
        return updated;
    }

    async dismiss(entryId: string, staffNotes?: string): Promise<WaitlistEntry> {
        return this.prisma.waitlistEntry.update({
            where: { id: entryId },
            data: { status: WaitlistStatus.DISMISSED, staffNotes },
        });
    }

    async myEntries(userId: string) {
        return this.prisma.waitlistEntry.findMany({
            where: { booking: { userId }, status: WaitlistStatus.PENDING },
            include: { booking: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async positionFor(bookingId: string): Promise<number | null> {
        const entry = await this.prisma.waitlistEntry.findUnique({ where: { bookingId } });
        if (!entry || entry.status !== WaitlistStatus.PENDING) return null;
        const all = await this.queue(entry.resourceType, entry.resourceKey);
        const idx = all.findIndex(e => e.id === entry.id);
        return idx === -1 ? null : idx + 1;
    }
}
