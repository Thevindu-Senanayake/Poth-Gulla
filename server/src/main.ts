import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { EventLoggerInterceptor } from './common/interceptors/event-logger.interceptor.js';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(helmet());
    app.use(express.json({ limit: '5mb' }));
    app.use(express.urlencoded({ limit: '5mb', extended: true }));
    app.setGlobalPrefix('api');
    app.enableCors({ origin: true, credentials: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new EventLoggerInterceptor());
    const server = await app.listen(process.env.PORT ?? 3000);
    server.requestTimeout = 30000;
}
bootstrap();
