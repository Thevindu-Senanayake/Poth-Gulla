import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';
import { MetricsService } from './metrics.service.js';

@Controller()
export class MetricsController {
    constructor(private metrics: MetricsService) {}

    @Public()
    @Get('metrics')
    async metrics(@Res() res: Response) {
        res.set('Content-Type', this.metrics.contentType());
        res.end(await this.metrics.getMetrics());
    }
}
