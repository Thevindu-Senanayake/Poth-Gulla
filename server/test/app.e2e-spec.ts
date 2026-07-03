import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';
import { BookingService } from '../src/booking/booking.service.js';
import { ScanService } from '../src/scan/scan.service.js';

/**
 * E2E smoke suite - boots the real AppModule (global JwtAuthGuard, RolesGuard,
 * ValidationPipe, /api prefix) with Prisma and Redis replaced by in-memory
 * fakes. Verifies the HTTP wiring of the critical auth → booking → scan surface:
 * authentication, role enforcement, validation, and route shape.
 */
describe('App (e2e smoke)', () => {
  let app: INestApplication;
  let studentToken: string;

  const PASSWORD = 'Password123';

  // Seeded users keyed by id and email
  let usersById: Record<string, any>;
  let usersByEmail: Record<string, any>;

  const bookingService = {
    create: jest.fn(async () => ({ id: 'bk1', status: 'APPROVED' })),
  };
  const scanService = {
    roomCheckin: jest.fn(async () => ({ attended: true, pointsAwarded: 20 })),
    checkout: jest.fn(),
    returnItem: jest.fn(),
    // Route-wiring only: the real 404 path is covered by scan.service.spec.
    selfCheckout: jest.fn(async () => {
      throw new NotFoundException('No book copy with asset tag');
    }),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret';
    process.env.JWT_EXPIRES_IN = '1h';

    const hash = await bcrypt.hash(PASSWORD, 10);
    const student = {
      id: 'student-1',
      email: 'student@iit.ac.lk',
      name: 'Student One',
      role: 'STUDENT',
      passwordHash: hash,
      isActive: true,
      userPoints: 500,
      tier: 3,
    };
    const disabledUser = {
      id: 'student-disabled',
      email: 'disabled@iit.ac.lk',
      name: 'Disabled Student',
      role: 'STUDENT',
      passwordHash: hash,
      isActive: false,
      userPoints: 500,
      tier: 3,
    };
    usersById = { 'student-1': student, 'student-disabled': disabledUser };
    usersByEmail = {
      'student@iit.ac.lk': student,
      'disabled@iit.ac.lk': disabledUser,
    };

    const prismaMock = {
      user: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.email) return usersByEmail[where.email] ?? null;
          if (where.id) return usersById[where.id] ?? null;
          return null;
        }),
      },
      // Audit and notification writes are fire-and-forget in e2e; silence them.
      log: { create: jest.fn(async () => ({})) },
      notification: {
        create: jest.fn(async () => ({})),
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
      bookCopy: { findUnique: jest.fn(async () => null) },
      waitlistEntry: { findMany: jest.fn(async () => []) },
    };

    const redisMock = {
      get: jest.fn(async () => null),
      set: jest.fn(async () => undefined),
      del: jest.fn(async () => undefined),
      delByPattern: jest.fn(async () => undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .overrideProvider(BookingService)
      .useValue(bookingService)
      .overrideProvider(ScanService)
      .useValue(scanService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Auth', () => {
    it('POST /api/auth/login → 200 with an access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@iit.ac.lk', password: PASSWORD })
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.passwordHash).toBeUndefined();
      studentToken = res.body.accessToken;
    });

    it('POST /api/auth/login with wrong password → 401', () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@iit.ac.lk', password: 'wrong' })
        .expect(401));

    it('POST /api/auth/login with a disabled account → 401', () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'disabled@iit.ac.lk', password: PASSWORD })
        .expect(401));

    it('POST /api/auth/login with a missing field → 400 (validation)', () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@iit.ac.lk' })
        .expect(400));

    it('GET /api/auth/me without a token → 401', () =>
      request(app.getHttpServer()).get('/api/auth/me').expect(401));

    it('GET /api/auth/me with a token → 200 and sanitized profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect(res.body.email).toBe('student@iit.ac.lk');
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('Role enforcement', () => {
    it('GET /api/users as a student → 403 (staff-only)', () =>
      request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403));
  });

  describe('Booking', () => {
    const validBooking = {
      resourceType: 'BOOK',
      resourceId: '11111111-1111-4111-8111-111111111111',
      startAt: '2026-06-24T10:00:00Z',
      endAt: '2026-06-25T10:00:00Z',
    };

    it('POST /api/bookings without a token → 401', () =>
      request(app.getHttpServer())
        .post('/api/bookings')
        .send(validBooking)
        .expect(401));

    it('POST /api/bookings with an invalid body → 400 (validation)', () =>
      request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ resourceType: 'BOOK', resourceId: 'not-a-uuid' })
        .expect(400));

    it('POST /api/bookings as a student → 201 and reaches the service', async () => {
      await request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validBooking)
        .expect(201);
      expect(bookingService.create).toHaveBeenCalledWith(
        'student-1',
        expect.any(Object),
      );
    });
  });

  describe('Scan', () => {
    it('POST /api/scan/room-checkin as a student → 201 (+20 pts)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/scan/room-checkin')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ roomQr: 'ROOM-1' })
        .expect(201);
      expect(res.body.pointsAwarded).toBe(20);
      expect(scanService.roomCheckin).toHaveBeenCalledWith(
        'student-1',
        expect.any(Object),
        false, // isStaff = false for a student caller
      );
    });

    it('POST /api/scan/checkout as a student → 403 (staff-only)', () =>
      request(app.getHttpServer())
        .post('/api/scan/checkout')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ bookingQr: 'B', assetTag: 'A' })
        .expect(403));

    it('POST /api/scan/self-checkout with a missing assetTag → 400 (validation)', () =>
      request(app.getHttpServer())
        .post('/api/scan/self-checkout')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(400));

    it('POST /api/scan/self-checkout with an unknown tag → 404', () =>
      request(app.getHttpServer())
        .post('/api/scan/self-checkout')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ assetTag: 'BK-NOPE-999' })
        .expect(404));
  });

  describe('Waitlist review (staff-only surface)', () => {
    it('GET /api/waitlist/review-count as a student → 403', () =>
      request(app.getHttpServer())
        .get('/api/waitlist/review-count')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403));

    it('POST /api/waitlist/:id/decline-message as a student → 403', () =>
      request(app.getHttpServer())
        .post('/api/waitlist/w1/decline-message')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(403));
  });

  describe('Notifications', () => {
    it('GET /api/notifications/me without a token → 401', () =>
      request(app.getHttpServer()).get('/api/notifications/me').expect(401));

    it('GET /api/notifications/me with a token → 200 with paginated shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toMatchObject({ page: 1, total: 0 });
    });

    it('POST /api/notifications/read-all scopes to the caller', async () => {
      await request(app.getHttpServer())
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(201);
    });
  });
});
