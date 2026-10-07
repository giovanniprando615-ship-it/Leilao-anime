import { randomInt } from 'node:crypto';
import { GAME_RULES, ROSTER } from '@leilao/shared';
import type { AnimeSeries, CharacterId, PlayerId } from '@leilao/shared';
import type { StoredRoom } from './room-store.js';

export class AuctionRuleError extends Error {}

function shuffledRosterIds(series: AnimeSeries): CharacterId[] {
  const characterIds = ROSTER
    .filter((character) => character.series === series)
    .map((character) => character.id);
  if (GAME_RULES.randomizeAuctionOrder) {
    for (let index = characterIds.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [characterIds[index], characterIds[swapIndex]] = [characterIds[swapIndex], characterIds[index]];
    }
  }
  return characterIds;
}

export class AuctionEngine {
  start(room: StoredRoom, now = Date.now()): void {
    if (room.phase !== 'LOBBY') {
      throw new AuctionRuleError('O leilão só pode ser iniciado no lobby.');
    }
    if (room.players.length !== 2 || room.players.some((player) => !player.connected)) {
      throw new AuctionRuleError('Os dois jogadores precisam estar conectados para iniciar.');
    }
    if (ROSTER.length !== GAME_RULES.rosterSize) {
      throw new Error(`Roster must contain exactly ${GAME_RULES.rosterSize} characters.`);
    }
    const characterIds = shuffledRosterIds(room.series);
    if (characterIds.length < GAME_RULES.teamSize * 2) {
      throw new Error(`The ${room.series} roster must contain at least ${GAME_RULES.teamSize * 2} characters.`);
    }

    room.phase = 'AUCTION';
    room.battleResult = null;
    room.auction = {
      round: 1,
      currentCharacterId: null,
      queueCharacterIds: characterIds,
      currentBidCents: 0,
      leadingPlayerId: null,
      passedPlayerIds: [],
      endsAt: null,
      nextCharacterAt: null,
      lastSale: null,
      unsoldCharacterIds: []
    };
    this.selectNextCharacter(room, now);
  }

  bid(room: StoredRoom, playerId: PlayerId, amountCents: number, now = Date.now()): void {
    const auction = this.requireOpenLot(room);
    if (auction.endsAt !== null && now >= auction.endsAt) {
      throw new AuctionRuleError('O tempo para este personagem acabou.');
    }

    const player = room.players.find((candidate) => candidate.playerId === playerId);
    if (!player) {
      throw new AuctionRuleError('Jogador não pertence a esta sala.');
    }
    if (player.team.length >= GAME_RULES.teamSize) {
      throw new AuctionRuleError('Seu time já está completo.');
    }
    if (auction.leadingPlayerId === playerId) {
      throw new AuctionRuleError('Você já está liderando este leilão.');
    }
    if (auction.passedPlayerIds.includes(playerId)) {
      throw new AuctionRuleError('Você passou este personagem e não pode voltar a dar lance.');
    }
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      throw new AuctionRuleError('O lance deve ser informado em centavos inteiros.');
    }

    const minimumAllowed = auction.currentBidCents === 0
      ? GAME_RULES.minimumBidCents
      : auction.currentBidCents + GAME_RULES.bidIncrementCents;
    if (amountCents < minimumAllowed || amountCents % GAME_RULES.bidIncrementCents !== 0) {
      throw new AuctionRuleError(
        `O lance mínimo permitido é ${minimumAllowed} centavos, em incrementos de ${GAME_RULES.bidIncrementCents}.`
      );
    }
    if (amountCents > player.balanceCents) {
      throw new AuctionRuleError('O lance excede seu saldo disponível.');
    }

    const remainingSlots = GAME_RULES.teamSize - player.team.length;
    const requiredReserve = (remainingSlots - 1) * GAME_RULES.minimumBidCents;
    if (player.balanceCents - amountCents < requiredReserve) {
      throw new AuctionRuleError(
        `Reserve pelo menos ${requiredReserve} centavos para completar as vagas restantes.`
      );
    }

    if (auction.leadingPlayerId) {
      const previousLeader = room.players.find(
        (candidate) => candidate.playerId === auction.leadingPlayerId
      );
      if (!previousLeader) {
        throw new Error('Auction leader is not a member of the room.');
      }
      previousLeader.balanceCents += auction.currentBidCents;
    }

