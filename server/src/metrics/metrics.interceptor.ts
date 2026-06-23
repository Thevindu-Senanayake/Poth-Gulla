import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service.js';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    constructor(private metrics: MetricsService) {}

    intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = ctx.switchToHttp().getRequest<Request>();
        const res = ctx.switchToHttp().getResponse<Response>();
        const start = Date.now();

        return next.handle().pipe(
            tap({
                next: () => this.record(req, res.statusCode, start),
                error: (err: { status?: number }) =>
                    this.record(req, err?.status ?? 500, start),
            }),
        );
    }

    private record(req: Request, statusCode: number, startMs: number) {
        const route = (req.route?.path as string | undefined) ?? req.path;
        const labels = {
            method: req.method,
            route,
            status_code: String(statusCode),
        };
        const durationSec = (Date.now() - startMs) / 1000;
        this.metrics.httpRequestsTotal.inc(labels);
        this.metrics.httpRequestDurationSeconds.observe(labels, durationSec);
    }
}
