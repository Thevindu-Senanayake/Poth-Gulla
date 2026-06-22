import { Body, Controller, Post } from '@nestjs/common';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CheckoutDto, ReturnItemDto, RoomCheckinDto, ScanService } from './scan.service.js';

interface AuthUser { userId: string; role: Role; }

@Controller('scan')
export class ScanController {
    constructor(private scan: ScanService) {}

    @Post('checkout')
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    checkout(@Body() dto: CheckoutDto) {
        return this.scan.checkout(dto);
    }

    @Post('room-checkin')
    roomCheckin(@CurrentUser() user: AuthUser, @Body() dto: RoomCheckinDto) {
        return this.scan.roomCheckin(user.userId, dto);
    }

    @Post('return')
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    returnItem(@Body() dto: ReturnItemDto) {
        return this.scan.returnItem(dto);
    }
}
