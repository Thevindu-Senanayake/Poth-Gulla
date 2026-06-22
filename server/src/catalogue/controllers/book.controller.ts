import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import {
    BookListParams,
    BookService,
    CreateBookTitleDto,
    UpdateBookTitleDto,
} from '../services/book.service.js';

@Controller('catalogue')
export class BookController {
    constructor(private readonly books: BookService) {}

    @Get('books')
    findAll(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('search') search?: string,
        @Query('categoryId') categoryId?: string,
    ) {
        return this.books
            .findMany({
                page: parseInt(page, 10),
                limit: Math.min(parseInt(limit, 10), 100),
                search,
                categoryId,
            })
            .then(([data, total]) => ({ data, total, page: parseInt(page, 10) }));
    }

    @Get('books/:id')
    findOne(@Param('id') id: string) {
        return this.books.findById(id);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post('books')
    create(@Body() dto: CreateBookTitleDto) {
        return this.books.create(dto);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Patch('books/:id')
    update(@Param('id') id: string, @Body() dto: UpdateBookTitleDto) {
        return this.books.update(id, dto);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Delete('books/:id')
    remove(@Param('id') id: string) {
        return this.books.remove(id);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Post('books/:id/copies')
    addCopy(@Param('id') bookTitleId: string, @Body() body: { assetTag: string }) {
        return this.books.addCopy(bookTitleId, body.assetTag);
    }

    @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
    @Delete('copies/:id')
    retireCopy(@Param('id') copyId: string) {
        return this.books.retireCopy(copyId);
    }
}
