import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Role,
  AuditAction,
  AuditTargetType,
} from '../../generated/prisma/client.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuditService } from './audit.service.js';

@ApiTags('Audit Log')
@ApiBearerAuth('JWT')
@Controller('audit')
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private audit: AuditService) {}

  @ApiOperation({ summary: 'Query the system-wide audit log (Admin only)' })
  @Get('logs')
  findMany(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('actorId') actorId?: string,
    @Query('action') action?: AuditAction,
    @Query('targetType') targetType?: AuditTargetType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('id') id?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.audit.findMany({
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.min(200, Math.max(1, parseInt(limit, 10))),
      actorId,
      action,
      targetType,
      startDate,
      endDate,
      id: id?.trim() || undefined,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });
  }
}
