import { Module } from '@nestjs/common';
import { PointsController } from './points.controller.js';
import { PointsService } from './points.service.js';

@Module({
    providers: [PointsService],
    controllers: [PointsController],
    exports: [PointsService],
})
export class PointsModule {}
