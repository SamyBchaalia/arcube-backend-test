import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import { Request } from 'express';

void (async () => {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  app.enableCors({
    origin: [
      'https://nbvgroup.ca',
      'https://sami.benchaalia.com',
      'http://localhost:5173',
    ], // or '*' temporarily for debugging
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  // Configure body parsing with raw body for webhooks
  app.use(
    bodyParser.json({
      limit: '50mb',
      verify: (req: Request & { rawBody?: Buffer }, res, buf) => {
        // Store raw body for webhook signature verification
        if (req.url?.includes('/webhooks')) {
          req.rawBody = buf;
        }
      },
    }),
  );
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  const config = new DocumentBuilder()
    .setTitle('Backend Arcube-Shortened-URL')
    .setDescription('Desc')
    .setVersion('0.0.1')
    .addTag('docs')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  await app.listen(port);
})();
