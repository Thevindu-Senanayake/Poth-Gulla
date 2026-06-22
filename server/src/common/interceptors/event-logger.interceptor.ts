import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { appendFile, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

const REDACT = new Set(['password', 'token', 'secret', 'authorization', 'accesstoken', 'refreshtoken']);

function sanitize(value: unknown, depth = 0): unknown {
    if (depth > 4 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(v => sanitize(v, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = REDACT.has(k.toLowerCase()) ? '[REDACTED]' : sanitize(v, depth + 1);
    }
    return out;
}

const LOG_DIR = join(process.cwd(), 'logs');
const LOG_FILE = join(LOG_DIR, 'events.jsonl');
mkdirSync(LOG_DIR, { recursive: true });

type EventEntry = {
    timestamp: string;
    requestId: string;
    method: string;
    path: string;
    userId?: string;
    role?: string;
    statusCode: number;
    durationMs: number;
    query?: unknown;
    body?: unknown;
    error?: string;
};

@Injectable()
export class EventLoggerInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const req = http.getRequest<Request & { user?: { userId: string; role: string }; requestId?: string }>();
        const res = http.getResponse<Response>();

        const requestId = randomUUID();
        req.requestId = requestId;
        res.setHeader('X-Request-ID', requestId);
        const startMs = Date.now();

        const query = req.query && Object.keys(req.query).length ? req.query : undefined;
        const body =
            req.body && typeof req.body === 'object' && Object.keys(req.body).length
                ? sanitize(req.body)
                : undefined;

        return next.handle().pipe(
            tap({
                next: () => {
                    this.write({
                        timestamp: new Date().toISOString(),
                        requestId,
                        method: req.method,
                        path: req.url,
                        userId: req.user?.userId,
                        role: req.user?.role,
                        statusCode: res.statusCode,
                        durationMs: Date.now() - startMs,
                        query,
                        body,
                    });
                },
                error: (err: Error & { status?: number; statusCode?: number }) => {
                    this.write({
                        timestamp: new Date().toISOString(),
                        requestId,
                        method: req.method,
                        path: req.url,
                        userId: req.user?.userId,
                        role: req.user?.role,
                        statusCode: err.status ?? err.statusCode ?? 500,
                        durationMs: Date.now() - startMs,
                        query,
                        body,
                        error: err.message,
                    });
                },
            }),
        );
    }

    private write(entry: EventEntry): void {
        if (process.env.NODE_ENV !== 'production') {
            const tag = entry.error ? '\x1b[31mERR\x1b[0m' : '\x1b[32mOK \x1b[0m';
            console.log(
                `[${tag}] ${entry.method.padEnd(6)} ${entry.path.padEnd(40)} ${entry.statusCode}  ${entry.durationMs}ms  rid=${entry.requestId}`,
            );
        }
        appendFile(LOG_FILE, JSON.stringify(entry) + '\n', err => {
            if (err) console.error('[EventLogger] write error:', err);
        });
    }
}
