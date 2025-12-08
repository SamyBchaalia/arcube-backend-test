import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ShortenModule } from 'src/modules/shorten/shorten.module';
import TestAgent from 'supertest/lib/agent';

describe('Chatbot API (E2E)', () => {
  let app: INestApplication;
  let server: TestAgent<request.Test>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ShortenModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    server = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /shorten/bot', () => {
    it('should return error when ANTHROPIC_API_KEY is not set', async () => {
      const response = await server
        .post('/shorten/bot')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(201);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /shorten/nbv', () => {
    it('should return error when ANTHROPIC_API_KEY is not set', async () => {
      const response = await server
        .post('/shorten/nbv')
        .send({
          messages: [{ role: 'user', content: 'Tell me about your services' }],
        })
        .expect(201);

      expect(response.body).toHaveProperty('error');
    });
  });
});
