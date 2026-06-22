import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CategoryType, Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import {
    CategoryService,
    CreateCategoryDto,
    UpdateCategoryDto,
} from '../services/category.service.js';

@Controller('catalogue/categories')
export class CategoryController {
    constructor(private readonly categories: CategoryService) {}

    @Get()
    findAll(@Query('type') type?: CategoryType) {
        return this.categories.findAll(type);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post()
    create(@Body() dto: CreateCategoryDto) {
        return this.categories.create(dto);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.categories.update(id, dto);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.categories.remove(id);
    }
}
