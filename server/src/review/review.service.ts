import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { BookingStatus, ResourceType, Review, Role } from '../../generated/prisma/client.js';
import { PointsService } from '../points/points.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export class CreateReviewDto {
    @IsString() @IsNotEmpty() text!: string;
    @IsInt() @Min(1) @Max(5) @IsOptional() rating?: number;
}

@Injectable()
export class ReviewService {
    constructor(
        private prisma: PrismaService,
        private points: PointsService,
    ) {}

    async create(userId: string, bookTitleId: string, dto: CreateReviewDto): Promise<Review> {
        // Must have at least one completed borrowing for this book
        const completed = await this.prisma.booking.findFirst({
            where: {
                userId,
                bookTitleId,
                resourceType: ResourceType.BOOK,
                status: BookingStatus.COMPLETED,
            },
        });
        if (!completed) {
            throw new BadRequestException('You can only review books you have borrowed and returned');
        }

        const existing = await this.prisma.review.findUnique({
            where: { userId_bookTitleId: { userId, bookTitleId } },
        });
        if (existing) {
            throw new ConflictException('You have already reviewed this book');
        }

        const review = await this.prisma.review.create({
            data: { userId, bookTitleId, text: dto.text, rating: dto.rating ?? null },
        });

        await this.points.applyFixed(userId, 'BOOK_REVIEW', { reviewId: review.id });

        return review;
    }

    listByBook(bookTitleId: string, page: number, limit: number): Promise<[Review[], number]> {
        const where = { bookTitleId };
        return Promise.all([
            this.prisma.review.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, name: true } } },
            }),
            this.prisma.review.count({ where }),
        ]);
    }

    async remove(actorId: string, actorRole: Role, reviewId: string): Promise<Review> {
        const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) throw new NotFoundException('Review not found');

        const isStaff = actorRole === Role.ADMIN || actorRole === Role.LIBRARY_STAFF;
        if (review.userId !== actorId && !isStaff) {
            throw new ForbiddenException('Cannot delete another user\'s review');
        }

        return this.prisma.review.delete({ where: { id: reviewId } });
    }
}
