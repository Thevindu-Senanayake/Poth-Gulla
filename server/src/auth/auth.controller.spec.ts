import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
    let controller: AuthController;
    let auth: {
        register: jest.Mock;
        login: jest.Mock;
        assertNotAuthenticated: jest.Mock;
        sanitize: jest.Mock;
    };
    let users: { findById: jest.Mock };

    beforeEach(() => {
        auth = {
            register: jest.fn(),
            login: jest.fn(),
            assertNotAuthenticated: jest.fn(),
            sanitize: jest.fn((u) => ({ ...u, passwordHash: undefined })),
        };
        users = { findById: jest.fn() };
        controller = new AuthController(auth as any, users as any);
    });

    describe('POST /auth/register', () => {
        it('delegates to authService.register', () => {
            const dto = { email: 'a@b.com', name: 'A', password: 'pw' } as any;
            auth.register.mockReturnValue('registered');
            expect(controller.register(dto)).toBe('registered');
            expect(auth.register).toHaveBeenCalledWith(dto);
        });
    });

    describe('POST /auth/login', () => {
        it('logs in without a prior token', async () => {
            const dto = { email: 'a@b.com', password: 'pw' };
            auth.login.mockResolvedValue({ access_token: 'jwt' });
            await expect(controller.login(undefined, dto)).resolves.toEqual({
                access_token: 'jwt',
            });
            expect(auth.assertNotAuthenticated).not.toHaveBeenCalled();
            expect(auth.login).toHaveBeenCalledWith(dto);
        });

        it('asserts not already authenticated when a Bearer token is present', async () => {
            const dto = { email: 'a@b.com', password: 'pw' };
            auth.login.mockResolvedValue({ access_token: 'jwt' });
            await controller.login('Bearer existing.token', dto);
            expect(auth.assertNotAuthenticated).toHaveBeenCalledWith('existing.token');
        });

        it('ignores a non-Bearer Authorization header', async () => {
            const dto = { email: 'a@b.com', password: 'pw' };
            auth.login.mockResolvedValue({ access_token: 'jwt' });
            await controller.login('Basic abc', dto);
            expect(auth.assertNotAuthenticated).not.toHaveBeenCalled();
        });
    });

    describe('GET /auth/me', () => {
        it('returns the sanitized current user', async () => {
            users.findById.mockResolvedValue({ id: 'u1', passwordHash: 'secret' });
            const result = await controller.me({ userId: 'u1' });
            expect(users.findById).toHaveBeenCalledWith('u1');
            expect(auth.sanitize).toHaveBeenCalled();
            expect(result).not.toHaveProperty('passwordHash', 'secret');
        });

        it('returns null when the user no longer exists', async () => {
            users.findById.mockResolvedValue(null);
            await expect(controller.me({ userId: 'gone' })).resolves.toBeNull();
        });
    });
});
