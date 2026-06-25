import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  CheckoutDto,
  ReturnItemDto,
  RoomCheckinDto,
  ScanService,
} from './scan.service.js';

interface AuthUser {
  userId: string;
  role: Role;
}

@ApiTags('Scan (QR Workflow)')
@ApiBearerAuth('JWT')
@Controller('scan')
export class ScanController {
  constructor(private scan: ScanService) {}

  @ApiOperation({
    summary: 'Staff scan booking QR + asset QR to check out a book or device',
  })
  @Post('checkout')
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  checkout(@Body() dto: CheckoutDto, @CurrentUser() user?: AuthUser) {
    return user
      ? this.scan.checkout(dto, user.userId)
      : this.scan.checkout(dto);
  }

  @ApiOperation({
    summary: 'User scans room door QR to confirm attendance (+20 pts)',
  })
  @Post('room-checkin')
  roomCheckin(@CurrentUser() user: AuthUser, @Body() dto: RoomCheckinDto) {
    return this.scan.roomCheckin(user.userId, dto);
  }

  @ApiOperation({
    summary:
      'Staff scan asset QR to return a book or device; applies point scoring',
  })
  @Post('return')
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  returnItem(@Body() dto: ReturnItemDto, @CurrentUser() user?: AuthUser) {
    return user
      ? this.scan.returnItem(dto, user.userId)
      : this.scan.returnItem(dto);
  }
}
