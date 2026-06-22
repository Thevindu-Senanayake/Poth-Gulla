import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CreateRoomDto, RoomService, UpdateRoomDto } from '../services/room.service.js';

@Controller('catalogue/rooms')
export class RoomController {
    constructor(private readonly rooms: RoomService) {}

    @Get()
    findAll(
        @Query('startAt') startAt?: string,
        @Query('endAt') endAt?: string,
    ) {
        return this.rooms.findMany(
            startAt ? new Date(startAt) : undefined,
            endAt ? new Date(endAt) : undefined,
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.rooms.findById(id);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post()
    create(@Body() dto: CreateRoomDto) {
        return this.rooms.create(dto);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
        return this.rooms.update(id, dto);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.rooms.remove(id);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id/maintenance')
    setMaintenance(
        @Param('id') id: string,
        @Body() body: { underMaintenance: boolean },
    ) {
        return this.rooms.setMaintenance(id, body.underMaintenance);
    }
}
