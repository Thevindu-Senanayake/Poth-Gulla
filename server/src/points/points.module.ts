import { Module } from '@nestjs/common';
import { SystemConfigModule } from '../config/system-config.module.js';
import { PointsController } from './points.controller.js';
import { PointsService } from './points.service.js';

@Module({
  imports: [SystemConfigModule],
  providers: [PointsService],
  controllers: [PointsController],
  exports: [PointsService],
})
export class PointsModule {}
