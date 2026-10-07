import type { CharacterId, CharacterTag } from './roster.js';

export interface PairSynergyRule {
  characterIds: readonly [CharacterId, CharacterId];
  bonus: number;
}

export interface GroupSynergyRule {
  minimumMembers: number;
  bonusPerMember: number;
}

export interface TagCounterRule {
  id: string;
  friendlyTag: CharacterTag;
  enemyTag: CharacterTag;
  bonusPerMatch: number;
}

export interface ScenarioCounterRule {
  id: string;
  scenario: 'DEATHMATCH';
  friendlyTag: CharacterTag;
  bonusPerCharacter: number;
}

export const GAME_RULES = {
  rosterSize: 64,
  teamSize: 7,
  startingBalanceCents: 6000,
  minimumBidCents: 100,
  bidIncrementCents: 50,
  characterOpeningDurationMs: 15_000,
  antiSnipeMinimumRemainingMs: 10_000,
  interCharacterDelayMs: 2_500,
  roomInactivityExpirationMs: 60 * 60 * 1_000,
  auctionRounds: 2,
  randomizeAuctionOrder: true,
  fillUnsoldCharactersForFree: true,
  biddingMode: 'OPEN',
  scenarios: {
    STANDARD: {
      weights: { power: 1.2, speed: 1.1, resistance: 0.7 },
      probabilityScale: 18,
      baseModifier: 0
    },
    DEATHMATCH: {
      weights: { power: 0.9, speed: 0.65, resistance: 1.45 },
      probabilityScale: 20,
      baseModifier: 0,
      exhaustionPenaltyPerCharacter: 2,
      exhaustionImmunityTag: 'regen',
      exhaustionModifierId: 'exhaustion'
    }
  },
  synergies: {
    pairs: [
      { characterIds: ['asta', 'yuno'], bonus: 16 }
    ] satisfies readonly PairSynergyRule[],
    groups: {
      minimumMembers: 3,
      bonusPerMember: 4
    } satisfies GroupSynergyRule
  },
  counters: {
    tagBonusCountMode: 'minimum-of-friendly-and-enemy-tag-counts',
    tagMatches: [
      { id: 'devil-bane-vs-devil', friendlyTag: 'devil-bane', enemyTag: 'devil', bonusPerMatch: 12 },
      { id: 'antimagic-vs-devil', friendlyTag: 'antimagic', enemyTag: 'devil', bonusPerMatch: 10 },
      { id: 'time-vs-fast', friendlyTag: 'time', enemyTag: 'fast', bonusPerMatch: 9 },
      { id: 'space-vs-ranged', friendlyTag: 'space', enemyTag: 'ranged', bonusPerMatch: 8 }
    ] satisfies readonly TagCounterRule[],
    scenarioMatches: [
      { id: 'regen-vs-exhaustion', scenario: 'DEATHMATCH', friendlyTag: 'regen', bonusPerCharacter: 7 }
    ] satisfies readonly ScenarioCounterRule[]
  }
} as const;
