import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { BookingStatus, ResourceType, Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { BookingService } from './booking.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

interface JwtUser {
    userId: string;
    email: string;
    role: Role;
}

const STAFF_ROLES: Role[] = [Role.ADMIN, Role.LIBRARY_STAFF];

@Controller('bookings')
export class BookingController {
    constructor(private readonly bookings: BookingService) {}

    @Post()
    create(@CurrentUser() user: JwtUser, @Body() dto: CreateBookingDto) {
        return this.bookings.create(user.userId, dto);
    }

    /** Own bookings — must be declared before /:id to avoid route conflict. */
    @Get('me')
    findMine(
        @CurrentUser() user: JwtUser,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('status') status?: BookingStatus,
        @Query('resourceType') resourceType?: ResourceType,
    ) {
        return this.bookings
            .findMine(user.userId, {
                page: parseInt(page, 10),
                limit: Math.min(parseInt(limit, 10), 100),
                status,
                resourceType,
            })
            .then(([data, total]) => ({ data, total, page: parseInt(page, 10) }));
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Get()
    findAll(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('userId') userId?: string,
        @Query('resourceType') resourceType?: ResourceType,
        @Query('status') status?: BookingStatus,
    ) {
        return this.bookings
            .findMany({
                page: parseInt(page, 10),
                limit: Math.min(parseInt(limit, 10), 100),
                userId,
                resourceType,
                status,
            })
            .then(([data, total]) => ({ data, total, page: parseInt(page, 10) }));
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
        const booking = await this.bookings.findById(id);
        if (!booking) throw new NotFoundException('Booking not found');
        if (!STAFF_ROLES.includes(user.role) && booking.userId !== user.userId) {
            throw new ForbiddenException();
        }
        return booking;
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id/approve')
    approve(@Param('id') id: string) {
        return this.bookings.approve(id);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id/reject')
    reject(@Param('id') id: string) {
        return this.bookings.reject(id);
    }

    @Post(':id/cancel')
    cancel(@Param('id') id: string, @CurrentUser() user: JwtUser) {
        return this.bookings.cancel(user.userId, id, false);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post(':id/cancel-any')
    cancelAny(@Param('id') id: string, @CurrentUser() user: JwtUser) {
        return this.bookings.cancel(user.userId, id, true);
    }
}
