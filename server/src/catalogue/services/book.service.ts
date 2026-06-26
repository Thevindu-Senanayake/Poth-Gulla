import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  BookCopy,
  BookTitle,
  ItemStatus,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
export class CreateBookTitleDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
  @IsString()
  @IsNotEmpty()
  author!: string;
  @IsString()
  @IsOptional()
  isbn?: string;
  @IsString()
  @IsOptional()
  language?: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
export class UpdateBookTitleDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  author?: string;
  @IsString()
  @IsOptional()
  isbn?: string;
  @IsString()
  @IsOptional()
  language?: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
export type BookListParams = {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  /** Admin/Staff: show archived titles and titles with all copies retired. */
  showHidden?: boolean;
};
const TTL_LIST = 30;
const TTL_DETAIL = 60;
@Injectable()
export class BookService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}
  async findMany(params: BookListParams): Promise<[BookTitle[], number]> {
    const { page, limit, search, categoryId, showHidden = false } = params;
    const cacheKey = `catalogue:books:p${page}:l${limit}:s${search ?? ''}:c${categoryId ?? ''}:h${showHidden ? '1' : '0'}`;
    const cached = await this.redis.get<[BookTitle[], number]>(cacheKey);
    if (cached) return cached;
    const term = search?.trim().slice(0, 100);
    const where = {
      // Students see only non-archived, non-all-retired titles.
      // Admin/Staff see everything so they can manage inventory and audit history.
      ...(showHidden
        ? {}
        : {
            archivedAt: null,
            copies: { some: { status: { not: ItemStatus.RETIRED } } },
          }),
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
    const result = await Promise.all([
      this.prisma.bookTitle.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { title: 'asc' },
        include: {
          category: true,
          copies: {
            select: { status: true },
            where: { status: { not: ItemStatus.RETIRED } },
          },
          _count: {
            select: { copies: { where: { status: ItemStatus.AVAILABLE } } },
          },
        },
      }),
      this.prisma.bookTitle.count({ where }),
    ]);
    await this.redis.set(cacheKey, result, TTL_LIST);
    return result;
  }
  async findById(id: string) {
    const cacheKey = `catalogue:books:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;
    const title = await this.prisma.bookTitle.findUnique({
      where: { id },
      include: {
        category: true,
        copies: { orderBy: { assetTag: 'asc' } },
        _count: {
          select: { copies: { where: { status: ItemStatus.AVAILABLE } } },
        },
      },
    });
    if (!title) throw new NotFoundException('Book title not found');
    await this.redis.set(cacheKey, title, TTL_DETAIL);
    return title;
  }
  async create(dto: CreateBookTitleDto): Promise<BookTitle> {
    if (dto.isbn) {
      const exists = await this.prisma.bookTitle.findUnique({
        where: { isbn: dto.isbn },
      });
      if (exists)
        throw new ConflictException(`ISBN ${dto.isbn} already registered`);
    }
    const result = await this.prisma.bookTitle.create({
      data: { ...dto, tags: dto.tags ?? [] },
    });
    await this.redis.delByPattern('catalogue:books:*');
    return result;
  }
  async update(id: string, dto: UpdateBookTitleDto): Promise<BookTitle> {
    await this.findOrThrow(id);
    if (dto.isbn) {
      const conflict = await this.prisma.bookTitle.findFirst({
        where: { isbn: dto.isbn, NOT: { id } },
      });
      if (conflict)
        throw new ConflictException(`ISBN ${dto.isbn} already in use`);
    }
    const result = await this.prisma.bookTitle.update({
      where: { id },
      data: dto,
    });
    await this.redis.delByPattern('catalogue:books:*');
    return result;
  }
  async remove(id: string): Promise<BookTitle> {
    await this.findOrThrow(id);
    const [copies, bookings, reviews] = await Promise.all([
      this.prisma.bookCopy.count({ where: { bookTitleId: id } }),
      this.prisma.booking.count({ where: { bookTitleId: id } }),
      this.prisma.review.count({ where: { bookTitleId: id } }),
    ]);
    if (copies > 0)
      throw new BadRequestException(
        `Retire all ${copies} cop${copies === 1 ? 'y' : 'ies'} before deleting the title`,
      );
    if (bookings > 0)
      throw new BadRequestException(
        `Cannot delete a title with ${bookings} booking record${bookings === 1 ? '' : 's'}`,
      );
    if (reviews > 0)
      throw new BadRequestException(
        `Cannot delete a title with ${reviews} review${reviews === 1 ? '' : 's'}`,
      );
    const result = await this.prisma.bookTitle.delete({ where: { id } });
    await this.redis.delByPattern('catalogue:books:*');
    return result;
  }
  async addCopy(bookTitleId: string, assetTag: string): Promise<BookCopy> {
    await this.findOrThrow(bookTitleId);
    const exists = await this.prisma.bookCopy.findUnique({
      where: { assetTag },
    });
    if (exists)
      throw new ConflictException(`Asset tag ${assetTag} already registered`);
    const result = await this.prisma.bookCopy.create({
      data: { bookTitleId, assetTag, status: ItemStatus.AVAILABLE },
    });
    await this.redis.delByPattern('catalogue:books:*');
    return result;
  }
  async retireCopy(copyId: string): Promise<BookCopy> {
    const copy = await this.prisma.bookCopy.findUnique({
      where: { id: copyId },
    });
    if (!copy) throw new NotFoundException('Book copy not found');
    if (
      copy.status === ItemStatus.BORROWED ||
      copy.status === ItemStatus.RESERVED
    ) {
      throw new BadRequestException(
        `Cannot retire a copy that is ${copy.status.toLowerCase()} — return or cancel the booking first`,
      );
    }
    const result = await this.prisma.bookCopy.update({
      where: { id: copyId },
      data: { status: ItemStatus.RETIRED },
    });
    await this.redis.delByPattern('catalogue:books:*');
    return result;
  }
  async restoreCopy(copyId: string): Promise<BookCopy> {
    const copy = await this.prisma.bookCopy.findUnique({
      where: { id: copyId },
    });
    if (!copy) throw new NotFoundException('Book copy not found');
    if (copy.status !== ItemStatus.RETIRED) {
      throw new BadRequestException('Only retired/lost copies can be restored');
    }
    const result = await this.prisma.bookCopy.update({
      where: { id: copyId },
      data: { status: ItemStatus.AVAILABLE },
    });
    await this.redis.delByPattern('catalogue:books:*');
    return result;
  }
  async archive(id: string): Promise<BookTitle> {
    await this.findOrThrow(id);
    const result = await this.prisma.bookTitle.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await this.redis.delByPattern('catalogue:books:*');
    return result;
  }

  async unarchive(id: string): Promise<BookTitle> {
    await this.findOrThrow(id);
    const result = await this.prisma.bookTitle.update({
      where: { id },
      data: { archivedAt: null },
    });
    await this.redis.delByPattern('catalogue:books:*');
    return result;
  }

  private async findOrThrow(id: string): Promise<BookTitle> {
    const title = await this.prisma.bookTitle.findUnique({ where: { id } });
    if (!title) throw new NotFoundException('Book title not found');
    return title;
  }
}
