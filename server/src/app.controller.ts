import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { CurrentUser } from './auth/decorators/current-user.decorator.js';
import { Public } from './auth/decorators/public.decorator.js';

interface AuthUser {
    userId: string;
    email: string;
    role: string;
}

@Controller()
export class AppController {
    constructor(private prisma: PrismaService) {}

    @Public()
    @Get()
    async health(@CurrentUser() user?: AuthUser): Promise<Record<string, unknown>> {
        const base: Record<string, unknown> = {
            status: 'ok',
            name: 'Poth Gulla API',
            version: '1.0.0',
            environment: process.env.NODE_ENV ?? 'development',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
        };

        // Check database connectivity
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            base.database = 'connected';
        } catch {
            base.database = 'disconnected';
            base.status = 'degraded';
        }

        if (user) {
            base.auth = { userId: user.userId, role: user.role };
        }

        if (user?.role === 'ADMIN') {
            const mem = process.memoryUsage();
            base.system = {
                pid: process.pid,
                nodeVersion: process.version,
                memory: {
                    rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
                    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
                    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
                },
            };
        }

        return base;
    }
}
