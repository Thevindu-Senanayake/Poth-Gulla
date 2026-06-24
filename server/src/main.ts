import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { EventLoggerInterceptor } from './common/interceptors/event-logger.interceptor.js';
import { MetricsInterceptor } from './metrics/metrics.interceptor.js';
import { MetricsService } from './metrics/metrics.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(helmet({ contentSecurityPolicy: false })); // CSP off so Swagger UI loads
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new EventLoggerInterceptor());

  // Prometheus HTTP metrics - registered after other interceptors so it wraps everything
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  // Swagger - only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Poth Gulla API')
      .setDescription(
        'Smart Library Resource Management System - CIPHER 2.0 Hackathon (Team SegFault)',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    // Mount at /api/docs (the global prefix is NOT applied to Swagger's path,
    // so it must be included explicitly). UI: /api/docs · JSON: /api/docs-json.
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const server = await app.listen(process.env.PORT ?? 3000);
  server.requestTimeout = 30000;
}
bootstrap();
