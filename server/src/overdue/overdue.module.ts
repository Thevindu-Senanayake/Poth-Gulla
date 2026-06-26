import { Module } from '@nestjs/common';
import { SystemConfigModule } from '../config/system-config.module.js';
import { PointsModule } from '../points/points.module.js';
import { OverdueController } from './overdue.controller.js';
import { OverdueService } from './overdue.service.js';

@Module({
  imports: [PointsModule, SystemConfigModule],
  controllers: [OverdueController],
  providers: [OverdueService],
})
export class OverdueModule {}
