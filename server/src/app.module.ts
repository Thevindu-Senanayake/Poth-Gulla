import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BookingModule } from './booking/booking.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { OverdueModule } from './overdue/overdue.module.js';
import { PointsModule } from './points/points.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RecommendationModule } from './recommendation/recommendation.module.js';
import { RedisModule } from './redis/redis.module.js';
import { ReviewModule } from './review/review.module.js';
import { ScanModule } from './scan/scan.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        RedisModule,
        MetricsModule,
        AuthModule,
        BookingModule,
        WaitlistModule,
        CatalogueModule,
        PointsModule,
        ScanModule,
        OverdueModule,
        ReviewModule,
        RecommendationModule,
        AuditModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
