import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Express } from 'express';
import * as request from 'supertest';
import { ShortenController } from './shorten.controller';
import { ShortenService } from '../services/shorten.service';
import { AuthService } from '../../auth/services/auth.service';

describe('ShortenController IP handling', () => {
  let app: INestApplication;
  const proxyNbvChatBot = jest.fn().mockResolvedValue(['ok']);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ShortenController],
      providers: [
        { provide: ShortenService, useValue: { proxyNbvChatBot } },
        { provide: JwtService, useValue: { verify: jest.fn() } },
        { provide: AuthService, useValue: { validateUserById: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    (app.getHttpAdapter().getInstance() as Express).set('trust proxy', 1);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => proxyNbvChatBot.mockClear());

  const send = (
    headers: Record<string, string>,
    body: Record<string, unknown> = {},
  ) =>
    request(app.getHttpServer())
      .post('/shorten/nbv')
      .set(headers)
      .send({ messages: [{ role: 'user', content: 'hi' }], ...body })
      .expect(201);

  it('records a different ip for requests with different X-Forwarded-For headers', async () => {
    await send({
      'X-Forwarded-For': '203.0.113.7, 10.0.0.1',
      'User-Agent': 'ua-one',
    });
    await send({ 'X-Forwarded-For': '198.51.100.23', 'User-Agent': 'ua-two' });

    const first = proxyNbvChatBot.mock.calls[0][3];
    const second = proxyNbvChatBot.mock.calls[1][3];
    expect(first.ipAddress).toBe('203.0.113.7');
    expect(second.ipAddress).toBe('198.51.100.23');
    expect(first.ipAddress).not.toBe(second.ipAddress);
    expect(first.userAgent).toBe('ua-one');
    expect(second.userAgent).toBe('ua-two');
  });

  it('falls back to X-Real-IP, then the socket address', async () => {
    await send({ 'X-Real-IP': '192.0.2.44' });
    await send({});

    expect(proxyNbvChatBot.mock.calls[0][3].ipAddress).toBe('192.0.2.44');
    expect(proxyNbvChatBot.mock.calls[1][3].ipAddress).toMatch(
      /^(127\.0\.0\.1|::1)$/,
    );
  });

  it('passes pagePath through to the service', async () => {
    await send({}, { pagePath: '/services/Sales_Training' });
    expect(proxyNbvChatBot.mock.calls[0][3].pagePath).toBe(
      '/services/Sales_Training',
    );
  });
});
