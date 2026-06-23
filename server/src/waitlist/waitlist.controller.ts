import { Body, Controller, Get, Param, ParseEnumPipe, Post } from '@nestjs/common';
import { ResourceType, Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { WaitlistService } from './waitlist.service.js';

interface JwtUser {
    userId: string;
    email: string;
    role: Role;
}

@Controller('waitlist')
export class WaitlistController {
    constructor(private readonly waitlist: WaitlistService) {}

    @Get('me')
    myEntries(@CurrentUser() user: JwtUser) {
        return this.waitlist.myEntries(user.userId);
    }

    @Get('position/:bookingId')
    async position(@Param('bookingId') bookingId: string) {
        const position = await this.waitlist.positionFor(bookingId);
        return { position };
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Get(':resourceType/:resourceKey')
    queue(
        @Param('resourceType', new ParseEnumPipe(ResourceType)) resourceType: ResourceType,
        @Param('resourceKey') resourceKey: string,
    ) {
        return this.waitlist.queue(resourceType, resourceKey);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post(':id/promote')
    promote(@Param('id') id: string, @Body() body: { staffNotes?: string }) {
        return this.waitlist.promote(id, body.staffNotes);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post(':id/dismiss')
    dismiss(@Param('id') id: string, @Body() body: { staffNotes?: string }) {
        return this.waitlist.dismiss(id, body.staffNotes);
    }
}