    player.balanceCents -= amountCents;
    auction.currentBidCents = amountCents;
    auction.leadingPlayerId = playerId;
    const remainingTime = (auction.endsAt ?? now) - now;
    if (remainingTime < GAME_RULES.antiSnipeMinimumRemainingMs) {
      auction.endsAt = now + GAME_RULES.antiSnipeMinimumRemainingMs;
    }
  }

  pass(room: StoredRoom, playerId: PlayerId, now = Date.now()): void {
    const auction = this.requireOpenLot(room);
    if (auction.endsAt !== null && now >= auction.endsAt) {
      throw new AuctionRuleError('O tempo para este personagem acabou.');
    }

    const player = room.players.find((candidate) => candidate.playerId === playerId);
    if (!player) {
      throw new AuctionRuleError('Jogador não pertence a esta sala.');
    }
    if (player.team.length >= GAME_RULES.teamSize) {
      throw new AuctionRuleError('Seu time já está completo.');
    }
    if (auction.leadingPlayerId === playerId) {
      throw new AuctionRuleError('Quem está liderando não pode passar.');
    }
    if (auction.passedPlayerIds.includes(playerId)) {
      throw new AuctionRuleError('Você já passou este personagem.');
    }

    auction.passedPlayerIds.push(playerId);
    const eligiblePlayers = room.players.filter(
      (candidate) => candidate.team.length < GAME_RULES.teamSize
    );
    if (
      auction.leadingPlayerId === null
      && eligiblePlayers.every((candidate) => auction.passedPlayerIds.includes(candidate.playerId))
    ) {
      this.resolveCurrentLot(room, now);
    }
  }

  advanceOnTimer(room: StoredRoom, now = Date.now()): boolean {
    const auction = room.auction;
    if (room.phase !== 'AUCTION' || !auction) {
      return false;
    }
    if (auction.endsAt !== null && now >= auction.endsAt) {
      this.resolveCurrentLot(room, now);
      return true;
    }
    if (auction.nextCharacterAt !== null && now >= auction.nextCharacterAt) {
      this.advanceAfterDelay(room, now);
      return true;
    }
    return false;
  }

  private requireOpenLot(room: StoredRoom) {
    const auction = room.auction;
    if (room.phase !== 'AUCTION' || !auction) {
      throw new AuctionRuleError('A sala não está em fase de leilão.');
    }
    if (auction.currentCharacterId === null || auction.endsAt === null) {
      throw new AuctionRuleError('Aguarde o próximo personagem.');
    }
    return auction;
  }

  private resolveCurrentLot(room: StoredRoom, now: number): void {
    const auction = room.auction;
    const characterId = auction?.currentCharacterId;
    if (!auction || !characterId) {
      return;
    }

    const winner = auction.leadingPlayerId
      ? room.players.find((player) => player.playerId === auction.leadingPlayerId)
      : undefined;
    if (winner) {
      winner.team.push({ characterId, priceCents: auction.currentBidCents });
      auction.unsoldCharacterIds = auction.unsoldCharacterIds.filter((id) => id !== characterId);
      auction.lastSale = {
        characterId,
        playerId: winner.playerId,
        priceCents: auction.currentBidCents,
        resolvedAt: now
      };
    } else {
      if (!auction.unsoldCharacterIds.includes(characterId)) {
        auction.unsoldCharacterIds.push(characterId);
      }
      auction.lastSale = {
        characterId,
        playerId: null,
        priceCents: null,
        resolvedAt: now
      };
    }

    auction.currentCharacterId = null;
    auction.currentBidCents = 0;
    auction.leadingPlayerId = null;
    auction.passedPlayerIds = [];
    auction.endsAt = null;
    auction.nextCharacterAt = now + GAME_RULES.interCharacterDelayMs;
  }

  private advanceAfterDelay(room: StoredRoom, now: number): void {
    const auction = room.auction;
    if (!auction) {
      return;
    }

    if (room.players.every((player) => player.team.length >= GAME_RULES.teamSize)) {
      this.finish(room);
      return;
    }

    if (auction.queueCharacterIds.length === 0 && auction.round === 1) {
      if (auction.unsoldCharacterIds.length === 0 || GAME_RULES.auctionRounds < 2) {
        this.finish(room);
        return;
      }
      auction.round = 2;
      auction.queueCharacterIds = [...auction.unsoldCharacterIds];
    }

    if (auction.queueCharacterIds.length === 0) {
      this.finish(room);
      return;
    }
    this.selectNextCharacter(room, now);
  }

  private selectNextCharacter(room: StoredRoom, now: number): void {
    const auction = room.auction;
    const characterId = auction?.queueCharacterIds.shift();
    if (!auction || !characterId) {
      this.finish(room);
      return;
    }

    auction.currentCharacterId = characterId;
    auction.currentBidCents = 0;
    auction.leadingPlayerId = null;
    auction.passedPlayerIds = [];
    auction.endsAt = now + GAME_RULES.characterOpeningDurationMs;
    auction.nextCharacterAt = null;
  }

  private finish(room: StoredRoom): void {
    const auction = room.auction;
    if (auction && GAME_RULES.fillUnsoldCharactersForFree) {
      for (const player of room.players) {
        while (
          player.team.length < GAME_RULES.teamSize
          && auction.unsoldCharacterIds.length > 0
        ) {
          const characterId = auction.unsoldCharacterIds.shift();
          if (characterId) {
            player.team.push({ characterId, priceCents: 0 });
          }
        }
      }
    }

    room.phase = 'TEAM_REVIEW';
    if (auction) {
      auction.currentCharacterId = null;
      auction.currentBidCents = 0;
      auction.leadingPlayerId = null;
      auction.passedPlayerIds = [];
      auction.endsAt = null;
      auction.nextCharacterAt = null;
    }
  }
}
