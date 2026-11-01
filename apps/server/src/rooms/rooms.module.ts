import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module.js';
import { RoomsPersistenceModule } from './persistence/rooms-persistence.module.js';
import { RoomGameplayService } from './room-gameplay.service.js';
import { RoomGateway } from './room.gateway.js';
import { RoomLifecycleService } from './room-lifecycle.service.js';
import { RoomMutationService } from './room-mutation.service.js';
import { RoomRuntimeService } from './room-runtime.service.js';

@Module({
  imports: [GameModule, RoomsPersistenceModule],
  providers: [
    RoomMutationService,
    RoomLifecycleService,
    RoomGameplayService,
    RoomRuntimeService,
    RoomGateway,
  ],
})
export class RoomsModule {}
