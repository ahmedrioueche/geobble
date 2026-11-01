import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.enableCors({
    origin: config.getOrThrow<string[]>('clientOrigins'),
    credentials: true,
  });
  app.enableShutdownHooks();
  await app.listen(config.getOrThrow<number>('port'), '0.0.0.0');
}
await bootstrap();
