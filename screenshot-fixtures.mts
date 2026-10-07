import { createGameServer } from './apps/server/src/server.js';
import { ROSTER } from './packages/shared/src/roster.js';
import type { CharacterId, RoomPhase, RoomPlayer } from './packages/shared/src/index.js';
import { BattleEngine } from './apps/server/src/battle-engine.js';
import type { StoredRoom } from './apps/server/src/room-store.js';

const app = createGameServer();
const now = Date.now();
const naruto = ROSTER.filter((character) => character.series === 'NARUTO');

function makePlayer(playerId: string, name: string, ids: CharacterId[], balanceCents: number): RoomPlayer {
  return {
    playerId,
    name,
    connected: true,
    ready: true,
    balanceCents,
    team: ids.map((characterId, index) => ({ characterId, priceCents: index ? 250 : 300 }))
  };
}

function roomBase(roomCode: string, phase: RoomPhase, players: RoomPlayer[]): StoredRoom {
  return {
    roomCode,
    series: 'NARUTO',
    phase,
    hostPlayerId: players[0].playerId,
    forfeitWinnerPlayerId: null,
    forfeitMessage: null,
    forfeitAt: null,
    players,
    auction: null,
    battleResult: null,
    battleSeed: null,
    lastActivityAt: now
  };
}

void (async () => {
  const auctionRoom = roomBase('AUCTN', 'AUCTION', [
    makePlayer('host-auct', 'Mika', naruto.slice(0, 2).map(({ id }) => id), 5450),
    makePlayer('guest-auct', 'Rival', naruto.slice(2, 4).map(({ id }) => id), 5450)
  ]);
  auctionRoom.auction = {
    round: 1,
    currentCharacterId: naruto[8].id,
    queueCharacterIds: naruto.slice(9).map(({ id }) => id),
    currentBidCents: 350,
    leadingPlayerId: 'guest-auct',
    passedPlayerIds: [],
    endsAt: now + 15_000,
    nextCharacterAt: null,
    lastSale: null,
    unsoldCharacterIds: []
  };

  const battleRoom = roomBase('BATAL', 'TEAM_REVIEW', [
    makePlayer('host-batl', 'Mika', ['asta', 'yuno', 'julius', 'zenon'], 0),
    makePlayer('guest-batl', 'Rival', ['lucifero', 'luffy', 'nami'], 0)
  ]);
  new BattleEngine().simulate(battleRoom, 'STANDARD', 0x1234_5678, now);

  await app.roomStore.save(auctionRoom);
  await app.roomStore.save(battleRoom);
  app.httpServer.listen(3001, () => console.log('Screenshot fixtures ready on port 3001'));
})();
