import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/app.setup';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CPEB API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.CPEB_DEV_SHOW_VERIFICATION_CODE = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes health, database health and readiness', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).get('/db-health').expect(200);
    const readiness = await request(app.getHttpServer()).get('/readiness').expect(200);
    expect(readiness.body.status).toBe('ready');
    expect(readiness.body.resources).toBeGreaterThan(0);
  });

  it('protects authenticated operational routes without JWT', async () => {
    await request(app.getHttpServer()).get('/equipment').expect(401);
    await request(app.getHttpServer()).get('/maintenance').expect(401);
    await request(app.getHttpServer()).get('/audit-logs').expect(401);
    await request(app.getHttpServer()).get('/admin/dashboard').expect(401);
  });

  it('completes the committee-critical journey with concurrency and role checks', async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const studentEmail = `student-${suffix}@example.edu`;
    const studentId = `STU-${suffix}`;
    const studentPassword = 'StudentPassword123!';
    const adminEmail = `admin-${suffix}@example.edu`;
    const technicianEmail = `tech-${suffix}@example.edu`;
    const staffPassword = 'StaffPassword123!';
    const inventoryTag = `E2E-${suffix}`;

    let studentUserId: string | undefined;
    let adminUserId: string | undefined;
    let technicianUserId: string | undefined;
    let equipmentId: string | undefined;
    const bookingIds: string[] = [];
    const reportIds: string[] = [];

    try {
      const registration = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          fullName: 'Committee Test Student',
          studentId,
          email: studentEmail,
          password: studentPassword,
        })
        .expect(201);

      expect(registration.body.requiresVerification).toBe(true);
      expect(registration.body.developmentVerificationCode).toMatch(/^\d{6}$/);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: studentEmail, password: studentPassword })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: studentEmail, code: '000000' })
        .expect(400);

      const verification = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: studentEmail,
          code: registration.body.developmentVerificationCode,
        })
        .expect(201);

      studentUserId = verification.body.user.id;
      const studentToken = verification.body.accessToken as string;
      expect(verification.body.user.studentId).toBe(studentId);

      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect(me.body.studentId).toBe(studentId);

      const staffHash = await bcrypt.hash(staffPassword, 12);
      const [admin, technician] = await Promise.all([
        prisma.user.create({
          data: {
            fullName: 'E2E Administrator',
            email: adminEmail,
            password: staffHash,
            role: UserRole.ADMIN,
            isActive: true,
            emailVerified: true,
          },
        }),
        prisma.user.create({
          data: {
            fullName: 'E2E Technician',
            email: technicianEmail,
            password: staffHash,
            role: UserRole.TECHNICIAN,
            isActive: true,
            emailVerified: true,
          },
        }),
      ]);
      adminUserId = admin.id;
      technicianUserId = technician.id;

      const adminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: staffPassword })
        .expect(201);
      const adminToken = adminLogin.body.accessToken as string;

      const technicianLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: technicianEmail, password: staffPassword })
        .expect(201);
      const technicianToken = technicianLogin.body.accessToken as string;

      const equipment = await request(app.getHttpServer())
        .post('/admin/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Committee E2E Camera',
          category: 'MEDIA',
          inventoryTag,
          location: 'Committee Test Lab',
          description: 'Temporary deep E2E resource',
        })
        .expect(201);
      equipmentId = equipment.body.id;

      const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
      start.setUTCMinutes(0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const body = {
        equipmentId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        reason: 'Committee acceptance test',
      };

      const [firstAttempt, secondAttempt] = await Promise.all([
        request(app.getHttpServer())
          .post('/bookings')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(body),
        request(app.getHttpServer())
          .post('/bookings')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(body),
      ]);

      expect([firstAttempt.status, secondAttempt.status].sort()).toEqual([201, 409]);
      const successfulBooking = firstAttempt.status === 201 ? firstAttempt.body : secondAttempt.body;
      const bookingId = successfulBooking.id as string;
      bookingIds.push(bookingId);
      expect(successfulBooking.status).toBe('PENDING');

      await request(app.getHttpServer())
        .post('/admin/maintenance')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          equipmentId,
          title: 'Conflicting maintenance',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        })
        .expect(409);

      await request(app.getHttpServer())
        .patch(`/admin/bookings/${bookingId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const pastStart = new Date(Date.now() - 20 * 60 * 1000);
      const pastEnd = new Date(Date.now() + 40 * 60 * 1000);
      await prisma.booking.update({
        where: { id: bookingId },
        data: { startTime: pastStart, endTime: pastEnd },
      });

      await request(app.getHttpServer())
        .patch(`/admin/bookings/${bookingId}/check-out`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (await prisma.equipment.findUniqueOrThrow({ where: { id: equipmentId } })).status,
      ).toBe(EquipmentStatus.CHECKED_OUT);

      const finished = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/finish`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect(finished.body.status).toBe('RETURNED');

      expect(
        (await prisma.equipment.findUniqueOrThrow({ where: { id: equipmentId } })).status,
      ).toBe(EquipmentStatus.AVAILABLE);

      const rating = await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/rating`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ score: 5, comment: 'Committee journey verified' })
        .expect(201);
      expect(rating.body.score).toBe(5);

      const report = await request(app.getHttpServer())
        .post('/repair-tickets')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          equipmentId,
          title: 'Committee test report',
          description: 'Testing the student-to-technician report path',
        })
        .expect(201);
      reportIds.push(report.body.id);
      expect(report.body.reporterId).toBe(studentUserId);

      await request(app.getHttpServer())
        .patch(`/admin/reports/${report.body.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ technicianId: technicianUserId })
        .expect(200);

      const technicianReports = await request(app.getHttpServer())
        .get('/admin/reports')
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(200);
      expect(technicianReports.body.some((item: any) => item.id === report.body.id)).toBe(true);

      await request(app.getHttpServer())
        .patch(`/admin/reports/${report.body.id}/status`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ status: 'READY_FOR_TEST', diagnosis: 'Connector inspected' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/admin/reports/${report.body.id}/status`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ status: 'RESOLVED', diagnosis: 'Connector replaced and tested' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/admin/reports/${report.body.id}/status`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ status: 'CLOSED' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/admin/reports/${report.body.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CLOSED' })
        .expect(200);

      const cancelStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const cancelEnd = new Date(cancelStart.getTime() + 60 * 60 * 1000);
      const cancellable = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          equipmentId,
          startTime: cancelStart.toISOString(),
          endTime: cancelEnd.toISOString(),
          reason: 'Cancellation path test',
        })
        .expect(201);
      bookingIds.push(cancellable.body.id);

      const cancelled = await request(app.getHttpServer())
        .patch(`/bookings/${cancellable.body.id}/cancel`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect(cancelled.body.status).toBe('CANCELLED');

      const mine = await request(app.getHttpServer())
        .get('/bookings/mine')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      const savedBooking = mine.body.find((item: any) => item.id === bookingId);
      expect(savedBooking.rating.score).toBe(5);

      const loginAgain = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: studentEmail, password: studentPassword })
        .expect(201);
      expect(loginAgain.body.user.studentId).toBe(studentId);
      expect(loginAgain.body.accessToken).toEqual(expect.any(String));
    } finally {
      if (reportIds.length) {
        await prisma.repairTicket.deleteMany({ where: { id: { in: reportIds } } });
      }
      if (bookingIds.length) {
        await prisma.bookingRating.deleteMany({ where: { bookingId: { in: bookingIds } } });
      }
      const actorIds = [studentUserId, adminUserId, technicianUserId].filter(Boolean) as string[];
      if (actorIds.length || equipmentId || bookingIds.length) {
        await prisma.auditLog.deleteMany({
          where: {
            OR: [
              ...(actorIds.length ? [{ actorId: { in: actorIds } }] : []),
              ...(equipmentId ? [{ equipmentId }] : []),
              ...(bookingIds.length ? [{ bookingId: { in: bookingIds } }] : []),
            ],
          },
        });
      }
      if (bookingIds.length) {
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      if (equipmentId) {
        await prisma.maintenanceRecord.deleteMany({ where: { equipmentId } });
        await prisma.repairTicket.deleteMany({ where: { equipmentId } });
        await prisma.equipment.deleteMany({ where: { id: equipmentId } });
      }
      if (actorIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: actorIds } } });
      } else {
        await prisma.user.deleteMany({ where: { email: studentEmail } });
      }
    }
  });
});
