import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import type {
  PublicPrompt,
  RoomChoiceRecord,
  RoomConfiguration,
  RoomGameRecord,
  RoomPlayerRecord,
  RoomRecord,
  RoomRoundRecord,
} from '../domain/room.types.js';

@Schema({ _id: false })
class RoomConfigurationEntity implements RoomConfiguration {
  @Prop({ type: String, required: true, enum: ['identify', 'reverse', 'pin'] })
  mode!: RoomConfiguration['mode'];

  @Prop({ type: String, required: true, enum: ['locate', 'identify'] })
  pinDirection!: RoomConfiguration['pinDirection'];

  @Prop({ type: String, required: true, enum: ['name', 'flag', 'capital'] })
  subMode!: RoomConfiguration['subMode'];

  @Prop({ type: String, required: true, enum: ['world', 'count', 'timer'] })
  challengeType!: RoomConfiguration['challengeType'];

  @Prop({ required: true, min: 0 })
  challengeValue!: number;
}

const RoomConfigurationSchema = SchemaFactory.createForClass(
  RoomConfigurationEntity,
);

@Schema({ _id: false })
class RoomPlayerEntity implements RoomPlayerRecord {
  @Prop({ required: true })
  playerId!: string;

  @Prop({ required: true, maxlength: 24 })
  name!: string;

  @Prop({ required: true, default: false })
  ready!: boolean;

  @Prop({ required: true, default: true })
  connected!: boolean;

  @Prop({ required: true })
  joinedAt!: number;

  @Prop({ type: Number, default: null })
  disconnectedAt!: number | null;

  @Prop({ required: true, select: false })
  reconnectTokenHash!: string;

  @Prop({ required: true, default: 0, min: 0 })
  score!: number;

  @Prop({ required: true, default: 0, min: 0 })
  streak!: number;

  @Prop({ required: true, default: 0, min: 0 })
  maxStreak!: number;

  @Prop({ type: [Number], default: null })
  pinLocation!: [number, number] | null;

  @Prop({ type: String, default: null })
  answeredMissionId!: string | null;

  @Prop({ required: true, default: 0, min: 0 })
  lastCommandId!: number;
}

const RoomPlayerSchema = SchemaFactory.createForClass(RoomPlayerEntity);

@Schema({ _id: false })
class PublicPromptEntity implements PublicPrompt {
  @Prop({ type: String, required: true, enum: ['text', 'flag', 'instruction'] })
  type!: PublicPrompt['type'];

  @Prop({ required: true, maxlength: 256 })
  value!: string;

  @Prop({ type: [Number], default: undefined })
  mapAnchor?: [number, number];
}

const PublicPromptSchema = SchemaFactory.createForClass(PublicPromptEntity);

@Schema({ _id: false })
class RoomChoiceEntity implements RoomChoiceRecord {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true, maxlength: 128 })
  label!: string;

  @Prop({ required: true, minlength: 3, maxlength: 3, select: false })
  countryCode!: string;
}

const RoomChoiceSchema = SchemaFactory.createForClass(RoomChoiceEntity);

@Schema({ _id: false })
class RoomRoundEntity implements RoomRoundRecord {
  @Prop({ required: true })
  missionId!: string;

  @Prop({ required: true, min: 1 })
  number!: number;

  @Prop({ required: true, minlength: 3, maxlength: 3, select: false })
  targetCountryCode!: string;

  @Prop({ required: true, maxlength: 128, select: false })
  targetCountryName!: string;

  @Prop({ type: PublicPromptSchema, required: true })
  prompt!: PublicPrompt;

  @Prop({ type: [RoomChoiceSchema], default: [] })
  choices!: RoomChoiceRecord[];

  @Prop({ required: true, default: false })
  revealed!: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  answerReveal!: RoomRoundRecord['answerReveal'];
}

const RoomRoundSchema = SchemaFactory.createForClass(RoomRoundEntity);

@Schema({ _id: false })
class RoomGameEntity implements RoomGameRecord {
  @Prop({ type: Number, default: null })
  startedAt!: number | null;

  @Prop({ type: Number, default: null })
  timerDeadlineAt!: number | null;

  @Prop({ type: Number, default: null })
  advanceAt!: number | null;

  @Prop({ type: RoomRoundSchema, default: null })
  round!: RoomRoundRecord | null;

  @Prop({ type: [String], default: [] })
  usedCountryCodes!: string[];
}

const RoomGameSchema = SchemaFactory.createForClass(RoomGameEntity);

@Schema({ timestamps: true, versionKey: false })
export class RoomEntity implements RoomRecord {
  @Prop({ required: true, unique: true, index: true, uppercase: true })
  roomId!: string;

  @Prop({ required: true, min: 0, default: 0 })
  revision!: number;

  @Prop({ type: String, required: true, enum: ['waiting', 'playing', 'finished'] })
  status!: RoomRecord['status'];

  @Prop({ required: true })
  adminPlayerId!: string;

  @Prop({ type: RoomConfigurationSchema, required: true })
  config!: RoomConfiguration;

  @Prop({ type: RoomConfigurationSchema, default: null })
  pendingConfig!: RoomConfiguration | null;

  @Prop({ type: [RoomPlayerSchema], default: [] })
  players!: RoomPlayerRecord[];

  @Prop({ type: RoomGameSchema, required: true })
  game!: RoomGameRecord;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date, required: true })
  updatedAt!: Date;
}

export const ROOM_MODEL = RoomEntity.name;
export const RoomSchema = SchemaFactory.createForClass(RoomEntity);
RoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RoomSchema.index({ status: 1, 'game.timerDeadlineAt': 1 });
RoomSchema.index({ status: 1, 'game.advanceAt': 1 });
RoomSchema.set('toObject', { flattenMaps: true });
