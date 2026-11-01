import { Module } from '@nestjs/common';
import { CountryCatalogService } from './country-catalog.service.js';
import { GameEngineService } from './game-engine.service.js';

@Module({
  providers: [CountryCatalogService, GameEngineService],
  exports: [CountryCatalogService, GameEngineService],
})
export class GameModule {}
