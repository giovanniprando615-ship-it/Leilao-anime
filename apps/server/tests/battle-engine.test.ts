import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BattleEngine, BattleRuleError } from '../src/battle-engine.js';
import type { BattleScenario, CharacterId } from '@leilao/shared';
import type { StoredRoom } from '../src/room-store.js';

const teamA: CharacterId[] = ['asta', 'yuno', 'julius', 'zenon', 'dante', 'law', 'mihawk'];
const teamB: CharacterId[] = ['lucifero', 'sanji', 'luffy', 'nami', 'robin', 'kaido', 'zoro'];

function createReviewRoom(): StoredRoom {
  return {
    roomCode: 'ABCDE',
    series: 'BLACK_CLOVER',
    phase: 'TEAM_REVIEW',
    hostPlayerId: 'host',
    players: [
      {
        playerId: 'host',
        name: 'Host',
        connected: true,
        balanceCents: 0,
        team: teamA.map((characterId) => ({ characterId, priceCents: 0 }))
      },
      {
        playerId: 'guest',
        name: 'Guest',
        connected: true,
        balanceCents: 0,
        team: teamB.map((characterId) => ({ characterId, priceCents: 0 }))
      }
    ],
    auction: null,
    battleResult: null,
    lastActivityAt: 0
  };
}

test('reports pair and group synergies, directional hard counters, and deathmatch adjustments', () => {
  const standardRoom = createReviewRoom();
  const standardResult = new BattleEngine(() => 0).simulate(standardRoom, 'STANDARD', 1234);
  const standardA = standardResult.scores[0];
  const standardB = standardResult.scores[1];

  assert.equal(standardA.synergy, 16);
  assert.deepEqual(standardA.synergyBreakdown, [{ id: 'pair:asta+yuno', points: 16 }]);
  assert.equal(standardA.counters, 47);
  assert.equal(standardA.counterBreakdown.reduce((sum, modifier) => sum + modifier.points, 0), 47);
  assert.equal(standardB.synergy, 20);
  assert.ok(standardB.synergyBreakdown.some((modifier) => modifier.id === 'group:straw-hats'));
  assert.equal(standardA.scenario, 0);
  assert.equal(standardResult.winnerPlayerId, 'host');
  assert.equal(standardResult.calculatedAt, 1234);
  assert.ok(Math.abs(standardA.winProbability + standardB.winProbability - 1) < 1e-12);

  const deathmatchRoom = createReviewRoom();
  const deathmatchResult = new BattleEngine(() => 0).simulate(deathmatchRoom, 'DEATHMATCH');
  const deathmatchA = deathmatchResult.scores[0];
  const deathmatchB = deathmatchResult.scores[1];
  assert.equal(deathmatchA.scenario, -5);
  assert.equal(deathmatchB.scenario, -14);
  assert.deepEqual(deathmatchA.scenarioBreakdown, [
    { id: 'regen-vs-exhaustion', points: 7 },
    { id: 'exhaustion', points: -12 }
  ]);
  assert.ok(deathmatchA.base !== standardA.base);
});

test('uses the computed probability to choose the winner and permits rematches', () => {
  const firstRoom = createReviewRoom();
  const firstResult = new BattleEngine(() => 0).simulate(firstRoom, 'STANDARD');
  const probabilityA = firstResult.scores[0].winProbability;
  assert.ok(probabilityA > 0 && probabilityA < 1);

  const anotherRoom = createReviewRoom();
  const secondResult = new BattleEngine(() => probabilityA + (1 - probabilityA) / 2)
    .simulate(anotherRoom, 'STANDARD');
  assert.equal(firstResult.winnerPlayerId, 'host');
  assert.equal(secondResult.winnerPlayerId, 'guest');

  const rematch = new BattleEngine(() => 0.5).simulate(anotherRoom, 'DEATHMATCH');
  assert.equal(rematch.scenario, 'DEATHMATCH');
  assert.equal(anotherRoom.phase, 'RESULT');
  assert.equal(anotherRoom.battleResult, rematch);
});

test('rejects a battle without complete teams', () => {
  const room = createReviewRoom();
  room.players[0].team.pop();
  assert.throws(
    () => new BattleEngine().simulate(room, 'STANDARD' satisfies BattleScenario),
    BattleRuleError
  );
});
