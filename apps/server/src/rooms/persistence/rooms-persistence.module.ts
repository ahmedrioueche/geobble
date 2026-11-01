import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ROOM_REPOSITORY } from '../domain/room-repository.js';
import { MongoRoomRepository } from './mongo-room.repository.js';
import { ROOM_MODEL, RoomSchema } from './room.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: ROOM_MODEL, schema: RoomSchema }])],
  providers: [
    MongoRoomRepository,
    { provide: ROOM_REPOSITORY, useExisting: MongoRoomRepository },
  ],
  exports: [ROOM_REPOSITORY],
})
export class RoomsPersistenceModule {}
