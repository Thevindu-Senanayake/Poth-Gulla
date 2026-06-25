import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { PointsService } from './points.service.js';

interface AuthUser {
  userId: string;
  role: string;
}

@ApiTags('Points')
@ApiBearerAuth('JWT')
@Controller('points')
export class PointsController {
  constructor(private readonly points: PointsService) {}

  @ApiOperation({ summary: 'Get own User Point history (paginated)' })
  @Get('me')
  async mine(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const [data, total] = await this.points.history(user.userId, +page, +limit);
    return { data, total, page: +page, limit: +limit };
  }

  @ApiOperation({ summary: "Get any user's point history (Admin/Staff)" })
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
