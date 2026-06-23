import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RecommendationService } from './recommendation.service.js';

interface AuthUser { userId: string; role: Role; }

@Controller('recommendations')
export class RecommendationController {
    constructor(private rec: RecommendationService) {}

    @Get('me')
    @Roles(Role.LECTURER, Role.STUDENT)
    getForMe(
        @CurrentUser() user: AuthUser,
        @Query('limit') limit = '10',
    ) {
        const l = Math.min(50, Math.max(1, parseInt(limit, 10)));
        return this.rec.forUser(user.userId, l);
    }
}
