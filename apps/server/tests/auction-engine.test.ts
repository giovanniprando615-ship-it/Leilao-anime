import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_RULES, ROSTER } from '@leilao/shared';
import { AuctionEngine, AuctionRuleError } from '../src/auction-engine.js';
import type { StoredRoom } from '../src/room-store.js';

function createRoom(series: StoredRoom['series'] = 'ONE_PIECE'): StoredRoom {
  return {
    roomCode: 'ABCDE',
    series,
    phase: 'LOBBY',
    hostPlayerId: 'host',
    players: [
      { playerId: 'host', name: 'Host', connected: true, balanceCents: 6000, team: [] },
      { playerId: 'guest', name: 'Guest', connected: true, balanceCents: 6000, team: [] }
    ],
    auction: null,
    battleResult: null,
    lastActivityAt: 0
  };
}

test('starts with the complete expanded roster and unique character IDs', () => {
  const ids = ROSTER.map(({ id }) => id);
  assert.equal(ROSTER.length, GAME_RULES.rosterSize);
  assert.equal(ROSTER.length, 64);
  assert.equal(new Set(ids).size, ROSTER.length);

  const seriesCounts = ROSTER.reduce<Record<string, number>>((counts, character) => {
    counts[character.series] = (counts[character.series] ?? 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(seriesCounts, {
    ONE_PIECE: 28,
    NARUTO: 18,
    BLACK_CLOVER: 18
  });
});

test('limits every auction to the anime selected for its room', () => {
  const engine = new AuctionEngine();
  for (const series of ['ONE_PIECE', 'NARUTO', 'BLACK_CLOVER'] as const) {
    const room = createRoom(series);
    engine.start(room, 10_000);
    const auction = room.auction;
    assert.ok(auction);
    const expectedIds = ROSTER.filter((character) => character.series === series).map(({ id }) => id);
    assert.equal(auction.queueCharacterIds.length + 1, expectedIds.length);
    assert.ok(auction.currentCharacterId);
    assert.ok(expectedIds.includes(auction.currentCharacterId));
    assert.ok(auction.queueCharacterIds.every((id) => expectedIds.includes(id)));
  }
});

test('reserves bids, refunds outbid players, enforces passing, and applies anti-snipe', () => {
  const engine = new AuctionEngine();
  const room = createRoom();
  const startedAt = 10_000;
  engine.start(room, startedAt);

  const initialDeadline = room.auction?.endsAt;
  assert.ok(initialDeadline);
  assert.throws(() => engine.bid(room, 'guest', 99, startedAt + 1), AuctionRuleError);
  assert.throws(() => engine.bid(room, 'guest', 125, startedAt + 1), AuctionRuleError);
  assert.throws(() => engine.bid(room, 'guest', 6100, startedAt + 1), AuctionRuleError);

  engine.bid(room, 'guest', 100, startedAt + 1000);
  assert.equal(room.players[1].balanceCents, 5900);
  assert.throws(() => engine.bid(room, 'host', 5450, startedAt + 1001), AuctionRuleError);

  engine.bid(room, 'host', 5400, startedAt + 14_000);
  assert.equal(room.players[0].balanceCents, 600);
  assert.equal(room.players[1].balanceCents, 6000);
  assert.equal(room.auction?.endsAt, startedAt + 24_000);
  assert.throws(() => engine.bid(room, 'host', 5450, startedAt + 14_001), AuctionRuleError);

  engine.pass(room, 'guest', startedAt + 14_001);
  assert.throws(() => engine.bid(room, 'guest', 5450, startedAt + 14_002), AuctionRuleError);
  assert.throws(() => engine.pass(room, 'host', startedAt + 14_002), AuctionRuleError);

  assert.equal(engine.advanceOnTimer(room, startedAt + 24_000), true);
  assert.deepEqual(room.players[0].team, [{
    characterId: room.auction?.lastSale?.characterId,
    priceCents: 5400
  }]);
  assert.equal(room.auction?.nextCharacterAt, startedAt + 26_500);
  assert.equal(engine.advanceOnTimer(room, startedAt + 26_500), true);
  assert.ok(room.auction?.currentCharacterId);
  assert.equal(room.phase, 'AUCTION');
});

test('re-auctions unsold characters and fills both teams with free characters when exhausted', () => {
  const engine = new AuctionEngine();
  const room = createRoom();
  let now = 50_000;
  engine.start(room, now);

  while (room.phase === 'AUCTION') {
    const auction = room.auction;
    assert.ok(auction);
    const nextDeadline = auction.endsAt ?? auction.nextCharacterAt;
    assert.ok(nextDeadline !== null);
    now = nextDeadline;
    assert.equal(engine.advanceOnTimer(room, now), true);
  }

  assert.equal(room.phase, 'TEAM_REVIEW');
  assert.equal(room.auction?.round, 2);
  assert.equal(room.players[0].team.length, 7);
  assert.equal(room.players[1].team.length, 7);
  const allCharacters = room.players.flatMap((player) => player.team);
  assert.equal(new Set(allCharacters.map((character) => character.characterId)).size, 14);
  assert.ok(allCharacters.every((character) => character.priceCents === 0));
});
