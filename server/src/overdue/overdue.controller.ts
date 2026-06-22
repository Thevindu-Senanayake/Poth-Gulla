import { Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OverdueService } from './overdue.service.js';

interface AuthUser { userId: string; role: Role; }

@Controller()
export class OverdueController {
    constructor(
        private overdue: OverdueService,
        private prisma: PrismaService,
    ) {}

    @Post('overdue/run')
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    runSweep() {
        return this.overdue.runSweep();
    }

    @Get('notifications/me')
    async myNotifications(
        @CurrentUser() user: AuthUser,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('unreadOnly') unreadOnly = 'false',
    ) {
        const p = Math.max(1, parseInt(page, 10));
        const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const where = {
            userId: user.userId,
            ...(unreadOnly === 'true' ? { read: false } : {}),
        };
        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                skip: (p - 1) * l,
                take: l,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.notification.count({ where }),
        ]);
        return { data: items, meta: { page: p, limit: l, total, pages: Math.ceil(total / l) } };
    }

    @Post('notifications/read-all')
    markAllRead(@CurrentUser() user: AuthUser) {
        return this.prisma.notification.updateMany({
            where: { userId: user.userId, read: false },
            data: { read: true },
        });
    }
}
