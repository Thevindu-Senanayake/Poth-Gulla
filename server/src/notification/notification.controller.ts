import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service.js';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notif: NotificationService) {}

  @ApiOperation({ summary: 'Get my notifications (paginated)' })
  @Get('me')
  findMine(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.notif.findForUser(req.user.sub, {
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.min(50, Math.max(1, parseInt(limit, 10))),
    });
  }

  @ApiOperation({ summary: 'Get unread notification count' })
  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const count = await this.notif.unreadCount(req.user.sub);
    return { count };
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: any) {
    return this.notif.markRead(id, req.user.sub);
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Post('read-all')
  markAllRead(@Request() req: any) {
    return this.notif.markAllRead(req.user.sub);
  }
}
