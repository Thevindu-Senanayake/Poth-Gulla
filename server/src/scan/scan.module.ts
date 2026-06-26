import { Module } from '@nestjs/common';
import { SystemConfigModule } from '../config/system-config.module.js';
import { PointsModule } from '../points/points.module.js';
import { WaitlistModule } from '../waitlist/waitlist.module.js';
import { ScanController } from './scan.controller.js';
import { ScanService } from './scan.service.js';

@Module({
  imports: [PointsModule, WaitlistModule, SystemConfigModule],
  controllers: [ScanController],
  providers: [ScanService],
})
export class ScanModule {}
