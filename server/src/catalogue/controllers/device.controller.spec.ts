import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DeviceController } from './device.controller.js';

describe('DeviceController', () => {
    let controller: DeviceController;
    let devices: {
        findMany: jest.Mock;
        findById: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        remove: jest.Mock;
        setMaintenance: jest.Mock;
    };

    beforeEach(() => {
        devices = {
            findMany: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            setMaintenance: jest.fn(),
        };
        controller = new DeviceController(devices as any);
    });

    describe('GET /catalogue/devices', () => {
        it('parses tier and status filters', async () => {
            devices.findMany.mockResolvedValue([[{ id: 'd1' }], 1]);
            const res = await controller.findAll('1', '20', 'lap', '4', 'cat', 'AVAILABLE' as any);
            expect(devices.findMany).toHaveBeenCalledWith({
                page: 1,
                limit: 20,
                search: 'lap',
                tier: 4,
                categoryId: 'cat',
                status: 'AVAILABLE',
            });
            expect(res).toEqual({ data: [{ id: 'd1' }], total: 1, page: 1 });
        });

        it('leaves tier undefined when not supplied', async () => {
            devices.findMany.mockResolvedValue([[], 0]);
            await controller.findAll('1', '20');
            expect(devices.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ tier: undefined }),
            );
        });
    });

    it('GET /:id delegates to findById', () => {
        controller.findOne('d1');
        expect(devices.findById).toHaveBeenCalledWith('d1');
    });

    it('POST creates a device', () => {
        const dto = { name: 'iPad', assetTag: 'D-1', deviceTier: 3 } as any;
        controller.create(dto);
        expect(devices.create).toHaveBeenCalledWith(dto);
    });

    it('PATCH updates a device', () => {
        controller.update('d1', { name: 'New' } as any);
        expect(devices.update).toHaveBeenCalledWith('d1', { name: 'New' });
    });

    it('DELETE removes a device', () => {
        controller.remove('d1');
        expect(devices.remove).toHaveBeenCalledWith('d1');
    });

    it('PATCH :id/maintenance toggles maintenance', () => {
        controller.setMaintenance('d1', { underMaintenance: true });
        expect(devices.setMaintenance).toHaveBeenCalledWith('d1', true);
    });
});
