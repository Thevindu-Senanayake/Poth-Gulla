import { Module } from '@nestjs/common';
import { SystemConfigModule } from '../config/system-config.module.js';
import { PointsModule } from '../points/points.module.js';
import { WaitlistModule } from '../waitlist/waitlist.module.js';
import { BookingController } from './booking.controller.js';
import { BookingService } from './booking.service.js';

@Module({
  imports: [WaitlistModule, PointsModule, SystemConfigModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
