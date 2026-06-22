import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ItemStatus, Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import {
    CreateDeviceDto,
    DeviceService,
    UpdateDeviceDto,
} from '../services/device.service.js';

@Controller('catalogue/devices')
export class DeviceController {
    constructor(private readonly devices: DeviceService) {}

    @Get()
    findAll(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('search') search?: string,
        @Query('tier') tier?: string,
        @Query('categoryId') categoryId?: string,
        @Query('status') status?: ItemStatus,
    ) {
        return this.devices
            .findMany({
                page: parseInt(page, 10),
                limit: Math.min(parseInt(limit, 10), 100),
                search,
                tier: tier !== undefined ? parseInt(tier, 10) : undefined,
                categoryId,
                status,
            })
            .then(([data, total]) => ({ data, total, page: parseInt(page, 10) }));
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.devices.findById(id);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post()
    create(@Body() dto: CreateDeviceDto) {
        return this.devices.create(dto);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
        return this.devices.update(id, dto);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.devices.remove(id);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id/maintenance')
    setMaintenance(
        @Param('id') id: string,
        @Body() body: { underMaintenance: boolean },
    ) {
        return this.devices.setMaintenance(id, body.underMaintenance);
    }
}
