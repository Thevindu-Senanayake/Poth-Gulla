import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
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
    return this.notif.findForUser(req.user.userId, {
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.min(50, Math.max(1, parseInt(limit, 10))),
    });
  }

  @ApiOperation({ summary: 'Get unread notification count' })
  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const count = await this.notif.unreadCount(req.user.userId);
    return { count };
  }

  @ApiOperation({
    summary:
      'SSE stream - emits a "notification" event on each new notification',
  })
  @Sse('stream')
  stream(@Request() req: any): Observable<MessageEvent> {
    // Token is extracted from Authorization header or ?token= query param by JwtAuthGuard
    return this.notif.getStream(req.user.userId);
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: any) {
    return this.notif.markRead(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Post('read-all')
  markAllRead(@Request() req: any) {
    return this.notif.markAllRead(req.user.userId);
  }
}
