import { randomInt, randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { ANIME_SERIES, GAME_RULES } from '@leilao/shared';
import type {
  Ack,
  AnimeSeries,
  ClientToServerEvents,
  CreateRoomResult,
  InterServerEvents,
  JoinRoomResult,
  PlayerId,
  RoomCode,
  RoomPlayer,
  RoomState,
  ServerToClientEvents,
  SocketData
} from '@leilao/shared';
import { AuctionEngine, AuctionRuleError } from './auction-engine.js';
import { BattleEngine, BattleRuleError } from './battle-engine.js';
import { RoomLock } from './room-lock.js';
import type { RoomStore, StoredRoom } from './room-store.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 5;
const MAX_ROOM_CODE_ATTEMPTS = 20;
const CLEANUP_INTERVAL_MS = 60_000;
const MAX_PLAYER_NAME_LENGTH = 24;

class RoomServiceError extends Error {}

function createRoomCode(): RoomCode {
  return Array.from({ length: ROOM_CODE_LENGTH }, () =>
    ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]
  ).join('');
}

function requirePlayerName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RoomServiceError('Informe um nome de jogador.');
  }

  const name = value.trim();
  if (name.length === 0 || name.length > MAX_PLAYER_NAME_LENGTH) {
    throw new RoomServiceError(`O nome deve ter entre 1 e ${MAX_PLAYER_NAME_LENGTH} caracteres.`);
  }
  return name;
}

function isAnimeSeries(value: unknown): value is AnimeSeries {
  return typeof value === 'string' && ANIME_SERIES.some((series) => series === value);
}

function requireAnimeSeries(value: unknown): AnimeSeries {
  if (!isAnimeSeries(value)) {
    throw new RoomServiceError('Selecione um anime válido para a partida.');
  }
  return value;
}

function requireRoomCode(value: unknown): RoomCode {
  if (typeof value !== 'string') {
    throw new RoomServiceError('Informe o código da sala.');
  }

  const roomCode = value.trim().toUpperCase();
  const allowedCharacters = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);
  if (!allowedCharacters.test(roomCode)) {
    throw new RoomServiceError('Código inválido. Use os 5 caracteres exibidos na sala.');
  }
  return roomCode;
}

function createPlayer(playerId: PlayerId, name: string): RoomPlayer {
  return {
    playerId,
    name,
    connected: true,
    balanceCents: GAME_RULES.startingBalanceCents,
    team: []
  };
}

function toSnapshot(room: StoredRoom): RoomState {
  return {
    roomCode: room.roomCode,
    series: room.series,
    phase: room.phase,
    hostPlayerId: room.hostPlayerId,
    players: room.players,
    auction: room.auction,
    battleResult: room.battleResult,
    serverTime: Date.now()
  };
}

function emitRoomState(io: GameServer, room: StoredRoom): void {
  io.to(room.roomCode).emit('room:state', toSnapshot(room));
}

async function allocateRoomCode(store: RoomStore): Promise<RoomCode> {
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    const roomCode = createRoomCode();
    if (!(await store.get(roomCode))) {
      return roomCode;
    }
  }
  throw new Error('Unable to allocate a unique room code.');
}

function runAck<T>(
  ack: Ack<T> | undefined,
  socket: GameSocket,
  operationName: string,
  operation: () => Promise<T>
): void {
  if (typeof ack !== 'function') {
    console.warn(`Ignored socket operation "${operationName}" without an acknowledgement callback.`);
    return;
  }

  void operation()
    .then((data) => {
      ack(data === undefined ? { ok: true } : { ok: true, data });
    })
    .catch((error: unknown) => {
      if (
        error instanceof RoomServiceError
        || error instanceof AuctionRuleError
        || error instanceof BattleRuleError
      ) {
        ack({ ok: false, error: error.message });
        return;
      }

      console.error(`Socket operation "${operationName}" failed for ${socket.id}:`, error);
      ack({ ok: false, error: 'Ocorreu um erro interno. Tente novamente.' });
    });
}

