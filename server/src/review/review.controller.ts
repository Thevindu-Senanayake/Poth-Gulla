import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateReviewDto, ReviewService } from './review.service.js';

interface AuthUser {
  userId: string;
  role: Role;
}

@ApiTags('Reviews')
@ApiBearerAuth('JWT')
@Controller('reviews')
export class ReviewController {
  constructor(private review: ReviewService) {}

  @ApiOperation({ summary: 'List reviews for a book title (paginated)' })
  @Get('book/:bookTitleId')
  async listByBook(
    @Param('bookTitleId') bookTitleId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const [data, total] = await this.review.listByBook(bookTitleId, p, l);
    return {
      data,
      meta: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    };
  }

  @ApiOperation({
    summary:
      'Submit a review for a book (+15 pts, once per book per user, requires completed borrowing)',
  })
  @Post('book/:bookTitleId')
  create(
    @CurrentUser() user: AuthUser,
    @Param('bookTitleId') bookTitleId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.review.create(user.userId, bookTitleId, dto);
  }

  @ApiOperation({ summary: 'Delete a review (own, or Admin/Staff)' })
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') reviewId: string) {
    return this.review.remove(user.userId, user.role, reviewId);
  }
}
