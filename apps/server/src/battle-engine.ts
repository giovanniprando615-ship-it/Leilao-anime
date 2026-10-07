import { GAME_RULES, ROSTER } from '@leilao/shared';
import type { BattleScenario, CharacterTag } from '@leilao/shared';
import type { BattleModifier, BattleResult, BattleScoreBreakdown } from '@leilao/shared';
import type { StoredRoom } from './room-store.js';

export class BattleRuleError extends Error {}

const charactersById = new Map(ROSTER.map((character) => [character.id, character]));

type BattleCharacter = (typeof ROSTER)[number];

function countTag(characters: readonly BattleCharacter[], tag: CharacterTag): number {
  return characters.filter((character) => character.tags.includes(tag)).length;
}

function sumModifiers(modifiers: readonly BattleModifier[]): number {
  return modifiers.reduce((sum, modifier) => sum + modifier.points, 0);
}

function calculateBaseScore(characters: readonly BattleCharacter[], scenario: BattleScenario): number {
  const weights = GAME_RULES.scenarios[scenario].weights;
  const weightedTotal = characters.reduce(
    (total, character) => total
      + character.power * weights.power
      + character.speed * weights.speed
      + character.resistance * weights.resistance,
    0
  );
  return weightedTotal / characters.length;
}

function calculateSynergy(characters: readonly BattleCharacter[]): BattleModifier[] {
  const characterIds = new Set(characters.map((character) => character.id));
  const modifiers: BattleModifier[] = [];

  for (const rule of GAME_RULES.synergies.pairs) {
    if (rule.characterIds.every((characterId) => characterIds.has(characterId))) {
      modifiers.push({
        id: `pair:${rule.characterIds.join('+')}`,
        points: rule.bonus
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
        points: count * GAME_RULES.synergies.groups.bonusPerMember
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
      ? [{ id: rule.id, points: matches * rule.bonusPerMatch }]
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
    modifiers.push({ id: 'scenario-base', points: scenarioRules.baseModifier });
  }

  for (const rule of GAME_RULES.counters.scenarioMatches) {
    if (rule.scenario !== scenario) {
      continue;
    }
    const count = countTag(characters, rule.friendlyTag);
    if (count > 0) {
      modifiers.push({ id: rule.id, points: count * rule.bonusPerCharacter });
    }
  }

  if ('exhaustionPenaltyPerCharacter' in scenarioRules) {
    const immunityTag = scenarioRules.exhaustionImmunityTag;
    const exhaustedCount = characters.filter(
      (character) => !character.tags.includes(immunityTag)
    ).length;
    if (exhaustedCount > 0) {
      modifiers.push({
        id: scenarioRules.exhaustionModifierId,
        points: -exhaustedCount * scenarioRules.exhaustionPenaltyPerCharacter
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
): Omit<BattleScoreBreakdown, 'winProbability'> {
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

export class BattleEngine {
  constructor(private readonly random: () => number = Math.random) {}

  simulate(
    room: StoredRoom,
    scenario: BattleScenario,
    now = Date.now()
  ): BattleResult {
    if (scenario !== 'STANDARD' && scenario !== 'DEATHMATCH') {
      throw new BattleRuleError('Cenário de batalha inválido.');
    }
    if (room.phase !== 'TEAM_REVIEW' && room.phase !== 'RESULT') {
      throw new BattleRuleError('A batalha só pode começar após a revisão dos times.');
    }
    if (room.players.length !== 2) {
      throw new BattleRuleError('A sala precisa ter exatamente dois jogadores.');
    }

    const playerTeams = room.players.map((player) => {
      if (player.team.length !== GAME_RULES.teamSize) {
        throw new BattleRuleError(`Cada jogador precisa ter ${GAME_RULES.teamSize} personagens.`);
      }
      const ids = player.team.map(({ characterId }) => characterId);
      if (new Set(ids).size !== ids.length) {
        throw new BattleRuleError('Um time não pode conter personagens repetidos.');
      }

      const characters: BattleCharacter[] = [];
      for (const characterId of ids) {
        const character = charactersById.get(characterId);
        if (!character) {
          throw new BattleRuleError('O time contém um personagem fora do roster.');
        }
        characters.push(character);
      }
      return characters;
    });

    const scenarioRules = GAME_RULES.scenarios[scenario];
    const teamA = calculateTeamScore(
      room.players[0].playerId,
      playerTeams[0],
      playerTeams[1],
      scenario
    );
    const teamB = calculateTeamScore(
      room.players[1].playerId,
      playerTeams[1],
      playerTeams[0],
      scenario
    );
    const probabilityA = probabilityFromDifference(
      teamA.total - teamB.total,
      scenarioRules.probabilityScale
    );
    const randomValue = this.random();
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
      throw new Error('Battle random source must return a number in the range [0, 1).');
    }

    const scores: BattleScoreBreakdown[] = [
      { ...teamA, winProbability: probabilityA },
      { ...teamB, winProbability: 1 - probabilityA }
    ];
    const result: BattleResult = {
      scenario,
      winnerPlayerId: randomValue < probabilityA
        ? room.players[0].playerId
        : room.players[1].playerId,
      calculatedAt: now,
      scores
    };

    room.phase = 'RESULT';
    room.battleResult = result;
    return result;
  }
}
