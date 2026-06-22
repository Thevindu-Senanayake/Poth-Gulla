import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Category, CategoryType } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsEnum(CategoryType)
    type!: CategoryType;
}

export class UpdateCategoryDto {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    name?: string;
}

@Injectable()
export class CategoryService {
    constructor(private prisma: PrismaService) {}

    findAll(type?: CategoryType): Promise<Category[]> {
        return this.prisma.category.findMany({
            where: type ? { type } : undefined,
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });
    }

    async create(dto: CreateCategoryDto): Promise<Category> {
        const exists = await this.prisma.category.findUnique({
            where: { name_type: { name: dto.name, type: dto.type } },
        });
        if (exists) throw new ConflictException(`Category "${dto.name}" already exists for ${dto.type}`);
        return this.prisma.category.create({ data: dto });
    }

    async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
        await this.findOrThrow(id);
        return this.prisma.category.update({ where: { id }, data: dto });
    }

    async remove(id: string): Promise<Category> {
        await this.findOrThrow(id);
        return this.prisma.category.delete({ where: { id } });
    }

    private async findOrThrow(id: string): Promise<Category> {
        const cat = await this.prisma.category.findUnique({ where: { id } });
        if (!cat) throw new NotFoundException('Category not found');
        return cat;
    }
}
