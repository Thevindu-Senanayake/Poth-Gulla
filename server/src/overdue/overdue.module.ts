import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module.js';
import { OverdueController } from './overdue.controller.js';
import { OverdueService } from './overdue.service.js';

@Module({
    imports: [PointsModule],
    controllers: [OverdueController],
    providers: [OverdueService],
})
export class OverdueModule {}
