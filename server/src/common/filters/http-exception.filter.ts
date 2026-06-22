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
        const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const raw = isHttp ? exception.getResponse() : null;
        let message: unknown = 'Internal server error';
        let error: unknown;

        if (raw !== null && typeof raw === 'object') {
            const r = raw as Record<string, unknown>;
            message = r.message ?? message;
            error = r.error;
        } else if (typeof raw === 'string') {
            message = raw;
        }

        const body: Record<string, unknown> = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: req.url,
            message,
            ...(error !== undefined ? { error } : {}),
        };

        if (process.env.NODE_ENV !== 'production' && exception instanceof Error && exception.stack) {
            body.stack = exception.stack;
        }

        res.status(status).json(body);
    }
}
