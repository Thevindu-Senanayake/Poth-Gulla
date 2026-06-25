import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RecommendationService } from './recommendation.service.js';

interface AuthUser {
  userId: string;
  role: Role;
}

@ApiTags('Recommendations')
@ApiBearerAuth('JWT')
@Controller('recommendations')
export class RecommendationController {
  constructor(private rec: RecommendationService) {}

  @ApiOperation({
    summary:
      'Get personalised book recommendations based on borrowing history (Lecturer/Student, Redis-cached 5min)',
  })
  @Get('me')
  @Roles(Role.LECTURER, Role.STUDENT)
  getForMe(@CurrentUser() user: AuthUser, @Query('limit') limit = '10') {
    const l = Math.min(50, Math.max(1, parseInt(limit, 10)));
    return this.rec.forUser(user.userId, l);
  }
}
