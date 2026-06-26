import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResourceType, Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { WaitlistService } from './waitlist.service.js';

interface JwtUser {
  userId: string;
  email: string;
  role: Role;
}

@ApiTags('Waitlist')
@ApiBearerAuth('JWT')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @ApiOperation({ summary: 'Get own waitlist entries' })
  @Get('me')
  myEntries(@CurrentUser() user: JwtUser) {
    return this.waitlist.myEntries(user.userId);
  }

  @ApiOperation({ summary: 'Get queue position for a booking' })
  @Get('position/:bookingId')
  async position(@Param('bookingId') bookingId: string) {
    const position = await this.waitlist.positionFor(bookingId);
    return { position };
  }

  @ApiOperation({
    summary: 'View ranked waitlist queue for a resource (Admin/Staff)',
  })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Get(':resourceType/:resourceKey')
  queue(
    @Param('resourceType', new ParseEnumPipe(ResourceType))
    resourceType: ResourceType,
    @Param('resourceKey') resourceKey: string,
  ) {
    return this.waitlist.queue(resourceType, resourceKey);
  }

  @ApiOperation({
    summary: 'Promote a waitlist entry to an active booking (Admin/Staff)',
  })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Post(':id/promote')
  promote(
    @Param('id') id: string,
    @Body() body: { staffNotes?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return user
      ? this.waitlist.promote(id, body.staffNotes, user.userId)
      : this.waitlist.promote(id, body.staffNotes);
  }

  @ApiOperation({
    summary:
      'Decline a justification message — user stays in the auto-queue at their priority position (Admin/Staff)',
  })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Post(':id/decline-message')
  declineMessage(
    @Param('id') id: string,
    @Body() body: { staffNotes?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return user
      ? this.waitlist.declineMessage(id, body.staffNotes, user.userId)
      : this.waitlist.declineMessage(id, body.staffNotes);
  }

  @ApiOperation({ summary: 'Dismiss a waitlist entry entirely (Admin/Staff)' })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Post(':id/dismiss')
  dismiss(
    @Param('id') id: string,
    @Body() body: { staffNotes?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return user
      ? this.waitlist.dismiss(id, body.staffNotes, user.userId)
      : this.waitlist.dismiss(id, body.staffNotes);
  }
}
