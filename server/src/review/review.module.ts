import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module.js';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';

@Module({
  imports: [PointsModule],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
