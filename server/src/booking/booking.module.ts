import { Module } from '@nestjs/common';
import { WaitlistModule } from '../waitlist/waitlist.module.js';
import { BookingController } from './booking.controller.js';
import { BookingService } from './booking.service.js';

@Module({
    imports: [WaitlistModule],
    controllers: [BookingController],
    providers: [BookingService],
    exports: [BookingService],
})
export class BookingModule {}
