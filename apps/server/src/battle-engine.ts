import { GAME_RULES, ROSTER } from '@leilao/shared';
import type {
  BattleModifier,
  BattleResult,
  BattleScenario,
  BattleScenarioAnalysis,
  BattleScoreBreakdown,
  CharacterTag
} from '@leilao/shared';
import type { StoredRoom } from './room-store.js';

export class BattleRuleError extends Error {}

const charactersById = new Map(ROSTER.map((character) => [character.id, character]));
const BATTLE_SCENARIOS = ['STANDARD', 'DEATHMATCH'] as const satisfies readonly BattleScenario[];
const MAX_SEED = 0xffff_ffff;

type BattleCharacter = (typeof ROSTER)[number];
type TeamScore = Omit<BattleScoreBreakdown, 'winProbability'>;

function countTag(characters: readonly BattleCharacter[], tag: CharacterTag): number {
  return characters.filter((character) => character.tags.includes(tag)).length;
}

function sumModifiers(modifiers: readonly BattleModifier[]): number {
  return modifiers.reduce((sum, modifier) => sum + modifier.points, 0);
}

function calculateBaseScore(characters: readonly BattleCharacter[], scenario: BattleScenario): number {
  if (characters.length === 0) {
    return 0;
  }
  const weights = GAME_RULES.scenarios[scenario].weights;
  return characters.reduce(
    (total, character) => total
      + character.power * weights.power
      + character.speed * weights.speed
      + character.resistance * weights.resistance,
    0
  ) / characters.length;
}

function calculateSynergy(characters: readonly BattleCharacter[]): BattleModifier[] {
  const characterIds = new Set(characters.map((character) => character.id));
  const modifiers: BattleModifier[] = [];

  for (const rule of GAME_RULES.synergies.pairs) {
    if (rule.characterIds.every((characterId) => characterIds.has(characterId))) {
      modifiers.push({
        id: `pair:${rule.characterIds.join('+')}`,
        points: rule.bonus,
        probabilityChange: 0
      });
    }
  }

  const groupCounts = new Map<string, number>();
  for (const character of characters) {
    for (const group of character.groups) {
      groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    }
  }
  for (const [group, count] of groupCounts) {
    if (count >= GAME_RULES.synergies.groups.minimumMembers) {
      modifiers.push({
        id: `group:${group}`,
        points: count * GAME_RULES.synergies.groups.bonusPerMember,
        probabilityChange: 0
      });
    }
  }

  return modifiers;
}

function calculateCounters(
  characters: readonly BattleCharacter[],
  opponents: readonly BattleCharacter[]
): BattleModifier[] {
  if (GAME_RULES.counters.tagBonusCountMode !== 'minimum-of-friendly-and-enemy-tag-counts') {
    throw new Error(`Unsupported tag counter mode: ${GAME_RULES.counters.tagBonusCountMode}.`);
  }

  return GAME_RULES.counters.tagMatches.flatMap((rule) => {
    const matches = Math.min(
      countTag(characters, rule.friendlyTag),
      countTag(opponents, rule.enemyTag)
    );
    return matches > 0
      ? [{ id: rule.id, points: matches * rule.bonusPerMatch, probabilityChange: 0 }]
      : [];
  });
}

function calculateScenarioModifiers(
  characters: readonly BattleCharacter[],
  scenario: BattleScenario
): BattleModifier[] {
  const scenarioRules = GAME_RULES.scenarios[scenario];
  const modifiers: BattleModifier[] = [];
  if (scenarioRules.baseModifier !== 0) {
    modifiers.push({ id: 'scenario-base', points: scenarioRules.baseModifier, probabilityChange: 0 });
  }

  for (const rule of GAME_RULES.counters.scenarioMatches) {
    if (rule.scenario !== scenario) {
      continue;
    }
    const count = countTag(characters, rule.friendlyTag);
    if (count > 0) {
      modifiers.push({
        id: rule.id,
        points: count * rule.bonusPerCharacter,
        probabilityChange: 0
      });
    }
  }

  if ('exhaustionPenaltyPerCharacter' in scenarioRules) {
    const exhaustedCount = characters.filter(
      (character) => !character.tags.includes(scenarioRules.exhaustionImmunityTag)
    ).length;
    if (exhaustedCount > 0) {
      modifiers.push({
        id: scenarioRules.exhaustionModifierId,
        points: -exhaustedCount * scenarioRules.exhaustionPenaltyPerCharacter,
        probabilityChange: 0
      });
    }
  }

  return modifiers;
}

function calculateTeamScore(
  playerId: string,
  ownCharacters: readonly BattleCharacter[],
  enemyCharacters: readonly BattleCharacter[],
  scenario: BattleScenario
): TeamScore {
  const synergyBreakdown = calculateSynergy(ownCharacters);
  const counterBreakdown = calculateCounters(ownCharacters, enemyCharacters);
  const scenarioBreakdown = calculateScenarioModifiers(ownCharacters, scenario);
  const base = calculateBaseScore(ownCharacters, scenario);
  const synergy = sumModifiers(synergyBreakdown);
  const counters = sumModifiers(counterBreakdown);
  const scenarioScore = sumModifiers(scenarioBreakdown);

  return {
    playerId,
    base,
    synergy,
    counters,
    scenario: scenarioScore,
    total: base + synergy + counters + scenarioScore,
    synergyBreakdown,
    counterBreakdown,
    scenarioBreakdown
  };
}

