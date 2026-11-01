import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { HealthController } from '../src/health/health.controller.js';

describe('Health endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let connection: { readyState: number };

  beforeEach(async () => {
    connection = { readyState: 1 };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: getConnectionToken(),
          useValue: connection,
        },
      ],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('reports liveness without requiring a database connection', () =>
    request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' }));

  it('reports readiness when MongoDB is connected', () =>
    request(app.getHttpServer())
      .get('/health/ready')
      .expect(200, { status: 'ready' }));

  it('returns unavailable when MongoDB is disconnected', () => {
    connection.readyState = 0;
    return request(app.getHttpServer()).get('/health/ready').expect(503);
  });

  afterEach(async () => {
    if (app) await app.close();
  });
});