export function registerSocketHandlers(io: GameServer, store: RoomStore): () => void {
  const playerSocketIds = new Map<PlayerId, string>();
  const auctionTimers = new Map<RoomCode, ReturnType<typeof setTimeout>>();
  const roomLocks = new RoomLock();
  const auctionEngine = new AuctionEngine();
  const battleEngine = new BattleEngine();
  let handlersStopped = false;

  function clearAuctionTimer(roomCode: RoomCode): void {
    const timer = auctionTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      auctionTimers.delete(roomCode);
    }
  }

  async function saveAndBroadcast(room: StoredRoom, now = Date.now()): Promise<void> {
    room.lastActivityAt = now;
    await store.save(room);
    emitRoomState(io, room);
    scheduleAuctionTimer(room);
  }

  function scheduleAuctionTimer(room: StoredRoom): void {
    clearAuctionTimer(room.roomCode);
    if (handlersStopped || room.phase !== 'AUCTION' || !room.auction) {
      return;
    }

    const deadline = room.auction.endsAt ?? room.auction.nextCharacterAt;
    if (deadline === null) {
      return;
    }

    const timer = setTimeout(() => {
      if (auctionTimers.get(room.roomCode) === timer) {
        auctionTimers.delete(room.roomCode);
      }
      if (handlersStopped) {
        return;
      }

      void roomLocks.run(room.roomCode, async () => {
        if (handlersStopped) {
          return;
        }
        const latestRoom = await store.get(room.roomCode);
        if (!latestRoom) {
          return;
        }

        const now = Date.now();
        if (!auctionEngine.advanceOnTimer(latestRoom, now)) {
          scheduleAuctionTimer(latestRoom);
          return;
        }
        await saveAndBroadcast(latestRoom, now);
      }).catch((error: unknown) => {
        console.error(`Auction timer failed for room ${room.roomCode}:`, error);
      });
    }, Math.max(0, deadline - Date.now()));

    auctionTimers.set(room.roomCode, timer);
  }

  async function getActionRoom(
    socket: GameSocket,
    roomCode: RoomCode,
    playerId: PlayerId
  ): Promise<StoredRoom> {
    const room = await store.get(roomCode);
    if (!room) {
      throw new RoomServiceError('Sala não encontrada ou já encerrada.');
    }
    if (socket.data.roomCode !== roomCode || socket.data.playerId !== playerId) {
      throw new RoomServiceError('Esta conexão não está autenticada como esse jogador.');
    }

    const player = room.players.find((candidate) => candidate.playerId === playerId);
    if (!player || !player.connected) {
      throw new RoomServiceError('Jogador não conectado à sala.');
    }
    return room;
  }

  async function resolveExpiredLot(room: StoredRoom, now: number): Promise<void> {
    if (room.auction?.endsAt !== null && room.auction?.endsAt !== undefined && now >= room.auction.endsAt) {
      auctionEngine.advanceOnTimer(room, now);
      await saveAndBroadcast(room, now);
      throw new AuctionRuleError('O tempo para este personagem acabou.');
    }

    if (room.auction?.nextCharacterAt !== null && room.auction?.nextCharacterAt !== undefined
      && now >= room.auction.nextCharacterAt) {
      if (auctionEngine.advanceOnTimer(room, now)) {
        await saveAndBroadcast(room, now);
      }
    }
  }

  async function associateSocket(
    socket: GameSocket,
    room: StoredRoom,
    player: StoredRoom['players'][number]
  ): Promise<void> {
    const previousSocketId = playerSocketIds.get(player.playerId);
    await socket.join(room.roomCode);
    player.connected = true;
    room.lastActivityAt = Date.now();
    await store.save(room);
    socket.data.playerId = player.playerId;
    socket.data.roomCode = room.roomCode;
    playerSocketIds.set(player.playerId, socket.id);

    if (previousSocketId && previousSocketId !== socket.id) {
      io.sockets.sockets.get(previousSocketId)?.disconnect(true);
    }
  }

  io.on('connection', (socket) => {
    socket.on('room:create', (payload, ack) => {
      runAck<CreateRoomResult>(ack, socket, 'room:create', async () => {
        if (socket.data.roomCode) {
          throw new RoomServiceError('Este jogador já está conectado a uma sala.');
        }

        const name = requirePlayerName(payload?.playerName);
        const series = requireAnimeSeries(payload?.series);
        const roomCode = await allocateRoomCode(store);
        const playerId = randomUUID();
        const now = Date.now();
        const room: StoredRoom = {
          roomCode,
          series,
          phase: 'LOBBY',
          hostPlayerId: playerId,
          players: [createPlayer(playerId, name)],
          auction: null,
          battleResult: null,
          lastActivityAt: now
        };

        await store.save(room);
        await associateSocket(socket, room, room.players[0]);
        emitRoomState(io, room);
        return { roomCode, playerId };
      });
    });

    socket.on('room:join', (payload, ack) => {
      runAck<JoinRoomResult>(ack, socket, 'room:join', async () => {
        const roomCode = requireRoomCode(payload?.roomCode);
        return roomLocks.run(roomCode, async () => {
          const room = await store.get(roomCode);
          if (!room) {
            throw new RoomServiceError('Sala não encontrada ou já encerrada.');
          }

          if (socket.data.roomCode) {
            const alreadyJoined = socket.data.roomCode === roomCode
              && socket.data.playerId === payload?.playerId;
            if (!alreadyJoined) {
              throw new RoomServiceError('Este jogador já está conectado a outra sala.');
            }
          }

          if (payload?.playerId !== undefined) {
            if (typeof payload.playerId !== 'string' || payload.playerId.length === 0) {
              throw new RoomServiceError('Identificador de jogador inválido.');
            }

            const existingPlayer = room.players.find((player) => player.playerId === payload.playerId);
            if (!existingPlayer) {
              throw new RoomServiceError('Este jogador não pertence à sala.');
            }

            await associateSocket(socket, room, existingPlayer);
            emitRoomState(io, room);
            scheduleAuctionTimer(room);
            return { playerId: existingPlayer.playerId };
          }

          if (room.phase !== 'LOBBY') {
            throw new RoomServiceError('A sala já iniciou; use seu identificador para reconectar.');
          }
          if (room.players.length >= 2) {
            throw new RoomServiceError('A sala já está completa.');
          }

          const player = createPlayer(randomUUID(), requirePlayerName(payload?.playerName));
          room.players.push(player);
          room.lastActivityAt = Date.now();
          await associateSocket(socket, room, player);
          emitRoomState(io, room);
          return { playerId: player.playerId };
        });
      });
    });

    socket.on('auction:start', (payload, ack) => {
      runAck<void>(ack, socket, 'auction:start', async () => {
        const roomCode = requireRoomCode(payload?.roomCode);
        const playerId = payload?.playerId;
        if (typeof playerId !== 'string' || playerId.length === 0) {
          throw new RoomServiceError('Identificador de jogador inválido.');
        }

        return roomLocks.run(roomCode, async () => {
          const room = await getActionRoom(socket, roomCode, playerId);
          if (room.hostPlayerId !== playerId) {
            throw new AuctionRuleError('Somente quem criou a sala pode iniciar o leilão.');
          }
          auctionEngine.start(room);
          await saveAndBroadcast(room);
        });
      });
    });

    socket.on('auction:bid', (payload, ack) => {
      runAck<void>(ack, socket, 'auction:bid', async () => {
        const roomCode = requireRoomCode(payload?.roomCode);
        const playerId = payload?.playerId;
        if (typeof playerId !== 'string' || playerId.length === 0) {
          throw new RoomServiceError('Identificador de jogador inválido.');
        }

        return roomLocks.run(roomCode, async () => {
          const room = await getActionRoom(socket, roomCode, playerId);
          const now = Date.now();
          await resolveExpiredLot(room, now);
          auctionEngine.bid(room, playerId, payload.amountCents, now);
          await saveAndBroadcast(room, now);
        });
      });
    });

    socket.on('auction:pass', (payload, ack) => {
      runAck<void>(ack, socket, 'auction:pass', async () => {
        const roomCode = requireRoomCode(payload?.roomCode);
        const playerId = payload?.playerId;
        if (typeof playerId !== 'string' || playerId.length === 0) {
          throw new RoomServiceError('Identificador de jogador inválido.');
        }

        return roomLocks.run(roomCode, async () => {
          const room = await getActionRoom(socket, roomCode, playerId);
          const now = Date.now();
          await resolveExpiredLot(room, now);
          auctionEngine.pass(room, playerId, now);
          await saveAndBroadcast(room, now);
        });
      });
    });

    socket.on('auction:restart', (payload, ack) => {
      runAck<void>(ack, socket, 'auction:restart', async () => {
        const roomCode = requireRoomCode(payload?.roomCode);
        const playerId = payload?.playerId;
        if (typeof playerId !== 'string' || playerId.length === 0) {
          throw new RoomServiceError('Identificador de jogador inválido.');
        }

        return roomLocks.run(roomCode, async () => {
          const room = await getActionRoom(socket, roomCode, playerId);
          if (room.hostPlayerId !== playerId) {
            throw new AuctionRuleError('Somente quem criou a sala pode reiniciar o leilão.');
          }
          if (room.phase !== 'TEAM_REVIEW' && room.phase !== 'RESULT') {
            throw new AuctionRuleError('O leilão só pode ser reiniciado após o encerramento.');
          }

          clearAuctionTimer(roomCode);
          room.phase = 'LOBBY';
          room.auction = null;
          room.battleResult = null;
          for (const player of room.players) {
            player.balanceCents = GAME_RULES.startingBalanceCents;
            player.team = [];
          }
          await saveAndBroadcast(room);
        });
      });
    });

    socket.on('battle:start', (payload, ack) => {
      runAck<void>(ack, socket, 'battle:start', async () => {
        const roomCode = requireRoomCode(payload?.roomCode);
        const playerId = payload?.playerId;
        if (typeof playerId !== 'string' || playerId.length === 0) {
          throw new RoomServiceError('Identificador de jogador inválido.');
        }

        return roomLocks.run(roomCode, async () => {
          const room = await getActionRoom(socket, roomCode, playerId);
          if (room.hostPlayerId !== playerId) {
            throw new BattleRuleError('Somente quem criou a sala pode iniciar a batalha.');
          }
          battleEngine.simulate(room, payload.scenario);
          await saveAndBroadcast(room);
        });
      });
    });

    socket.on('disconnect', () => {
      const { playerId, roomCode } = socket.data;
      if (!playerId || !roomCode || playerSocketIds.get(playerId) !== socket.id) {
        return;
      }

      playerSocketIds.delete(playerId);
      void roomLocks.run(roomCode, async () => {
        const room = await store.get(roomCode);
        if (!room) {
          return;
        }

        const player = room.players.find((candidate) => candidate.playerId === playerId);
        if (!player) {
          return;
        }

        player.connected = false;
        await saveAndBroadcast(room);
      }).catch((error: unknown) => {
        console.error(`Failed to record disconnect for player ${playerId}:`, error);
      });
    });
  });

  const cleanupTimer = setInterval(() => {
    void (async () => {
      const inactiveBefore = Date.now() - GAME_RULES.roomInactivityExpirationMs;
      const rooms = await store.list();
      for (const room of rooms) {
        if (room.lastActivityAt > inactiveBefore) {
          continue;
        }

        await roomLocks.run(room.roomCode, async () => {
          const expiredRoom = await store.deleteIfInactive(room.roomCode, inactiveBefore);
          if (!expiredRoom) {
            return;
          }

          clearAuctionTimer(expiredRoom.roomCode);
          io.to(expiredRoom.roomCode).emit('room:closed', { reason: 'INACTIVITY' });
          for (const player of expiredRoom.players) {
            const socketId = playerSocketIds.get(player.playerId);
            if (!socketId) {
              continue;
            }

            const playerSocket = io.sockets.sockets.get(socketId);
            if (playerSocket) {
              playerSocket.data.playerId = undefined;
              playerSocket.data.roomCode = undefined;
              await playerSocket.leave(expiredRoom.roomCode);
            }
            playerSocketIds.delete(player.playerId);
          }
        });
      }
    })().catch((error: unknown) => {
      console.error('Failed to clean up inactive rooms:', error);
    });
  }, CLEANUP_INTERVAL_MS);

  return () => {
    handlersStopped = true;
    clearInterval(cleanupTimer);
    for (const timer of auctionTimers.values()) {
      clearTimeout(timer);
    }
    auctionTimers.clear();
  };
}
