import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CreateRoomDto, RoomService, UpdateRoomDto } from '../services/room.service.js';

@ApiTags('Catalogue — Rooms')
@ApiBearerAuth('JWT')
@Controller('catalogue/rooms')
export class RoomController {
    constructor(private readonly rooms: RoomService) {}

    @ApiOperation({
        summary: 'List study rooms; pass startAt+endAt to get availability flags (Redis-cached 20s if no slot filter)',
    })
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

    @ApiOperation({ summary: 'Get a study room by ID (Redis-cached 60s)' })
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.rooms.findById(id);
    }

    @ApiOperation({ summary: 'Create a study room (Admin/Staff)' })
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post()
    create(@Body() dto: CreateRoomDto) {
        return this.rooms.create(dto);
    }

    @ApiOperation({ summary: 'Update a study room (Admin/Staff)' })
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
        return this.rooms.update(id, dto);
    }

    @ApiOperation({ summary: 'Delete a study room (Admin/Staff)' })
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.rooms.remove(id);
    }

    @ApiOperation({ summary: 'Toggle maintenance status on a room (Admin/Staff)' })
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id/maintenance')
    setMaintenance(
        @Param('id') id: string,
        @Body() body: { underMaintenance: boolean },
    ) {
        return this.rooms.setMaintenance(id, body.underMaintenance);
    }
}
