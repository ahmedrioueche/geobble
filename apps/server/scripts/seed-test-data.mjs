import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { ROOM_MODEL, RoomSchema } from '../dist/rooms/persistence/room.schema.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const createRoomId = (length) =>
  Array.from({ length }, () => String(randomInt(10))).join('');

const createPlayer = (name, joinedAt, disconnectedAt) => ({
  playerId: randomUUID(),
  name,
  ready: false,
  connected: false,
  joinedAt,
  disconnectedAt,
  reconnectTokenHash: createHash('sha256')
    .update(randomBytes(32))
    .digest('hex'),
  score: 0,
  streak: 0,
  maxStreak: 0,
  pinLocation: null,
  answeredMissionId: null,
  lastCommandId: 0,
});

const main = async () => {
  process.loadEnvFile(resolve(scriptDirectory, '../.env'));
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string in apps/server/.env.');
  }

  const now = Date.now();
  const firstPlayer = createPlayer('Test Admin', now, now);
  const secondPlayer = createPlayer('Test Player', now + 1, now);
  const connection = await mongoose
    .createConnection(uri, { serverSelectionTimeoutMS: 10_000 })
    .asPromise();

  try {
    const roomModel = connection.model(ROOM_MODEL, RoomSchema);
    const room = {
      roomId: '',
      revision: 0,
      status: 'waiting',
      adminPlayerId: firstPlayer.playerId,
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
      },
      pendingConfig: null,
      players: [firstPlayer, secondPlayer],
      game: {
        startedAt: null,
        timerDeadlineAt: null,
        advanceAt: null,
        round: null,
        usedCountryCodes: [],
      },
      expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
    let inserted = false;
    for (let length = 4; length <= 12 && !inserted; length += 1) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        room.roomId = createRoomId(length);
        try {
          await roomModel.create(room);
          inserted = true;
          break;
        } catch (error) {
          if (
            typeof error !== 'object' ||
            error === null ||
            !('code' in error) ||
            error.code !== 11000
          ) {
            throw error;
          }
        }
      }
    }
    if (!inserted) throw new Error('Could not allocate a unique test room code.');

    const roomId = room.roomId;

    console.log(`Inserted test room ${roomId} into MongoDB. It expires in 24 hours.`);
    console.log('The seeded players are disconnected placeholders and cannot reconnect.');
  } finally {
    await connection.close();
  }
};

main().catch((error) => {
  console.error('Could not insert MongoDB test data:', error);
  process.exitCode = 1;
});