function probabilityFromDifference(difference: number, scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Battle probability scale must be a finite positive number.');
  }
  const exponent = difference / scale;
  if (exponent >= 60) {
    return 1;
  }
  if (exponent <= -60) {
    return 0;
  }
  return 1 / (1 + Math.exp(-exponent));
}

function withProbabilityImpacts(
  modifiers: readonly BattleModifier[],
  ownTotal: number,
  opponentTotal: number,
  scale: number
): BattleModifier[] {
  const ownWinProbability = probabilityFromDifference(ownTotal - opponentTotal, scale);
  return modifiers.map((modifier) => ({
    ...modifier,
    probabilityChange: ownWinProbability
      - probabilityFromDifference(ownTotal - modifier.points - opponentTotal, scale)
  }));
}

function withTeamProbability(
  score: TeamScore,
  opponent: TeamScore,
  winProbability: number,
  scale: number
): BattleScoreBreakdown {
  return {
    ...score,
    winProbability,
    synergyBreakdown: withProbabilityImpacts(score.synergyBreakdown, score.total, opponent.total, scale),
    counterBreakdown: withProbabilityImpacts(score.counterBreakdown, score.total, opponent.total, scale),
    scenarioBreakdown: withProbabilityImpacts(score.scenarioBreakdown, score.total, opponent.total, scale)
  };
}

function analyzeScenario(
  playerIds: readonly [string, string],
  teams: readonly [readonly BattleCharacter[], readonly BattleCharacter[]],
  scenario: BattleScenario
): BattleScenarioAnalysis {
  const teamA = calculateTeamScore(playerIds[0], teams[0], teams[1], scenario);
  const teamB = calculateTeamScore(playerIds[1], teams[1], teams[0], scenario);
  const probabilityA = probabilityFromDifference(
    teamA.total - teamB.total,
    GAME_RULES.scenarios[scenario].probabilityScale
  );
  return {
    scenario,
    scores: [
      withTeamProbability(teamA, teamB, probabilityA, GAME_RULES.scenarios[scenario].probabilityScale),
      withTeamProbability(teamB, teamA, 1 - probabilityA, GAME_RULES.scenarios[scenario].probabilityScale)
    ],
    drawProbability: 0
  };
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

export class BattleEngine {
  simulate(
    room: StoredRoom,
    scenario: BattleScenario,
    seed: number,
    now = Date.now()
  ): BattleResult {
    if (!BATTLE_SCENARIOS.includes(scenario)) {
      throw new BattleRuleError('Cenário de batalha inválido.');
    }
    if (room.phase !== 'TEAM_REVIEW' && room.phase !== 'RESULT') {
      throw new BattleRuleError('A batalha só pode começar após a revisão dos times.');
    }
    if (room.players.length !== 2) {
      throw new BattleRuleError('A sala precisa ter exatamente dois jogadores.');
    }
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > MAX_SEED) {
      throw new BattleRuleError('A seed da batalha deve ser um inteiro de 32 bits sem sinal.');
    }

    const teams = room.players.map((player) => player.team.map(({ characterId }) => {
      const character = charactersById.get(characterId);
      if (!character) {
        throw new BattleRuleError('O time contém um personagem fora do roster.');
      }
      return character;
    })) as [BattleCharacter[], BattleCharacter[]];
    const playerIds = [room.players[0].playerId, room.players[1].playerId] as const;
    const scenarioAnalyses = BATTLE_SCENARIOS.map(
      (battleScenario) => analyzeScenario(playerIds, teams, battleScenario)
    );
    const overallProbabilities = playerIds.map((playerId, playerIndex) => ({
      playerId,
      probability: scenarioAnalyses.reduce(
        (sum, analysis) => sum + analysis.scores[playerIndex].winProbability,
        0
      ) / scenarioAnalyses.length
    }));
    const selectedAnalysis = scenarioAnalyses.find((analysis) => analysis.scenario === scenario);
    if (!selectedAnalysis) {
      throw new Error(`Missing probability analysis for ${scenario}.`);
    }

    const randomValue = createSeededRandom(seed)();
    const result: BattleResult = {
      scenario,
      winnerPlayerId: randomValue < selectedAnalysis.scores[0].winProbability
        ? playerIds[0]
        : playerIds[1],
      seed,
      calculatedAt: now,
      scenarioAnalyses,
      overallProbabilities
    };

    room.phase = 'RESULT';
    room.forfeitWinnerPlayerId = null;
    room.forfeitMessage = null;
    room.forfeitAt = null;
    room.battleSeed = seed;
    room.battleResult = result;
    return result;
  }
}
