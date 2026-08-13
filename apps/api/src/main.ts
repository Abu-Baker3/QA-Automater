import 'reflect-metadata';
import { initTelemetry } from '@qa-automater/shared';

initTelemetry('qa-api');

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`[api] listening on :${port}`);
}

bootstrap();
