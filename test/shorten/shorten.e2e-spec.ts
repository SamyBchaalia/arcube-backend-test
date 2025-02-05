import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ShortenModule } from 'src/modules/shorten/shorten.module';
import TestAgent from 'supertest/lib/agent';

describe('URL Shortener API (E2E)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let server: TestAgent<request.Test>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), ShortenModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe()); // Apply validation globally
    await app.init();

    server = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /url/shorten', () => {
    it('should shorten a valid URL', async () => {
      const response = await server
        .post('/url/shorten')
        .send({ originalUrl: 'https://example.com' })
        .expect(201);

      expect(response.body).toHaveProperty('shortUrl');
      expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:3000\/url\//);
    });

    it('should return a 400 error for invalid URLs', async () => {
      const response = await server
        .post('/url/shorten')
        .send({ originalUrl: 'invalid-url' })
        .expect(400);

      expect(response.body.message).toContain('Invalid URL format');
    });
  });

  describe('GET /url/:shortId', () => {
    let shortUrl: string;

    beforeAll(async () => {
      const response = await server
        .post('/url/shorten')
        .send({ originalUrl: 'https://example.com' });

      shortUrl = response.body.shortUrl.split('/').pop();
    });

    it('should redirect to the original URL', async () => {
      const response = await server.get(`/url/${shortUrl}`).expect(302);
      expect(response.headers.location).toBe('https://example.com');
    });

    it('should return 404 for non-existent short URLs', async () => {
      await server.get('/url/nonexistent123').expect(404);
    });
  });
});
