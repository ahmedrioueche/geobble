import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { validateEnvironment } from './config/server-configuration.js';
import { HealthModule } from './health/health.module.js';
import { RoomsModule } from './rooms/rooms.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('mongoUri'),
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 10,
        autoIndex: true,
      }),
    }),
    HealthModule,
    RoomsModule,
  ],
})
export class AppModule {}
