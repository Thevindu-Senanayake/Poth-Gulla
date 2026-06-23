import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryType, Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import {
    CategoryService,
    CreateCategoryDto,
    UpdateCategoryDto,
} from '../services/category.service.js';

@ApiTags('Catalogue — Categories')
@ApiBearerAuth('JWT')
@Controller('catalogue/categories')
export class CategoryController {
    constructor(private readonly categories: CategoryService) {}

    @ApiOperation({ summary: 'List all categories; filter by type (BOOK | DEVICE)' })
    @Get()
    findAll(@Query('type') type?: CategoryType) {
        return this.categories.findAll(type);
    }

    @ApiOperation({ summary: 'Create a category (Admin/Staff)' })
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post()
    create(@Body() dto: CreateCategoryDto) {
        return this.categories.create(dto);
    }

    @ApiOperation({ summary: 'Update a category (Admin/Staff)' })
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.categories.update(id, dto);
    }

    @ApiOperation({ summary: 'Delete a category (Admin/Staff)' })
    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.categories.remove(id);
    }
}
