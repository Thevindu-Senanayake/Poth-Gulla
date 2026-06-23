import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Role } from '../../generated/prisma/client.js';
import { UsersController } from './users.controller.js';

describe('UsersController', () => {
    let controller: UsersController;
    let users: {
        findMany: jest.Mock;
        findById: jest.Mock;
        update: jest.Mock;
        setActive: jest.Mock;
        sanitize: jest.Mock;
    };

    beforeEach(() => {
        users = {
            findMany: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            setActive: jest.fn(),
            sanitize: jest.fn((u) => ({ ...u, passwordHash: undefined })),
        };
        controller = new UsersController(users as any);
    });

    describe('GET /users', () => {
        it('parses paging/filter query params and returns sanitized data with meta', async () => {
            users.findMany.mockResolvedValue([[{ id: 'u1' }, { id: 'u2' }], 2]);
            const res = await controller.findMany('1', '20', Role.STUDENT, '3', 'true', '  bob ');
            expect(users.findMany).toHaveBeenCalledWith({
                page: 1,
                limit: 20,
                role: Role.STUDENT,
                tier: 3,
                isActive: true,
                search: 'bob',
            });
            expect(res.total).toBe(2);
            expect(res.totalPages).toBe(1);
            expect(res.data).toHaveLength(2);
        });

        it('clamps limit to 100 and floors page at 1', async () => {
            users.findMany.mockResolvedValue([[], 0]);
            await controller.findMany('0', '999');
            expect(users.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ page: 1, limit: 100 }),
            );
        });

        it('ignores an invalid role and empty search', async () => {
            users.findMany.mockResolvedValue([[], 0]);
            await controller.findMany('1', '20', 'NOT_A_ROLE', undefined, undefined, '   ');
            expect(users.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ role: undefined, search: undefined }),
            );
        });
    });

    describe('GET /users/:id', () => {
        it('returns the sanitized user', async () => {
            users.findById.mockResolvedValue({ id: 'u1', passwordHash: 'x' });
            const res = await controller.findOne('u1');
            expect(res).not.toHaveProperty('passwordHash', 'x');
        });

        it('throws NotFound when missing', async () => {
            users.findById.mockResolvedValue(null);
            await expect(controller.findOne('nope')).rejects.toThrow(NotFoundException);
        });
    });

    describe('PATCH /users/:id', () => {
        it('updates and sanitizes', async () => {
            users.findById.mockResolvedValue({ id: 'u1' });
            users.update.mockResolvedValue({ id: 'u1', name: 'New' });
            await controller.update('u1', { name: 'New' } as any);
            expect(users.update).toHaveBeenCalledWith('u1', { name: 'New' });
        });

        it('throws NotFound when target missing', async () => {
            users.findById.mockResolvedValue(null);
            await expect(controller.update('x', {} as any)).rejects.toThrow(NotFoundException);
        });
    });

    describe('PATCH /users/:id/disable and /enable', () => {
        it('disables an existing user', async () => {
            users.findById.mockResolvedValue({ id: 'u1' });
            users.setActive.mockResolvedValue({ id: 'u1', isActive: false });
            await controller.disable('u1');
            expect(users.setActive).toHaveBeenCalledWith('u1', false);
        });

        it('enables an existing user', async () => {
            users.findById.mockResolvedValue({ id: 'u1' });
            users.setActive.mockResolvedValue({ id: 'u1', isActive: true });
            await controller.enable('u1');
            expect(users.setActive).toHaveBeenCalledWith('u1', true);
        });

        it('throws NotFound on disable when missing', async () => {
            users.findById.mockResolvedValue(null);
            await expect(controller.disable('x')).rejects.toThrow(NotFoundException);
        });
    });
});
