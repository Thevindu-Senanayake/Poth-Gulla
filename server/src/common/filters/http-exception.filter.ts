import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = isHttp ? exception.getResponse() : null;
    let message: unknown = 'Internal server error';
    let error: unknown;
    let validationErrors: Record<string, string[]> | undefined;

    if (raw !== null && typeof raw === 'object') {
      const r = raw as Record<string, unknown>;
      message = r.message ?? message;
      error = r.error;

      // Transform validation errors if message is an array
      if (Array.isArray(message)) {
        validationErrors = {};
        const msgs = message as string[];
        for (const msg of msgs) {
          // Parse "field should be X" format
          const match = msg.match(/^(\w+)/);
          const field = match ? match[1] : 'unknown';
          if (!validationErrors[field]) {
            validationErrors[field] = [];
          }
          validationErrors[field].push(msg);
        }
        message = 'Validation failed';
      }
    } else if (typeof raw === 'string') {
      message = raw;
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
      ...(error !== undefined ? { error } : {}),
      ...(validationErrors ? { errors: validationErrors } : {}),
    };

    if (
      process.env.NODE_ENV !== 'production' &&
      exception instanceof Error &&
      exception.stack
    ) {
      body.stack = exception.stack;
    }

    res.status(status).json(body);
  }
}
