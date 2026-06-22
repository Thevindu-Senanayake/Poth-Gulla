import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { BookCopy, BookTitle, ItemStatus } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export class CreateBookTitleDto {
    title!: string;
    author!: string;
    isbn?: string;
    language?: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
}

export class UpdateBookTitleDto {
    title?: string;
    author?: string;
    isbn?: string;
    language?: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
}

export type BookListParams = {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
};

@Injectable()
export class BookService {
    constructor(private prisma: PrismaService) {}

    async findMany(params: BookListParams): Promise<[BookTitle[], number]> {
        const { page, limit, search, categoryId } = params;
        const term = search?.trim().slice(0, 100);
        const where = {
            ...(categoryId ? { categoryId } : {}),
            ...(term
                ? {
                      OR: [
                          { title: { contains: term, mode: 'insensitive' as const } },
                          { author: { contains: term, mode: 'insensitive' as const } },
                          { isbn: { contains: term, mode: 'insensitive' as const } },
                          { tags: { has: term } },
                      ],
                  }
                : {}),
        };
        return Promise.all([
            this.prisma.bookTitle.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { title: 'asc' },
                include: {
                    category: true,
                    _count: { select: { copies: { where: { status: ItemStatus.AVAILABLE } } } },
                },
            }),
            this.prisma.bookTitle.count({ where }),
        ]);
    }

    async findById(id: string) {
        const title = await this.prisma.bookTitle.findUnique({
            where: { id },
            include: {
                category: true,
                copies: { orderBy: { assetTag: 'asc' } },
                _count: { select: { copies: { where: { status: ItemStatus.AVAILABLE } } } },
            },
        });
        if (!title) throw new NotFoundException('Book title not found');
        return title;
    }

    async create(dto: CreateBookTitleDto): Promise<BookTitle> {
        if (dto.isbn) {
            const exists = await this.prisma.bookTitle.findUnique({ where: { isbn: dto.isbn } });
            if (exists) throw new ConflictException(`ISBN ${dto.isbn} already registered`);
        }
        return this.prisma.bookTitle.create({ data: { ...dto, tags: dto.tags ?? [] } });
    }

    async update(id: string, dto: UpdateBookTitleDto): Promise<BookTitle> {
        await this.findOrThrow(id);
        if (dto.isbn) {
            const conflict = await this.prisma.bookTitle.findFirst({
                where: { isbn: dto.isbn, NOT: { id } },
            });
            if (conflict) throw new ConflictException(`ISBN ${dto.isbn} already in use`);
        }
        return this.prisma.bookTitle.update({ where: { id }, data: dto });
    }

    async remove(id: string): Promise<BookTitle> {
        await this.findOrThrow(id);
        return this.prisma.bookTitle.delete({ where: { id } });
    }

    async addCopy(bookTitleId: string, assetTag: string): Promise<BookCopy> {
        await this.findOrThrow(bookTitleId);
        const exists = await this.prisma.bookCopy.findUnique({ where: { assetTag } });
        if (exists) throw new ConflictException(`Asset tag ${assetTag} already registered`);
        return this.prisma.bookCopy.create({
            data: { bookTitleId, assetTag, status: ItemStatus.AVAILABLE },
        });
    }

    async retireCopy(copyId: string): Promise<BookCopy> {
        const copy = await this.prisma.bookCopy.findUnique({ where: { id: copyId } });
        if (!copy) throw new NotFoundException('Book copy not found');
        if (copy.status === ItemStatus.BORROWED) {
            throw new BadRequestException('Cannot retire a copy that is currently borrowed');
        }
        return this.prisma.bookCopy.update({
            where: { id: copyId },
            data: { status: ItemStatus.RETIRED },
        });
    }

    private async findOrThrow(id: string): Promise<BookTitle> {
        const title = await this.prisma.bookTitle.findUnique({ where: { id } });
        if (!title) throw new NotFoundException('Book title not found');
        return title;
    }
}
