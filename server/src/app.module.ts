import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BookingModule } from './booking/booking.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        BookingModule,
        WaitlistModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
