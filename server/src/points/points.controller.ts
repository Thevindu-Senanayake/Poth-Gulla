import { Controller, Get, Param, Query } from '@nestjs/common';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { PointsService } from './points.service.js';

interface AuthUser { userId: string; role: string; }

@Controller('points')
export class PointsController {
    constructor(private readonly points: PointsService) {}

    @Get('me')
    async mine(
        @CurrentUser() user: AuthUser,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        const [data, total] = await this.points.history(user.userId, +page, +limit);
        return { data, total, page: +page, limit: +limit };
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Get(':userId')
    async forUser(
        @Param('userId') userId: string,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        const [data, total] = await this.points.history(userId, +page, +limit);
        return { data, total, page: +page, limit: +limit };
    }
}
