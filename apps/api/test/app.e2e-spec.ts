import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/app.setup';
import { AppModule } from '../src/app.module';

describe('CPEB API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns API status', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({
        message: 'University Equipment Booking API',
        status: 'running',
      });
  });

  it('GET /health returns healthy service metadata', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('university-equipment-booking-api');
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it('GET /db-health verifies PostgreSQL connectivity', async () => {
    const response = await request(app.getHttpServer())
      .get('/db-health')
      .expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('connected');
    expect(response.body.provider).toBe('postgresql');
  });

  it('serves Swagger UI', async () => {
    await request(app.getHttpServer()).get('/docs/').expect(200);
  });

  it('protects equipment, maintenance, and audit routes without JWT', async () => {
    await request(app.getHttpServer()).get('/equipment').expect(401);
    await request(app.getHttpServer()).get('/maintenance').expect(401);
    await request(app.getHttpServer()).get('/audit-logs').expect(401);
  });
});
