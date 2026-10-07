export type Token = "imp" | "seat" | "dog" | "orb";
export type SpaceKind =
  | "property"
  | "pass"
  | "utility"
  | "lore"
  | "signal"
  | "fee"
  | "start"
  | "jail"
  | "park"
  | "gotojail";
export interface Space {
  id: number;
  name: string;
  kind: SpaceKind;
  group?: string;
  price: number;
  rent: number;
}
export interface Player {
  name: string;
  bot: boolean;
  token: Token;
  cash: number;
  position: number;
  jailed: boolean;
  bankrupt: boolean;
}
export interface Game {
  version: 1;
  players: Player[];
  owners: (number | null)[];
  current: number;
  turn: number;
  phase: "roll" | "buy" | "end" | "finished";
  dice: [number, number];
  remaining: number | null;
  started: boolean;
  paused: boolean;
  log: { turn: number; text: string }[];
  message: string;
  card: string | null;
}
export type Action =
  | { type: "roll"; dice: [number, number]; card: number }
  | { type: "buy" | "skip" | "end" | "pause" | "tick" };
const property = (
  name: string,
  group: string,
  price: number,
  rent: number,
) => ({ name, group, price, rent, kind: "property" as const });
const special = (name: string, kind: SpaceKind, price = 0, rent = 0) => ({
  name,
  kind,
  price,
  rent,
});
export const BOARD: Space[] = [
  special("Genesis", "start"),
  property("First Imp", "Origin", 60, 6),
  special("Swarm lore", "lore"),
  property("Seed Seat", "Origin", 60, 8),
  special("Swap fee", "fee", 100),
  special("Genesis Pass", "pass", 200, 25),
  property("Green Room", "Signal", 100, 12),
  special("Signal drop", "signal"),
  property("Night Shift", "Signal", 100, 12),
  property("Early Birds", "Signal", 120, 16),
  special("SitOnHands", "jail"),
  property("Imp Factory", "Factory", 140, 20),
  special("RPC Relay", "utility", 150),
  property("Clone Club", "Factory", 140, 20),
  property("Deploy Den", "Factory", 160, 24),
  special("Builder Pass", "pass", 200, 25),
  property("Dog Days", "Culture", 180, 28),
  special("Swarm lore", "lore"),
  property("Meme Lab", "Culture", 180, 28),
  property("Good Company", "Culture", 200, 32),
  special("Touch Grass", "park"),
  property("Swarm Studio", "Collective", 220, 36),
  special("Signal drop", "signal"),
  property("Hive Mind", "Collective", 220, 36),
  property("Open Source", "Collective", 240, 40),
  special("All Access Pass", "pass", 200, 25),
  property("Launch Pad", "Launch", 260, 44),
  property("Orbit Club", "Launch", 260, 44),
  special("Node Station", "utility", 150),
  property("Moon Seat", "Launch", 280, 48),
  special("Hands Off", "gotojail"),
  property("After Hours", "Frontier", 300, 52),
  property("Deep Signal", "Frontier", 300, 52),
  special("Swarm lore", "lore"),
  property("Future Proof", "Frontier", 320, 56),
  special("Swarm Pass", "pass", 200, 25),
  special("Signal drop", "signal"),
  property("Inner Circle", "Legacy", 350, 70),
  special("The Burn", "fee", 100),
  property("Identity HQ", "Legacy", 400, 90),
].map((space, id) => ({ ...space, id }));
export const GROUPS: Record<string, string> = {
  Origin: "#b6a2e2",
  Signal: "#85d8ec",
  Factory: "#e987c3",
  Culture: "#f6b37b",
  Collective: "#f38686",
  Launch: "#e9d47c",
  Frontier: "#a6d493",
  Legacy: "#969ef3",
};
export const TOKEN_COLORS = ["#b6f85d", "#bca0ff", "#ffb57b", "#86ddea"];
export const CARDS = [
  {
    title: "Airdrop season",
    text: "Your contributions got noticed. Collect 100 credits.",
    cash: 100,
  },
  {
    title: "VIP mint",
    text: "Your guest list has good taste. Collect 150 credits.",
    cash: 150,
  },
  {
    title: "Factory deploy",
    text: "Pay 75 credits to get your new factory running.",
    cash: -75,
  },
  {
    title: "Parked launch",
    text: "The launch can wait. Pay 50 credits for a little breathing room.",
    cash: -50,
  },
  {
    title: "Back to genesis",
    text: "Move to Genesis and collect 200 credits.",
    move: "start",
  },
  {
    title: "Diamond hands",
    text: "Take a seat at SitOnHands. Skip your next turn.",
    move: "jail",
  },
  {
    title: "Public goods",
    text: "A community grant just landed. Collect 80 credits.",
    cash: 80,
  },
  {
    title: "Gas spike",
    text: "Busy block, bad timing. Pay 40 credits.",
    cash: -40,
  },
] as const;
export const money = (n: number) => n.toLocaleString("en-US");
export function createGame(
  config: { name: string; bot: boolean }[] = [
    { name: "Imp", bot: false },
    { name: "Seat", bot: true },
    { name: "Dog", bot: true },
  ],
  minutes = 20,
): Game {
  if (config.length < 2 || config.length > 4 || config.every((p) => p.bot))
    throw new Error("Choose 2–4 players, including one human.");
  if (![0, 10, 20, 40].includes(minutes))
    throw new Error("Choose a supported duration.");
  return {
    version: 1,
    players: config.map((p, i) => ({
      name: p.name.trim().slice(0, 20) || `Player ${i + 1}`,
      bot: p.bot,
      token: (["imp", "seat", "dog", "orb"] as const)[i],
      cash: 1500,
      position: 0,
      jailed: false,
      bankrupt: false,
    })),
    owners: Array(40).fill(null),
    current: 0,
    turn: 1,
    phase: "roll",
    dice: [3, 5],
    remaining: minutes ? minutes * 60 : null,
    started: false,
    paused: false,
    log: [],
    message: "A fresh board. A world of possibilities.",
    card: null,
  };
}
export function assets(g: Game, player: number): number[] {
  return g.owners.flatMap((owner, i) => (owner === player ? [i] : []));
}
export function worth(g: Game, player: number): number {
  return (
    g.players[player].cash +
    assets(g, player).reduce((sum, i) => sum + BOARD[i].price, 0)
  );
}
export function rent(g: Game, id: number, dice = 7): number {
  const space = BOARD[id],
    owner = g.owners[id];
  if (owner === null) return space.rent;
  if (space.kind === "pass")
    return (
      25 *
      2 ** (assets(g, owner).filter((i) => BOARD[i].kind === "pass").length - 1)
    );
  if (space.kind === "utility")
    return (
      dice *
      (assets(g, owner).filter((i) => BOARD[i].kind === "utility").length === 2
        ? 10
        : 4)
    );
  const fullSet =
    space.group &&
    BOARD.filter((s) => s.group === space.group).every(
      (s) => g.owners[s.id] === owner,
    );
  return space.rent * (fullSet ? 2 : 1);
}
function note(g: Game, text: string) {
  g.message = text;
  g.log.unshift({ turn: g.turn, text });
  g.log = g.log.slice(0, 60);
}
function pay(g: Game, amount: number, to: number | null = null) {
  const p = g.players[g.current];
  if (to !== null) g.players[to].cash += Math.min(p.cash, amount);
  if (p.cash < amount) {
    p.cash = 0;
    p.bankrupt = true;
    g.owners = g.owners.map((o) => (o === g.current ? null : o));
    note(g, `${p.name} is bankrupt. Their properties return to the bank.`);
  } else p.cash -= amount;
}
function jail(g: Game) {
  const p = g.players[g.current];
  p.position = 10;
  p.jailed = true;
}
function finishIfLast(g: Game) {
  if (g.players.filter((p) => !p.bankrupt).length === 1) {
    g.phase = "finished";
    note(g, "The last player standing wins. The swarm has a champion.");
  }
}
export function winners(g: Game): number[] {
  const live = g.players.flatMap((p, i) => (p.bankrupt ? [] : [i]));
  const max = Math.max(...live.map((i) => worth(g, i)));
  return live.filter((i) => worth(g, i) === max);
}
export function reduceGame(state: Game, action: Action): Game {
  if (state.phase === "finished") return state;
  const g = structuredClone(state),
    p = g.players[g.current];
  if (action.type === "pause") {
    g.paused = !g.paused;
    return g;
  }
  if (g.paused) return state;
  if (action.type === "tick") {
    if (!g.started || g.remaining === null) return state;
    g.remaining = Math.max(0, g.remaining - 1);
    if (!g.remaining) {
      g.phase = "finished";
      note(
        g,
        "Time is up. Cash plus property purchase value decides the winner.",
      );
    }
    return g;
  }
  if (action.type === "roll" && g.phase === "roll") {
    if (action.dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6))
      return state;
    g.started = true;
    g.card = null;
    g.phase = "end";
    if (p.jailed) {
      p.jailed = false;
      note(g, `${p.name} sat this turn out. Free to roll next turn.`);
      return g;
    }
    g.dice = action.dice;
    const distance = action.dice[0] + action.dice[1];
    if (p.position + distance >= 40) {
      p.cash += 200;
      note(g, `${p.name} passed Genesis. +200 credits.`);
    }
    p.position = (p.position + distance) % 40;
    const s = BOARD[p.position],
      owner = g.owners[s.id];
    note(g, `${p.name} rolled ${distance} and landed on ${s.name}.`);
    if (["property", "pass", "utility"].includes(s.kind)) {
      if (owner === null) {
        g.phase = "buy";
        g.message = `${s.name} is available. Buy it or pass this turn.`;
      } else if (owner !== g.current) {
        const amount = rent(g, s.id, distance);
        note(
          g,
          `${p.name} owes ${money(amount)} credits to ${g.players[owner].name}.`,
        );
        pay(g, amount, owner);
      } else g.message = `${p.name} is home at ${s.name}. No rent due.`;
    } else if (s.kind === "fee") {
      note(g, `${p.name} pays ${s.price} credits for ${s.name}.`);
      pay(g, s.price);
    } else if (s.kind === "gotojail") {
      jail(g);
      note(g, `${p.name} goes to SitOnHands. Skip the next turn.`);
    } else if (s.kind === "lore" || s.kind === "signal") {
      const c =
        CARDS[
          ((Math.trunc(action.card) % CARDS.length) + CARDS.length) %
            CARDS.length
        ];
      g.card = c.title;
      note(g, `${p.name} drew “${c.title}”. ${c.text}`);
      if ("cash" in c) {
        if (c.cash > 0) p.cash += c.cash;
        else pay(g, -c.cash);
      } else if (c.move === "start") {
        p.position = 0;
        p.cash += 200;
      } else jail(g);
    } else if (s.kind === "jail")
      g.message = `${p.name} is just visiting SitOnHands. No turn skipped.`;
    else if (s.kind === "park")
      g.message = `${p.name} takes a breather. Touch grass, collect perspective.`;
    finishIfLast(g);
    return g;
  }
  if (action.type === "buy" && g.phase === "buy") {
    const s = BOARD[p.position];
    if (g.owners[s.id] !== null || p.cash < s.price) return state;
    p.cash -= s.price;
    g.owners[s.id] = g.current;
    g.phase = "end";
    note(g, `${p.name} bought ${s.name} for ${money(s.price)} credits.`);
    return g;
  }
  if (action.type === "skip" && g.phase === "buy") {
    g.phase = "end";
    note(
      g,
      `${p.name} passed on ${BOARD[p.position].name}. It stays available.`,
    );
    return g;
  }
  if (action.type === "end" && g.phase === "end") {
    do {
      g.current = (g.current + 1) % g.players.length;
    } while (g.players[g.current].bankrupt);
    g.turn++;
    g.phase = "roll";
    g.card = null;
    g.message = `${g.players[g.current].name}, your next big move is waiting.`;
    return g;
  }
  return state;
}
export function botAction(g: Game): Action {
  if (g.phase === "buy")
    return {
      type:
        g.players[g.current].cash >=
        BOARD[g.players[g.current].position].price + 100
          ? "buy"
          : "skip",
    };
  if (g.phase === "end") return { type: "end" };
  return {
    type: "roll",
    dice: [randomInt(6) + 1, randomInt(6) + 1],
    card: randomInt(CARDS.length),
  };
}
export function randomInt(max: number) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return Math.floor((a[0] / 4294967296) * max);
}
export const SAVE_KEY = "swarmopoly.v1";
export function readSave(raw: string | null): Game | null {
  if (!raw) return null;
  try {
    const g = JSON.parse(raw);
    const integer = (n: unknown, min: number, max: number): n is number =>
      typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
    if (
      g.version !== 1 ||
      !Array.isArray(g.players) ||
      g.players.length < 2 ||
      g.players.length > 4
    )
      return null;
    if (
      !g.players.every(
        (p: Player, i: number) =>
          typeof p.name === "string" &&
          p.name.length > 0 &&
          p.name.length <= 20 &&
          typeof p.bot === "boolean" &&
          p.token === ["imp", "seat", "dog", "orb"][i] &&
          integer(p.cash, 0, 1e9) &&
          integer(p.position, 0, 39) &&
          typeof p.jailed === "boolean" &&
          typeof p.bankrupt === "boolean",
      )
    )
      return null;
    if (
      g.players.every((p: Player) => p.bot) ||
      g.players.every((p: Player) => p.bankrupt)
    )
      return null;
    if (
      !Array.isArray(g.owners) ||
      g.owners.length !== 40 ||
      !g.owners.every(
        (o: unknown, i: number) =>
          o === null ||
          (integer(o, 0, g.players.length - 1) &&
            !g.players[o].bankrupt &&
            ["property", "pass", "utility"].includes(BOARD[i].kind)),
      )
    )
      return null;
    if (
      !integer(g.current, 0, g.players.length - 1) ||
      !integer(g.turn, 1, 1e8) ||
      !["roll", "buy", "end", "finished"].includes(g.phase)
    )
      return null;
    if (g.players[g.current].bankrupt && !["end", "finished"].includes(g.phase))
      return null;
    if (
      !Array.isArray(g.dice) ||
      g.dice.length !== 2 ||
      !g.dice.every((d: unknown) => integer(d, 1, 6))
    )
      return null;
    if (g.remaining !== null && !integer(g.remaining, 0, 2400)) return null;
    if (g.remaining === 0 && g.phase !== "finished") return null;
    if (
      typeof g.started !== "boolean" ||
      typeof g.paused !== "boolean" ||
      typeof g.message !== "string" ||
      g.message.length > 600 ||
      (g.card !== null && !CARDS.some((c) => c.title === g.card))
    )
      return null;
    if (
      !Array.isArray(g.log) ||
      g.log.length > 60 ||
      !g.log.every(
        (l: { turn: unknown; text: unknown }) =>
          integer(l.turn, 1, 1e8) &&
          typeof l.text === "string" &&
          l.text.length <= 600,
      )
    )
      return null;
    if (
      g.phase === "buy" &&
      (g.owners[g.players[g.current].position] !== null ||
        !["property", "pass", "utility"].includes(
          BOARD[g.players[g.current].position].kind,
        ))
    )
      return null;
    return g as Game;
  } catch {
    return null;
  }
}
