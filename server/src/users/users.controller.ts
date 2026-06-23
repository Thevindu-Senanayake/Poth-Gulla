import { Body, Controller, Get, NotFoundException, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.LIBRARY_STAFF)
@Controller('users')
export class UsersController {
    constructor(private users: UsersService) {}

    @ApiOperation({ summary: 'List users with pagination and filters (Admin/Staff)' })
    @Get()
    async findMany(
        @Query('page') pageStr = '1',
        @Query('limit') limitStr = '20',
        @Query('role') roleStr?: string,
        @Query('tier') tierStr?: string,
        @Query('isActive') isActiveStr?: string,
        @Query('search') searchRaw?: string,
    ) {
        const page = Math.max(1, parseInt(pageStr, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 20));
        const role =
            roleStr && Object.values(Role).includes(roleStr as Role) ? (roleStr as Role) : undefined;
        const tier = tierStr !== undefined ? parseInt(tierStr, 10) : undefined;
        const isActive = isActiveStr !== undefined ? isActiveStr === 'true' : undefined;
        const search = searchRaw?.replace(/[\x00-\x1F\x7F]/g, '').trim() || undefined;

        const [users, total] = await this.users.findMany({ page, limit, role, tier, isActive, search });
        return {
            data: users.map((u) => this.users.sanitize(u)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    @ApiOperation({ summary: 'Get a single user by ID (Admin/Staff)' })
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const user = await this.users.findById(id);
        if (!user) throw new NotFoundException('User not found');
        return this.users.sanitize(user);
    }

    @ApiOperation({ summary: 'Update user fields (Admin only)' })
    @Roles(Role.ADMIN)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        const user = await this.users.findById(id);
        if (!user) throw new NotFoundException('User not found');
        const updated = await this.users.update(id, dto);
        return this.users.sanitize(updated);
    }

    @ApiOperation({ summary: 'Disable a user account (Admin only)' })
    @Roles(Role.ADMIN)
    @Patch(':id/disable')
    async disable(@Param('id') id: string) {
        const user = await this.users.findById(id);
        if (!user) throw new NotFoundException('User not found');
        const updated = await this.users.setActive(id, false);
        return this.users.sanitize(updated);
    }

    @ApiOperation({ summary: 'Enable a user account (Admin only)' })
    @Roles(Role.ADMIN)
    @Patch(':id/enable')
    async enable(@Param('id') id: string) {
        const user = await this.users.findById(id);
        if (!user) throw new NotFoundException('User not found');
        const updated = await this.users.setActive(id, true);
        return this.users.sanitize(updated);
    }
}
