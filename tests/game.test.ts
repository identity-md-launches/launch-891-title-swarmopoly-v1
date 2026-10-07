import test from "node:test";
import assert from "node:assert/strict";
import {
  BOARD,
  CARDS,
  createGame,
  reduceGame,
  rent,
  worth,
  winners,
  readSave,
  botAction,
} from "../src/game.ts";
import type { Game } from "../src/game.ts";

const game = () =>
  createGame(
    [
      { name: "Ada", bot: false },
      { name: "Bot", bot: true },
    ],
    10,
  );
const roll = (g: Game, a: number, b: number, card = 0) =>
  reduceGame(g, { type: "roll", dice: [a, b], card });
test("board has 40 spaces and 28 purchasable locations", () => {
  assert.equal(BOARD.length, 40);
  assert.equal(
    BOARD.filter((s) => ["property", "pass", "utility"].includes(s.kind))
      .length,
    28,
  );
  for (let i = 0; i < 40; i++) assert.equal(BOARD[i].id, i);
});
test("configuration accepts 2–4 players and rejects bot-only games", () => {
  for (const n of [2, 3, 4])
    assert.equal(
      createGame(
        Array.from({ length: n }, (_, i) => ({ name: `P${i}`, bot: i > 0 })),
      ).players.length,
      n,
    );
  assert.throws(() => createGame([{ name: "Alone", bot: false }]));
  assert.throws(() =>
    createGame([
      { name: "A", bot: true },
      { name: "B", bot: true },
    ]),
  );
});
test("roll, buy, end turn: ownership and credit accounting", () => {
  const original = game();
  const g = roll(original, 1, 2);
  assert.equal(g.players[0].position, 3);
  assert.equal(g.phase, "buy");
  assert.equal(original.players[0].position, 0);
  const bought = reduceGame(g, { type: "buy" });
  assert.equal(bought.owners[3], 0);
  assert.equal(bought.players[0].cash, 1440);
  assert.equal(bought.phase, "end");
  const next = reduceGame(bought, { type: "end" });
  assert.equal(next.current, 1);
  assert.equal(next.turn, 2);
  assert.equal(next.phase, "roll");
});
test("passing a property leaves it at the bank and unaffordable purchases fail", () => {
  const g = roll(game(), 1, 2);
  g.players[0].cash = 20;
  assert.equal(reduceGame(g, { type: "buy" }), g);
  const skipped = reduceGame(g, { type: "skip" });
  assert.equal(skipped.owners[3], null);
  assert.equal(skipped.phase, "end");
});
test("rent transfers cash and complete groups double property rent", () => {
  const g = game();
  g.owners[1] = 1;
  g.owners[3] = 1;
  assert.equal(rent(g, 3), 16);
  const paid = roll(g, 1, 2);
  assert.equal(paid.players[0].cash, 1484);
  assert.equal(paid.players[1].cash, 1516);
});
test("pass rent scales and utilities use the actual roll total", () => {
  const g = game();
  [5, 15, 25, 35].forEach((id, i) => {
    g.owners[id] = 1;
    assert.equal(rent(g, id), 25 * 2 ** i);
  });
  g.owners[12] = 1;
  assert.equal(rent(g, 12, 9), 36);
  g.owners[28] = 1;
  assert.equal(rent(g, 12, 9), 90);
});
test("passing Genesis credits exactly 200", () => {
  const g = game();
  g.players[0].position = 39;
  const result = roll(g, 1, 2);
  // Lands on lore, receives the selected 100-credit airdrop as well.
  assert.equal(result.players[0].position, 2);
  assert.equal(result.players[0].cash, 1800);
});
test("fee and parking effects", () => {
  const fee = roll(game(), 2, 2);
  assert.equal(fee.players[0].cash, 1400);
  const g = game();
  g.players[0].position = 18;
  const parked = roll(g, 1, 1);
  assert.equal(parked.players[0].cash, 1500);
  assert.equal(parked.phase, "end");
});
test("all eight card effects resolve without blocking the turn", () => {
  CARDS.forEach((card, i) => {
    const g = roll(game(), 1, 1, i);
    assert.equal(g.card, card.title);
    assert.equal(g.phase, "end");
    if ("cash" in card) assert.equal(g.players[0].cash, 1500 + card.cash);
    else if (card.move === "start") {
      assert.equal(g.players[0].position, 0);
      assert.equal(g.players[0].cash, 1700);
    } else {
      assert.equal(g.players[0].position, 10);
      assert.equal(g.players[0].jailed, true);
    }
  });
});
test("Hands Off sends to SitOnHands, skips exactly one turn; visiting is free", () => {
  const g = game();
  g.players[0].position = 28;
  let locked = roll(g, 1, 1);
  assert.equal(locked.players[0].position, 10);
  assert.equal(locked.players[0].jailed, true);
  assert.equal(locked.players[0].cash, 1500);
  locked.phase = "roll";
  locked = roll(locked, 6, 6);
  assert.equal(locked.players[0].position, 10);
  assert.equal(locked.players[0].jailed, false);
  const visit = game();
  visit.players[0].position = 8;
  assert.equal(roll(visit, 1, 1).players[0].jailed, false);
});
test("bankruptcy transfers remaining cash, releases properties, ends game", () => {
  const g = game();
  g.players[0].cash = 3;
  g.owners[1] = 0;
  g.owners[3] = 1;
  const out = roll(g, 1, 2);
  assert.equal(out.players[0].bankrupt, true);
  assert.equal(out.players[0].cash, 0);
  assert.equal(out.players[1].cash, 1503);
  assert.equal(out.owners[1], null);
  assert.equal(out.phase, "finished");
  assert.deepEqual(winners(out), [1]);
});
test("bankrupt players are skipped in games with more than two players", () => {
  const g = createGame();
  g.players[1].bankrupt = true;
  g.phase = "end";
  assert.equal(reduceGame(g, { type: "end" }).current, 2);
});
test("clock starts on first roll, pauses, expires and scores ties correctly", () => {
  const g = game();
  assert.equal(reduceGame(g, { type: "tick" }), g);
  g.started = true;
  g.remaining = 1;
  g.owners[3] = 0;
  g.players[0].cash = 1440;
  const paused = reduceGame(g, { type: "pause" });
  assert.equal(reduceGame(paused, { type: "tick" }), paused);
  const finished = reduceGame(g, { type: "tick" });
  assert.equal(finished.phase, "finished");
  assert.deepEqual(winners(finished), [0, 1]);
  assert.equal(worth(finished, 0), 1500);
  assert.equal(reduceGame(finished, { type: "buy" }), finished);
});
test("untimed mode and invalid phase actions do not change the game", () => {
  const g = createGame(undefined, 0);
  g.started = true;
  assert.equal(reduceGame(g, { type: "tick" }), g);
  assert.equal(reduceGame(g, { type: "end" }), g);
  assert.equal(reduceGame(g, { type: "buy" }), g);
  assert.equal(roll(g, 7, 1), g);
});
test("bots keep a reserve and resolve every phase", () => {
  let g = roll(game(), 1, 2);
  g.players[0].cash = 159;
  assert.deepEqual(botAction(g), { type: "skip" });
  g.players[0].cash = 160;
  assert.deepEqual(botAction(g), { type: "buy" });
  g = reduceGame(g, { type: "buy" });
  assert.deepEqual(botAction(g), { type: "end" });
});
test("save round trip and corrupted saves recover safely", () => {
  const g = roll(game(), 1, 2);
  assert.deepEqual(readSave(JSON.stringify(g)), g);
  for (const raw of [null, "{", "{}", "null", "[]"])
    assert.equal(readSave(raw), null);
  const variants = [
    { ...g, owners: [] },
    { ...g, current: 9 },
    { ...g, dice: [0, 7] },
    { ...g, remaining: -1 },
    { ...g, version: 2 },
    { ...g, players: [{ ...g.players[0], position: 400 }, g.players[1]] },
    { ...g, log: [{ turn: 1, text: {} }] },
  ];
  for (const value of variants)
    assert.equal(readSave(JSON.stringify(value)), null);
});
test("100 seeded games preserve invariants through timeout or bankruptcy", () => {
  for (let seed = 1; seed <= 100; seed++) {
    let rng = seed;
    const random = (max: number) => {
      rng = (rng * 1664525 + 1013904223) >>> 0;
      return rng % max;
    };
    let g = createGame(
      Array.from({ length: 2 + (seed % 3) }, (_, i) => ({
        name: `P${i}`,
        bot: i > 0,
      })),
      10,
    );
    for (let i = 0; i < 3000 && g.phase !== "finished"; i++) {
      if (g.phase === "roll")
        g = roll(g, random(6) + 1, random(6) + 1, random(8));
      else g = reduceGame(g, botAction(g));
      g = reduceGame(g, { type: "tick" });
      assert.ok(
        g.players.every(
          (p) =>
            Number.isInteger(p.cash) &&
            p.cash >= 0 &&
            p.position >= 0 &&
            p.position < 40,
        ),
      );
      assert.ok(g.owners.every((o) => o === null || !g.players[o].bankrupt));
      assert.ok(
        readSave(JSON.stringify(g)),
        `save validity, seed ${seed}, phase ${g.phase}`,
      );
    }
    assert.equal(g.phase, "finished");
    assert.ok(winners(g).length >= 1);
  }
});
