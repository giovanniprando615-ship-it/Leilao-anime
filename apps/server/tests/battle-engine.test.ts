import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BattleScenario, CharacterId } from '@leilao/shared';
import { BattleEngine, BattleRuleError } from '../src/battle-engine.js';
import type { StoredRoom } from '../src/room-store.js';

function createReviewRoom(teamA: CharacterId[] = [], teamB: CharacterId[] = []): StoredRoom {
  return {
    roomCode: 'ABCDE',
    series: 'BLACK_CLOVER',
    phase: 'TEAM_REVIEW',
    hostPlayerId: 'host',
    forfeitWinnerPlayerId: null,
    forfeitMessage: null,
    forfeitAt: null,
    players: [
      {
        playerId: 'host',
        name: 'Host',
        connected: true,
        ready: false,
        balanceCents: 0,
        team: teamA.map((characterId) => ({ characterId, priceCents: 0 }))
      },
      {
        playerId: 'guest',
        name: 'Guest',
        connected: true,
        ready: false,
        balanceCents: 0,
        team: teamB.map((characterId) => ({ characterId, priceCents: 0 }))
      }
    ],
    auction: null,
    battleResult: null,
    battleSeed: null,
    lastActivityAt: 0
  };
}

function getScenario(
  result: ReturnType<BattleEngine['simulate']>,
  scenario: BattleScenario
) {
  const analysis = result.scenarioAnalyses.find((candidate) => candidate.scenario === scenario);
  assert.ok(analysis);
  return analysis;
}

test('calculates complementary probabilities for each scenario and averages them evenly', () => {
  const result = new BattleEngine().simulate(
    createReviewRoom(['asta', 'yuno', 'julius'], ['lucifero', 'luffy']),
    'STANDARD',
    42,
    1234
  );

  assert.deepEqual(result.scenarioAnalyses.map(({ scenario }) => scenario), ['STANDARD', 'DEATHMATCH']);
  for (const analysis of result.scenarioAnalyses) {
    assert.equal(analysis.scores.length, 2);
    assert.equal(analysis.drawProbability, 0);
    const combined = analysis.scores.reduce((sum, score) => sum + score.winProbability, analysis.drawProbability);
    assert.ok(Math.abs(combined - 1) < 1e-12);
  }
  for (const overall of result.overallProbabilities) {
    const arithmeticMean = result.scenarioAnalyses.reduce(
      (sum, analysis) => sum + analysis.scores.find((score) => score.playerId === overall.playerId)!.winProbability,
      0
    ) / result.scenarioAnalyses.length;
    assert.ok(Math.abs(overall.probability - arithmeticMean) < 1e-12);
  }
  assert.equal(result.calculatedAt, 1234);
  assert.equal(result.seed, 42);
});

test('accepts empty and incomplete teams without phantom modifiers or invalid scores', () => {
  const empty = new BattleEngine().simulate(createReviewRoom(), 'STANDARD', 0);
  for (const analysis of empty.scenarioAnalyses) {
    for (const score of analysis.scores) {
      assert.equal(score.base, 0);
      assert.equal(score.synergy, 0);
      assert.equal(score.counters, 0);
      assert.equal(score.scenario, 0);
      assert.equal(score.winProbability, 0.5);
      assert.ok(Number.isFinite(score.total));
    }
  }

  const incomplete = new BattleEngine().simulate(createReviewRoom(['asta'], []), 'STANDARD', 1);
  const standard = getScenario(incomplete, 'STANDARD');
  assert.equal(standard.scores[0].synergyBreakdown.length, 0);
  assert.equal(standard.scores[1].synergyBreakdown.length, 0);
  assert.ok(standard.scores[0].winProbability > 0.5);

  const mixedSeries = new BattleEngine().simulate(
    createReviewRoom(['luffy', 'asta'], ['nami', 'lucifero']),
    'STANDARD',
    2
  );
  assert.ok(getScenario(mixedSeries, 'STANDARD').scores.every((score) => Number.isFinite(score.total)));
});

test('identical teams including duplicate entries produce a 50/50 result', () => {
  const team: CharacterId[] = ['luffy', 'luffy', 'zoro'];
  const result = new BattleEngine().simulate(createReviewRoom(team, team), 'DEATHMATCH', 8);
  for (const analysis of result.scenarioAnalyses) {
    assert.equal(analysis.scores[0].winProbability, 0.5);
    assert.equal(analysis.scores[1].winProbability, 0.5);
  }
});

test('strong roster advantage shifts the probability toward the stronger team', () => {
  const result = new BattleEngine().simulate(
    createReviewRoom(['luffy', 'kaido', 'whitebeard'], ['nami']),
    'STANDARD',
    3
  );
  assert.ok(getScenario(result, 'STANDARD').scores[0].winProbability > 0.95);
});

test('applies hard counters only against present enemy tags and reports probability impact', () => {
  const result = new BattleEngine().simulate(
    createReviewRoom(['asta', 'yuno'], ['lucifero']),
    'STANDARD',
    17
  );
  const analysis = getScenario(result, 'STANDARD');
  const host = analysis.scores[0];
  assert.ok(host.counterBreakdown.some((modifier) => modifier.id === 'devil-bane-vs-devil'));
  assert.ok(host.counterBreakdown.some((modifier) => modifier.id === 'antimagic-vs-devil'));
  assert.ok(host.counterBreakdown.every((modifier) => modifier.probabilityChange > 0));
});

test('does not activate a pair synergy unless both characters are actually present', () => {
  const withoutPair = new BattleEngine().simulate(createReviewRoom(['asta'], ['nami']), 'STANDARD', 5);
  const withPair = new BattleEngine().simulate(createReviewRoom(['asta', 'yuno'], ['nami']), 'STANDARD', 5);
  assert.equal(getScenario(withoutPair, 'STANDARD').scores[0].synergyBreakdown.length, 0);
  assert.ok(getScenario(withPair, 'STANDARD').scores[0].synergyBreakdown.some(
    (modifier) => modifier.id === 'pair:asta+yuno'
  ));
});

test('same seed and inputs reproduce all probabilities and the selected winner', () => {
  const engine = new BattleEngine();
  const first = engine.simulate(createReviewRoom(['asta', 'yuno'], ['lucifero']), 'STANDARD', 123456, 99);
  const second = engine.simulate(createReviewRoom(['asta', 'yuno'], ['lucifero']), 'STANDARD', 123456, 99);
  assert.deepEqual(first, second);
  assert.equal(first.seed, 123456);
});

test('winner frequency converges toward the calculated probability over 10,000 seeded runs', () => {
  const engine = new BattleEngine();
  const room = createReviewRoom(['luffy', 'law', 'zoro'], ['nami', 'usopp']);
  const expected = getScenario(engine.simulate(room, 'STANDARD', 0), 'STANDARD').scores[0].winProbability;
  let hostWins = 0;
  const simulations = 10_000;

  for (let seed = 0; seed < simulations; seed += 1) {
    const result = engine.simulate(room, 'STANDARD', seed);
    if (result.winnerPlayerId === 'host') {
      hostWins += 1;
    }
  }

  assert.ok(Math.abs(hostWins / simulations - expected) < 0.02);
});

test('rejects invalid battle seeds and unknown character IDs', () => {
  assert.throws(
    () => new BattleEngine().simulate(createReviewRoom(), 'STANDARD', -1),
    BattleRuleError
  );
  assert.throws(
    () => new BattleEngine().simulate(createReviewRoom(['unknown' as CharacterId]), 'STANDARD', 1),
    BattleRuleError
  );
});
