import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MetricsController } from './metrics.controller.js';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metrics: { getMetrics: jest.Mock; contentType: jest.Mock };

  beforeEach(() => {
    metrics = {
      getMetrics: jest.fn(),
      contentType: jest.fn(() => 'text/plain; version=0.0.4'),
    };
    controller = new MetricsController(metrics as any);
  });

  it('GET /metrics sets the content type and writes the metrics payload', async () => {
    metrics.getMetrics.mockResolvedValue('# HELP http_requests_total ...');
    const res = { set: jest.fn(), end: jest.fn() };
    await controller.scrape(res as any);
    expect(res.set).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; version=0.0.4',
    );
    expect(res.end).toHaveBeenCalledWith('# HELP http_requests_total ...');
  });
});
