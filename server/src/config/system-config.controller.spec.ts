import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SystemConfigController } from './system-config.controller.js';

describe('SystemConfigController', () => {
    let controller: SystemConfigController;
    let config: { get: jest.Mock; update: jest.Mock };

    beforeEach(() => {
        config = { get: jest.fn(), update: jest.fn() };
        controller = new SystemConfigController(config as any);
    });

    it('GET /config delegates to the service', () => {
        controller.get();
        expect(config.get).toHaveBeenCalled();
    });

    it('PUT /config forwards the patch with actorId', () => {
        const dto = { tiers: [{ tier: 'Tier 2', threshold: 250 }] } as any;
        const user = { id: 'admin-user-123' };
        controller.update(dto, user);
        expect(config.update).toHaveBeenCalledWith(dto, 'admin-user-123');
    });
});
