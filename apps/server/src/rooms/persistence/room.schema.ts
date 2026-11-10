import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import type {
  PlayerPowerUps,
  PublicPrompt,
  RoomChoiceRecord,
  RoomConfiguration,
  RoomGameRecord,
  RoomPlayerRecord,
  RoomRecord,
  RoomRoundRecord,
  RoundAnswerRecord,
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

  @Prop({
    type: String,
    default: 'progressive',
    enum: ['progressive', 'easy', 'medium', 'hard', 'expert'],
  })
  difficulty?: RoomConfiguration['difficulty'];

  @Prop({ type: Number, default: 20, min: 0 })
  roundTimeLimitSeconds?: number;

  @Prop({ type: Boolean, default: true })
  speedScoring?: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  wrongAnswerPenalty?: number;
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

  @Prop({ required: true, default: true })
  connected!: boolean;

  @Prop({ type: Boolean, default: false })
  paused?: boolean;

  @Prop({ type: Number, default: null })
  pausedAt?: number | null;

  @Prop({ type: Number, default: null })
  lastActiveAt?: number;

  @Prop({ type: Number, default: 0, min: 0 })
  missedRoundsCount?: number;

  @Prop({ type: Number, default: null })
  spectatorPromptDeadlineAt?: number | null;

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

  @Prop({ type: MongooseSchema.Types.Mixed, default: () => ({ fifty: true, hint: true, double: true, freeze: true }) })
  powerUps?: PlayerPowerUps;

  @Prop({ type: String, default: null })
  doubleActiveForMissionId?: string | null;

  @Prop({ type: String, default: null, select: false })
  hiddenChoiceIdsForMissionId?: string | null;

  @Prop({ type: [String], default: [], select: false })
  hiddenChoiceIds?: string[];

  @Prop({ type: String, default: null, select: false })
  hintForMissionId?: string | null;

  @Prop({ type: String, default: null, select: false })
  hintText?: string | null;
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

  @Prop({
    type: String,
    default: undefined,
    enum: ['easy', 'medium', 'hard', 'expert'],
  })
  difficultyTier?: RoomRoundRecord['difficultyTier'];

  @Prop({ required: true, minlength: 3, maxlength: 3, select: false })
  targetCountryCode!: string;

  @Prop({ required: true, maxlength: 128, select: false })
  targetCountryName!: string;

  @Prop({ type: String, default: '', select: false })
  targetRegion?: string;

  @Prop({ type: String, default: '', select: false })
  targetSubregion?: string;

  @Prop({ type: String, default: '', select: false })
  targetCapital?: string;

  @Prop({ type: String, default: '', select: false })
  targetFlag?: string;

  @Prop({ type: [Number], default: null, select: false })
  targetMapAnchor?: [number, number] | null;

  @Prop({ type: PublicPromptSchema, required: true })
  prompt!: PublicPrompt;

  @Prop({ type: [RoomChoiceSchema], default: [] })
  choices!: RoomChoiceRecord[];

  @Prop({ required: true, default: false })
  revealed!: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  answerReveal!: RoomRoundRecord['answerReveal'];

  @Prop({ type: Number, default: null })
  startedAt!: number | null;

  @Prop({ type: Number, default: null })
  deadlineAt!: number | null;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  answers!: RoundAnswerRecord[];
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

  @Prop({ type: Boolean, default: false })
  paused?: boolean;

  @Prop({ type: Number, default: null })
  pausedAt?: number | null;

  @Prop({ type: Number, default: null })
  pauseDeadlineAt?: number | null;

  @Prop({ type: Number, default: null })
  pausedRoundRemainingMs?: number | null;

  @Prop({ type: Number, default: null })
  pausedTimerRemainingMs?: number | null;

  @Prop({ type: Number, default: null })
  pausedAdvanceRemainingMs?: number | null;

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

  @Prop({ type: String, required: true, enum: ['public', 'private'], default: 'private' })
  visibility!: NonNullable<RoomRecord['visibility']>;

  @Prop({ type: String, default: null, select: false })
  secret?: string | null;

  @Prop({ type: String, default: null, select: false })
  secretHash?: string | null;

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

  @Prop({ type: Number, default: null })
  lastActivityAt?: number;

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
RoomSchema.index({ status: 1, 'game.round.deadlineAt': 1 });
RoomSchema.set('toObject', { flattenMaps: true });
