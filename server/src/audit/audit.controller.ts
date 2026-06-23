import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '../../generated/prisma/client.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuditService } from './audit.service.js';

@Controller('audit')
export class AuditController {
    constructor(private audit: AuditService) {}

    @Get('logs')
    @Roles(Role.ADMIN)
    findMany(
        @Query('page') page = '1',
        @Query('limit') limit = '50',
        @Query('actorId') actorId?: string,
        @Query('action') action?: string,
        @Query('targetType') targetType?: string,
    ) {
        return this.audit.findMany({
            page: Math.max(1, parseInt(page, 10)),
            limit: Math.min(200, Math.max(1, parseInt(limit, 10))),
            actorId,
            action,
            targetType,
        });
    }
}
