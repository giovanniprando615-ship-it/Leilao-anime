import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { io as createClient, type Socket } from 'socket.io-client';
import { ROSTER } from '@leilao/shared';
import type { AckResponse, CreateRoomResult, JoinRoomResult, RoomState } from '@leilao/shared';
import { createGameServer } from '../src/server.js';

const gameServer = createGameServer();
const clients: Socket[] = [];
let serverUrl: string;

before(async () => {
  await new Promise<void>((resolve) => gameServer.httpServer.listen(0, resolve));
  const address = gameServer.httpServer.address();
  assert.ok(address && typeof address === 'object');
  serverUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  for (const client of clients) {
    client.disconnect();
  }
  gameServer.stopCleanup();
  await new Promise<void>((resolve, reject) => {
    gameServer.io.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
});

async function connectClient(): Promise<Socket> {
  const client = createClient(serverUrl, { autoConnect: false, reconnection: false });
  clients.push(client);
  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
    client.connect();
  });
  return client;
}

function nextRoomState(client: Socket): Promise<RoomState> {
  return new Promise((resolve) => client.once('room:state', resolve));
}

function emitWithAck<T>(client: Socket, event: string, payload: unknown): Promise<AckResponse<T>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event} acknowledgement`)), 2_000);
    client.emit(event, payload, (response: AckResponse<T>) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

test('creates rooms, joins and restores players, then enforces auction actions over Socket.IO', async () => {
  const healthResponse = await fetch(`${serverUrl}/healthz`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: 'ok' });

  const host = await connectClient();
  const invalidSeriesResponse = await emitWithAck<CreateRoomResult>(host, 'room:create', {
    playerName: 'Host',
    series: 'UNKNOWN'
  });

  assert.equal(invalidSeriesResponse.ok, false);
  const hostStatePromise = nextRoomState(host);
  const createResponse = await emitWithAck<CreateRoomResult>(host, 'room:create', {
    playerName: 'Host',
    series: 'ONE_PIECE'
  });
  assert.equal(createResponse.ok, true);
  if (!createResponse.ok || !createResponse.data) {
    throw new Error('Room creation did not return room credentials.');
  }

  const { roomCode, playerId: hostPlayerId } = createResponse.data;
  assert.match(roomCode, /^[A-HJ-NP-Z2-9]{5}$/);
  const hostState = await hostStatePromise;
  assert.equal(hostState.phase, 'LOBBY');
  assert.equal(hostState.series, 'ONE_PIECE');
  assert.equal(hostState.players.length, 1);
  assert.equal(hostState.hostPlayerId, hostPlayerId);
  assert.equal(typeof hostState.serverTime, 'number');
  assert.equal(hostState.battleSeed, null);

  const guest = await connectClient();
  const joinedStatePromise = nextRoomState(host);
  const joinResponse = await emitWithAck<JoinRoomResult>(guest, 'room:join', {
    roomCode: roomCode.toLowerCase(),
    playerName: 'Guest'
  });
  assert.equal(joinResponse.ok, true);
  if (!joinResponse.ok || !joinResponse.data) {
    throw new Error('Joining the room did not return a player ID.');
  }
  const guestPlayerId = joinResponse.data.playerId;
  const joinedState = await joinedStatePromise;
  assert.equal(joinedState.players.length, 2);
  assert.equal(joinedState.players.find((player) => player.playerId === guestPlayerId)?.connected, true);

  const guestSeriesChange = await emitWithAck(guest, 'room:set-series', {
    roomCode,
    playerId: guestPlayerId,
    series: 'BLACK_CLOVER'
  });
  assert.equal(guestSeriesChange.ok, false);

  const changedSeriesStatePromise = nextRoomState(host);
  const hostSeriesChange = await emitWithAck(host, 'room:set-series', {
    roomCode,
    playerId: hostPlayerId,
    series: 'NARUTO'
  });
  assert.deepEqual(hostSeriesChange, { ok: true });
  assert.equal((await changedSeriesStatePromise).series, 'NARUTO');

  const disconnectedStatePromise = nextRoomState(host);
  guest.disconnect();
  const disconnectedState = await disconnectedStatePromise;
  assert.equal(disconnectedState.players.find((player) => player.playerId === guestPlayerId)?.connected, false);

  const reconnectedGuest = await connectClient();
  const reconnectedStatePromise = nextRoomState(host);
  const reconnectResponse = await emitWithAck<JoinRoomResult>(reconnectedGuest, 'room:join', {
    roomCode,
    playerId: guestPlayerId,
    playerName: 'Guest'
  });
  assert.deepEqual(reconnectResponse, { ok: true, data: { playerId: guestPlayerId } });
  const reconnectedState = await reconnectedStatePromise;
  assert.equal(reconnectedState.players.length, 2);
  assert.equal(reconnectedState.players.find((player) => player.playerId === guestPlayerId)?.connected, true);

  const thirdPlayer = await connectClient();
  const fullRoomResponse = await emitWithAck<JoinRoomResult>(thirdPlayer, 'room:join', {
    roomCode,
    playerName: 'Third'
  });
  assert.equal(fullRoomResponse.ok, false);

  const guestStartResponse = await emitWithAck(reconnectedGuest, 'auction:start', {
    roomCode,
    playerId: guestPlayerId
  });
  assert.equal(guestStartResponse.ok, false);

  const notReadyResponse = await emitWithAck(host, 'auction:start', {
    roomCode,
    playerId: hostPlayerId
  });
  assert.equal(notReadyResponse.ok, false);

  assert.deepEqual(await emitWithAck(reconnectedGuest, 'lobby:set-ready', {
    roomCode,
    playerId: guestPlayerId,
    ready: true
  }), { ok: true });
  assert.deepEqual(await emitWithAck(host, 'lobby:set-ready', {
    roomCode,
    playerId: hostPlayerId,
    ready: true
  }), { ok: true });

  const startedStatePromise = nextRoomState(host);
  const startResponse = await emitWithAck(host, 'auction:start', {
    roomCode,
    playerId: hostPlayerId
  });
  assert.deepEqual(startResponse, { ok: true });
  const startedState = await startedStatePromise;
  assert.equal(startedState.phase, 'AUCTION');
  assert.equal(startedState.series, 'NARUTO');
  assert.ok(ROSTER.filter((character) => character.series === startedState.series)
    .some((character) => character.id === startedState.auction?.currentCharacterId));
  assert.ok(startedState.auction?.currentCharacterId);
  assert.equal(startedState.auction?.currentBidCents, 0);

  const lockedSeriesChange = await emitWithAck(host, 'room:set-series', {
    roomCode,
    playerId: hostPlayerId,
    series: 'BLACK_CLOVER'
  });
  assert.equal(lockedSeriesChange.ok, false);

  const firstBidStatePromise = nextRoomState(host);
  const firstBidResponse = await emitWithAck(reconnectedGuest, 'auction:bid', {
    roomCode,
    playerId: guestPlayerId,
    amountCents: 100
  });
  assert.deepEqual(firstBidResponse, { ok: true });
  const firstBidState = await firstBidStatePromise;
  assert.equal(firstBidState.auction?.leadingPlayerId, guestPlayerId);
  assert.equal(firstBidState.auction?.currentBidCents, 100);
  assert.equal(firstBidState.players.find((player) => player.playerId === guestPlayerId)?.balanceCents, 5900);

  const reserveFailure = await emitWithAck(host, 'auction:bid', {
    roomCode,
    playerId: hostPlayerId,
    amountCents: 5450
  });
  assert.equal(reserveFailure.ok, false);
  if (!reserveFailure.ok) {
    assert.match(reserveFailure.error, /Reserve/);
  }

  const outbidStatePromise = nextRoomState(host);
  const outbidResponse = await emitWithAck(host, 'auction:bid', {
    roomCode,
    playerId: hostPlayerId,
    amountCents: 5400
  });
  assert.deepEqual(outbidResponse, { ok: true });
  const outbidState = await outbidStatePromise;
  assert.equal(outbidState.auction?.leadingPlayerId, hostPlayerId);
  assert.equal(outbidState.players.find((player) => player.playerId === hostPlayerId)?.balanceCents, 600);
  assert.equal(outbidState.players.find((player) => player.playerId === guestPlayerId)?.balanceCents, 6000);

  const hostPassResponse = await emitWithAck(host, 'auction:pass', {
    roomCode,
    playerId: hostPlayerId
  });
  assert.equal(hostPassResponse.ok, false);

  const guestPassStatePromise = nextRoomState(host);
  const guestPassResponse = await emitWithAck(reconnectedGuest, 'auction:pass', {
    roomCode,
    playerId: guestPlayerId
  });
  assert.deepEqual(guestPassResponse, { ok: true });
  const guestPassState = await guestPassStatePromise;
  assert.ok(guestPassState.auction?.passedPlayerIds.includes(guestPlayerId));

  const passedBidResponse = await emitWithAck(reconnectedGuest, 'auction:bid', {
    roomCode,
    playerId: guestPlayerId,
    amountCents: 5450
  });
  assert.equal(passedBidResponse.ok, false);

  const hostLeadingBidResponse = await emitWithAck(host, 'auction:bid', {
    roomCode,
    playerId: hostPlayerId,
    amountCents: 5450
  });
  assert.equal(hostLeadingBidResponse.ok, false);

  const reviewRoom = await gameServer.roomStore.get(roomCode);
  assert.ok(reviewRoom);
  reviewRoom.phase = 'TEAM_REVIEW';
  reviewRoom.auction = null;
  reviewRoom.players[0].team = ROSTER.slice(0, 7).map(({ id }) => ({
    characterId: id,
    priceCents: 0
  }));
  reviewRoom.players[1].team = ROSTER.slice(7, 14).map(({ id }) => ({
    characterId: id,
    priceCents: 0
  }));
  await gameServer.roomStore.save(reviewRoom);

  const guestBattleResponse = await emitWithAck(reconnectedGuest, 'battle:start', {
    roomCode,
    playerId: guestPlayerId,
    scenario: 'STANDARD'
  });
  assert.equal(guestBattleResponse.ok, false);

  const battleStatePromise = nextRoomState(host);
  const battleResponse = await emitWithAck(host, 'battle:start', {
    roomCode,
    playerId: hostPlayerId,
    scenario: 'STANDARD'
  });
  assert.deepEqual(battleResponse, { ok: true });
  const battleState = await battleStatePromise;
  assert.equal(battleState.phase, 'RESULT');
  assert.equal(battleState.battleResult?.scenario, 'STANDARD');
  assert.equal(
    battleState.battleResult?.scenarioAnalyses.find(({ scenario }) => scenario === 'STANDARD')?.scores.length,
    2
  );
  assert.ok(battleState.battleResult?.winnerPlayerId);
  assert.equal(battleState.battleSeed, battleState.battleResult?.seed);

  const invalidScenarioResponse = await emitWithAck(host, 'battle:start', {
    roomCode,
    playerId: hostPlayerId,
    scenario: 'UNKNOWN'
  });
  assert.equal(invalidScenarioResponse.ok, false);

  const rematchStatePromise = nextRoomState(host);
  const rematchResponse = await emitWithAck(host, 'battle:start', {
    roomCode,
    playerId: hostPlayerId,
    scenario: 'DEATHMATCH'
  });
  assert.deepEqual(rematchResponse, { ok: true });
  const rematchState = await rematchStatePromise;
  assert.equal(rematchState.battleResult?.scenario, 'DEATHMATCH');
  const deathmatchScores = rematchState.battleResult?.scenarioAnalyses.find(
    ({ scenario }) => scenario === 'DEATHMATCH'
  )?.scores;
  assert.ok(deathmatchScores?.every((score) => (
    Array.isArray(score.synergyBreakdown)
    && Array.isArray(score.counterBreakdown)
    && Array.isArray(score.scenarioBreakdown)
  )));

  const lobbyStatePromise = nextRoomState(host);
  const restartAuctionResponse = await emitWithAck(host, 'auction:restart', {
    roomCode,
    playerId: hostPlayerId
  });
  assert.deepEqual(restartAuctionResponse, { ok: true });
  const lobbyState = await lobbyStatePromise;
  assert.equal(lobbyState.phase, 'LOBBY');
  assert.equal(lobbyState.series, 'NARUTO');
  assert.equal(lobbyState.auction, null);
  assert.equal(lobbyState.battleResult, null);
  assert.equal(lobbyState.battleSeed, null);
  assert.ok(lobbyState.players.every((player) => (
    player.team.length === 0 && player.balanceCents === 6000
  )));
});

test('leaving a live room awards a forfeit, clears socket membership, and allows the quitter to create another room', async () => {
  const host = await connectClient();
  const createResponse = await emitWithAck<CreateRoomResult>(host, 'room:create', {
    playerName: 'Host',
    series: 'ONE_PIECE'
  });
  assert.ok(createResponse.ok && createResponse.data);
  const { roomCode, playerId: hostPlayerId } = createResponse.data;

  const guest = await connectClient();
  const joinResponse = await emitWithAck<JoinRoomResult>(guest, 'room:join', {
    roomCode,
    playerName: 'Guest'
  });
  assert.ok(joinResponse.ok && joinResponse.data);
  const guestPlayerId = joinResponse.data.playerId;

  assert.deepEqual(await emitWithAck(host, 'lobby:set-ready', {
    roomCode,
    playerId: hostPlayerId,
    ready: true
  }), { ok: true });
  assert.deepEqual(await emitWithAck(guest, 'lobby:set-ready', {
    roomCode,
    playerId: guestPlayerId,
    ready: true
  }), { ok: true });

  const hostRoomState = nextRoomState(host);
  const startResponse = await emitWithAck(host, 'auction:start', { roomCode, playerId: hostPlayerId });
  assert.deepEqual(startResponse, { ok: true });
  await hostRoomState;

  const forfeitStatePromise = nextRoomState(host);
  const leaveResponse = await emitWithAck(guest, 'room:leave', { roomCode, playerId: guestPlayerId });
  assert.deepEqual(leaveResponse, { ok: true });
  const forfeitState = await forfeitStatePromise;
  assert.equal(forfeitState.phase, 'RESULT');
  assert.equal(forfeitState.forfeitWinnerPlayerId, hostPlayerId);
  assert.match(forfeitState.forfeitMessage ?? '', /Guest saiu da partida/);
  assert.deepEqual(forfeitState.players.map(({ playerId }) => playerId), [hostPlayerId]);

  const nextCreateState = nextRoomState(guest);
  const secondCreate = await emitWithAck<CreateRoomResult>(guest, 'room:create', {
    playerName: 'Guest',
    series: 'NARUTO'
  });
  assert.ok(secondCreate.ok && secondCreate.data);
  assert.notEqual(secondCreate.data.roomCode, roomCode);
  assert.equal((await nextCreateState).series, 'NARUTO');

  assert.deepEqual(await emitWithAck(host, 'room:leave', {
    roomCode,
    playerId: hostPlayerId
  }), { ok: true });
  assert.equal(await gameServer.roomStore.get(roomCode), null);
});

test('leaving the lobby transfers host authority to the remaining player', async () => {
  const host = await connectClient();
  const createResponse = await emitWithAck<CreateRoomResult>(host, 'room:create', {
    playerName: 'Host',
    series: 'BLACK_CLOVER'
  });
  assert.ok(createResponse.ok && createResponse.data);
  const { roomCode, playerId: hostPlayerId } = createResponse.data;

  const guest = await connectClient();
  const joinResponse = await emitWithAck<JoinRoomResult>(guest, 'room:join', {
    roomCode,
    playerName: 'Guest'
  });
  assert.ok(joinResponse.ok && joinResponse.data);
  const guestPlayerId = joinResponse.data.playerId;

  const lobbyStatePromise = nextRoomState(guest);
  const leaveResponse = await emitWithAck(host, 'room:leave', { roomCode, playerId: hostPlayerId });
  assert.deepEqual(leaveResponse, { ok: true });
  const lobbyState = await lobbyStatePromise;
  assert.equal(lobbyState.phase, 'LOBBY');
  assert.equal(lobbyState.hostPlayerId, guestPlayerId);
  assert.deepEqual(lobbyState.players.map(({ playerId }) => playerId), [guestPlayerId]);

  const secondRoomResponse = await emitWithAck<CreateRoomResult>(host, 'room:create', {
    playerName: 'Host',
    series: 'NARUTO'
  });
  assert.ok(secondRoomResponse.ok && secondRoomResponse.data);
  assert.notEqual(secondRoomResponse.data.roomCode, roomCode);
});
