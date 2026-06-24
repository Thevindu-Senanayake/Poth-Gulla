import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import {
  BookListParams,
  BookService,
  CreateBookTitleDto,
  UpdateBookTitleDto,
} from '../services/book.service.js';
@ApiTags('Catalogue - Books')
@ApiBearerAuth('JWT')
@Controller('catalogue')
export class BookController {
  constructor(private readonly books: BookService) {}
  @ApiOperation({
    summary: 'List book titles (paginated, searchable, Redis-cached 30s)',
  })
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
  @ApiOperation({
    summary: 'Get a book title with all copies (Redis-cached 60s)',
  })
  @Get('books/:id')
  findOne(@Param('id') id: string) {
    return this.books.findById(id);
  }
  @ApiOperation({ summary: 'Create a new book title (Admin/Staff)' })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Post('books')
  create(@Body() dto: CreateBookTitleDto) {
    return this.books.create(dto);
  }
  @ApiOperation({ summary: 'Update a book title (Admin/Staff)' })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Patch('books/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBookTitleDto) {
    return this.books.update(id, dto);
  }
  @ApiOperation({
    summary:
      'Delete a book title - only if no copies, bookings, or reviews (Admin/Staff)',
  })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Delete('books/:id')
  remove(@Param('id') id: string) {
    return this.books.remove(id);
  }
  @ApiOperation({
    summary: 'Add a physical copy to a book title (Admin/Staff)',
  })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Post('books/:id/copies')
  addCopy(
    @Param('id') bookTitleId: string,
    @Body() body: { assetTag: string },
  ) {
    return this.books.addCopy(bookTitleId, body.assetTag);
  }
  @ApiOperation({ summary: 'Retire a physical book copy (Admin/Staff)' })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Delete('copies/:id')
  retireCopy(@Param('id') copyId: string) {
    return this.books.retireCopy(copyId);
  }
  @ApiOperation({
    summary: 'Restore a retired/lost book copy to available (Admin/Staff)',
  })
  @Roles(Role.ADMIN, Role.LIBRARY_STAFF)
  @Patch('copies/:id/restore')
  restoreCopy(@Param('id') copyId: string) {
    return this.books.restoreCopy(copyId);
  }
}
