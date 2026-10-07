import type { AnimeSeries, BattleScenario, CharacterId, CharacterTag, RosterCharacter } from './roster.js';

export type RoomCode = string;
export type PlayerId = string;
export type RoomPhase = 'LOBBY' | 'AUCTION' | 'TEAM_REVIEW' | 'RESULT';

export interface OwnedCharacter {
  characterId: CharacterId;
  priceCents: number;
}

export interface RoomPlayer {
  playerId: PlayerId;
  name: string;
  connected: boolean;
  balanceCents: number;
  team: OwnedCharacter[];
}

export interface AuctionState {
  round: 1 | 2;
  currentCharacterId: CharacterId | null;
  queueCharacterIds: CharacterId[];
  currentBidCents: number;
  leadingPlayerId: PlayerId | null;
  passedPlayerIds: PlayerId[];
  endsAt: number | null;
  nextCharacterAt: number | null;
  lastSale: AuctionSale | null;
  unsoldCharacterIds: CharacterId[];
}

export interface AuctionSale {
  characterId: CharacterId;
  playerId: PlayerId | null;
  priceCents: number | null;
  resolvedAt: number;
}

export interface BattleScoreBreakdown {
  playerId: PlayerId;
  base: number;
  synergy: number;
  counters: number;
  scenario: number;
  total: number;
  winProbability: number;
  synergyBreakdown: BattleModifier[];
  counterBreakdown: BattleModifier[];
  scenarioBreakdown: BattleModifier[];
}

export interface BattleModifier {
  id: string;
  points: number;
}

export interface BattleResult {
  scenario: BattleScenario;
  winnerPlayerId: PlayerId;
  calculatedAt: number;
  scores: BattleScoreBreakdown[];
}

export interface RoomState {
  roomCode: RoomCode;
  series: AnimeSeries;
  phase: RoomPhase;
  hostPlayerId: PlayerId;
  players: RoomPlayer[];
  auction: AuctionState | null;
  battleResult: BattleResult | null;
  serverTime: number;
}

export interface CreateRoomPayload {
  playerName: string;
  series: AnimeSeries;
}

export interface JoinRoomPayload {
  roomCode: RoomCode;
  playerName: string;
  playerId?: PlayerId;
}

export interface RoomActionPayload {
  roomCode: RoomCode;
  playerId: PlayerId;
}

export interface BidPayload extends RoomActionPayload {
  amountCents: number;
}

export interface StartBattlePayload extends RoomActionPayload {
  scenario: BattleScenario;
}

export interface CreateRoomResult {
  roomCode: RoomCode;
  playerId: PlayerId;
}

export interface JoinRoomResult {
  playerId: PlayerId;
}

export type AckResponse<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type Ack<T = undefined> = (response: AckResponse<T>) => void;

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload, ack: Ack<CreateRoomResult>) => void;
  'room:join': (payload: JoinRoomPayload, ack: Ack<JoinRoomResult>) => void;
  'auction:start': (payload: RoomActionPayload, ack: Ack<void>) => void;
  'auction:bid': (payload: BidPayload, ack: Ack<void>) => void;
  'auction:pass': (payload: RoomActionPayload, ack: Ack<void>) => void;
  'auction:restart': (payload: RoomActionPayload, ack: Ack<void>) => void;
  'battle:start': (payload: StartBattlePayload, ack: Ack<void>) => void;
}

export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:closed': (payload: { reason: 'INACTIVITY' }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  playerId?: PlayerId;
  roomCode?: RoomCode;
}

export interface CharacterSummary {
  id: CharacterId;
  name: string;
  series: RosterCharacter['series'];
  power: number;
  speed: number;
  resistance: number;
  tags: CharacterTag[];
  groups: string[];
}
