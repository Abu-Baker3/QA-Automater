import 'reflect-metadata';
import { initTelemetry } from '@qa-automater/shared';

initTelemetry('qa-api');

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`[api] listening on :${port}`);
}

bootstrap();
