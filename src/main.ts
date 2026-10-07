import "./style.css";
import {
  BOARD,
  GROUPS,
  TOKEN_COLORS,
  CARDS,
  SAVE_KEY,
  createGame,
  reduceGame,
  botAction,
  readSave,
  assets,
  rent,
  worth,
  winners,
  money,
  randomInt,
} from "./game.ts";
import type { Action, Game } from "./game.ts";
import { icon, die } from "./icons.ts";

const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let storageOk = true,
  restoreFailed = false;
let game: Game;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  const saved = readSave(raw);
  restoreFailed = !!raw && !saved;
  game = saved || createGame();
} catch {
  storageOk = false;
  game = createGame();
}
let rolling = false,
  sound = false,
  rosterView = "players",
  botTimeout = 0;
let audio: AudioContext | undefined;
let returnFocus: HTMLElement | null = null;

$("#app").innerHTML = `
  <a class="skip-link" href="#turn-panel">Skip to turn controls</a>
  <header class="site-header"><a class="brand" href="./" aria-label="Swarmopoly home">${icon("imp", "brand-mark")}<span>swarmopoly<span class="brand-dot">✳</span><small>An Identity MD board game</small></span></a>
    <nav aria-label="Game options"><span class="offline-badge"><i></i> Offline, together.</span><button class="text-button" id="rules" aria-label="How to play">${icon("book")}<span>How to play</span></button><button class="button secondary compact" id="new-game">${icon("plus")} New game</button></nav>
  </header>
  <main>
    <section class="intro" aria-labelledby="page-title"><div><div class="eyebrow"><span class="mini-star">✳</span> The unofficial swarm game <span class="version">v1.0</span></div><h1 id="page-title">The swarm is your playground.</h1><p>Roll the dice. Claim your corner. Build something big.</p></div><div class="session-meta"><span class="label">Local table</span><span><span id="player-count">3</span> players <span class="dot-separator">/</span> <span id="mode-label">Quick game</span></span></div></section>
    <div class="game-layout">
      <aside class="sidebar" aria-label="Game controls and players">
        <section class="turn-panel panel" id="turn-panel" tabindex="-1"></section>
        <section class="roster-panel panel" aria-label="Players and properties"><div class="panel-tabs"><button id="players-tab" class="panel-tab selected" aria-pressed="true">The players</button><button id="portfolio-tab" class="panel-tab" aria-pressed="false">Portfolio</button></div><div id="roster"></div></section>
        <section class="feed-panel panel"><div class="panel-heading"><h2>Swarm activity</h2><span class="live-label"><i></i> Local</span></div><div id="feed"></div></section>
      </aside>
      <section class="board-section" aria-label="Game board">
        <div class="board-toolbar"><div class="table-label"><span class="status-dot"></span><span id="table-status">Table ready</span><span class="toolbar-divider"></span><span id="round-label">Turn 01</span></div><div class="board-tools"><span id="timer" class="timer">${icon("clock")}<span>20:00</span></span><button class="icon-button" id="pause" aria-label="Pause game">${icon("pause")}</button><button class="icon-button" id="sound" aria-label="Enable sound" aria-pressed="false">${icon("mute")}</button></div></div>
        <p class="map-hint">Scroll to explore all 40 spaces ↔</p><div class="board-scroll" tabindex="0" role="region" aria-label="40-space board. Scroll horizontally on small screens."><div class="board" id="board"></div></div>
        <div class="board-bottom"><span>${icon("imp")} Big plans. Small imps.</span><span>Select any space to take a closer look ${icon("arrow")}</span></div>
        <label class="space-picker">Inspect a board space<select id="space-picker"><option value="">Choose from all 40 spaces</option>${BOARD.map((s) => `<option value="${s.id}">${String(s.id + 1).padStart(2, "0")} · ${s.name}</option>`).join("")}</select></label>
        <p class="scroll-hint">Swipe the board to explore ↔ · Or use the space selector.</p>
      </section>
    </div>
    <div class="bottom-note"><span>${icon("jail")} No wallet. No gas. Just game.</span><span id="save-status">Progress saved on this device</span><span>Made for the swarm <span class="green-text">↗</span></span></div>
  </main>
  <footer><span>Identity MD <span class="footer-slash">/</span> Swarmopoly</span><span>Fictional launches. Real good company.</span><span class="footer-edition">The first edition — 2026</span></footer>
  <div id="announcement" class="sr-only" role="status" aria-live="polite"></div>
  <dialog id="dialog" aria-labelledby="dialog-title"><button class="icon-button dialog-close" id="close-dialog" aria-label="Close dialog">${icon("close")}</button><div id="dialog-content"></div></dialog>
`;
const dialog = $<HTMLDialogElement>("#dialog");

function boardPosition(i: number) {
  if (i <= 10) return [11, 11 - i];
  if (i <= 20) return [21 - i, 1];
  if (i <= 30) return [1, i - 19];
  return [i - 29, 11];
}
function boardMarkup() {
  return (
    BOARD.map((s) => {
      const [row, col] = boardPosition(s.id),
        corner = s.id % 10 === 0;
      const owner = game.owners[s.id];
      const occupants = game.players.flatMap((p, i) =>
        p.position === s.id && !p.bankrupt ? [i] : [],
      );
      const special = !["property"].includes(s.kind);
      return `<button class="space ${special ? "special" : ""} ${corner ? "corner" : ""} ${occupants.includes(game.current) ? "occupied" : ""}" data-space="${s.id}" style="grid-row:${row};grid-column:${col};--group:${GROUPS[s.group || ""] || "#6c667a"}" aria-label="${s.id + 1}. ${s.name}${s.price ? `, ${s.price} credits` : ""}. ${owner === null ? "Unowned." : `Owned by ${escape(game.players[owner].name)}.`}${occupants.length ? ` Here: ${occupants.map((i) => escape(game.players[i].name)).join(", ")}.` : ""}">
    ${s.group ? '<span class="property-stripe"></span>' : icon(s.kind)}<span class="space-name">${s.name}</span><span class="space-price">${s.price ? `${s.kind === "fee" ? "−" : "◈"} ${s.price}` : s.kind === "start" ? "+200 credits" : s.kind === "jail" ? "Just visiting" : s.kind === "park" ? "Take a break" : s.kind === "gotojail" ? "Go to lock" : "Draw a card"}</span>
    ${owner !== null ? `<span class="owner-mark" style="--player:${TOKEN_COLORS[owner]}" aria-hidden="true">${icon(game.players[owner].token)}</span>` : ""}
    ${occupants.length ? `<span class="board-tokens">${occupants.map((i) => `<span class="token-mini" style="--player:${TOKEN_COLORS[i]}" aria-hidden="true">${icon(game.players[i].token)}</span>`).join("")}</span>` : ""}</button>`;
    }).join("") +
    `<div class="board-center"><div class="center-top"><span><i></i> Welcome to the swarm</span><span>EST. 2026</span></div><div class="center-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><span class="orbit-spark spark-one">+</span><span class="orbit-spark spark-two">✳</span><div class="mascot">${icon("imp")}</div><span class="art-coordinate">IMD / 001</span></div><div class="center-brand">SWARMOPOLY<span>The board belongs to the builders.</span></div><div class="deck-row"><button class="deck lore-deck" data-deck="lore">${icon("lore")}<span>Swarm lore<small>Expect the unexpected</small></span><span class="deck-star">↗</span></button><button class="deck signal-deck" data-deck="signal">${icon("signal")}<span>Signal drop<small>A little chaos is healthy</small></span><span class="deck-star">↗</span></button></div><div class="center-bottom"><span>Roll. Launch. Take over.</span><span>40 spaces · Infinite stories</span></div></div>`
  );
}
function turnMarkup() {
  const p = game.players[game.current],
    s = BOARD[p.position],
    disabled = p.bot || game.paused || rolling;
  if (game.phase === "finished") {
    const win = winners(game);
    return `<div class="turn-kicker">${icon("trophy")} The swarm has spoken</div><h2 class="turn-title">${win.map((i) => escape(game.players[i].name)).join(" & ")} ${win.length > 1 ? "tie" : "wins"}.</h2><p class="turn-description">${escape(game.message)}</p><div class="final-scores">${game.players.map((p, i) => `<div><span>${escape(p.name)}${p.bankrupt ? " · bankrupt" : ""}</span><strong>◈ ${money(worth(game, i))}</strong></div>`).join("")}</div><button class="button primary" id="play-again">Play again ${icon("arrow")}</button>`;
  }
  let action = "";
  if (game.paused)
    action = `<button class="button primary" id="resume">${icon("play")} Resume game</button>`;
  else if (game.phase === "roll")
    action = `<button class="button primary" id="roll" ${disabled ? "disabled" : ""}>${icon(p.jailed ? "clock" : "dice")}${rolling ? "Rolling…" : p.bot ? `${escape(p.name)} is thinking…` : p.jailed ? "Sit this turn out" : "Roll the dice"}${!rolling && !p.bot ? icon("arrow") : ""}</button>`;
  else if (game.phase === "buy")
    action = `<div class="purchase-info" style="--property-color:${GROUPS[s.group || ""] || "#b6a2e2"}"><span>Available to claim</span><strong>${escape(s.name)}</strong><div><span>Price <b>◈ ${s.price}</b></span><span>Base rent <b>${s.kind === "utility" ? "4× dice" : `◈ ${s.rent}`}</b></span></div></div><button class="button primary" id="buy" ${disabled || p.cash < s.price ? "disabled" : ""}>${p.bot ? "Considering the property…" : p.cash < s.price ? "Not enough credits" : `Buy for ◈ ${s.price}`}</button><button class="button secondary" id="skip" ${disabled ? "disabled" : ""}>Pass this turn</button>`;
  else
    action = `<button class="button primary" id="end-turn" ${disabled ? "disabled" : ""}>${p.bot ? "Finishing the turn…" : "End turn"} ${icon("arrow")}</button>`;
  return `<div class="turn-kicker"><span class="status-dot"></span>${game.paused ? "Game paused" : p.bot ? "Bot turn" : "Your turn"}<span class="turn-number">${String(game.current + 1).padStart(2, "0")} / ${String(game.players.length).padStart(2, "0")}</span></div><h2 class="turn-title">${game.paused ? "Take your time." : game.phase === "buy" ? "Make it yours." : `Your move, ${escape(p.name)}.`}</h2><p class="turn-description">${game.paused ? "The clock and bots are paused. Your seat is saved." : game.phase === "roll" ? (p.jailed ? "SitOnHands: skip this turn, then you’re free." : game.started ? escape(game.message) : "Every empire starts with a roll.") : escape(game.message)}</p>
  ${game.phase === "roll" || game.phase === "end" ? `<div class="dice-tray ${rolling ? "rolling" : ""}" role="img" aria-label="${game.started ? `Dice: ${game.dice[0]} and ${game.dice[1]}` : "Two dice, ready to roll"}">${die(game.dice[0])}${die(game.dice[1])}<span>${game.started ? `${game.dice[0] + game.dice[1]} on the dice` : "Fortune favors the swarm"}</span></div>` : ""}
  ${game.card ? `<div class="drawn-card">${icon("lore")} ${escape(game.card)}</div>` : ""}${action}<div class="turn-footnote">${icon("jail")} Play credits only. No real IMD.</div>`;
}
function rosterMarkup() {
  if (rosterView === "portfolio") {
    const properties = assets(game, game.current);
    return `<div class="portfolio-heading"><strong>${escape(game.players[game.current].name)}’s portfolio</strong><span>${properties.length} / 28</span></div>${properties.length ? properties.map((id) => `<button class="holding" data-space="${id}"><span class="holding-dot" style="background:${GROUPS[BOARD[id].group || ""] || "#b6a2e2"}"></span><span>${BOARD[id].name}</span><strong>◈ ${BOARD[id].price}</strong>${icon("arrow")}</button>`).join("") : `<div class="empty-portfolio">${icon("pass")}<strong>Your first launch is waiting.</strong><p>Land on an unowned property and buy it to start collecting rent.</p></div>`}<div class="portfolio-total"><span>Total net worth</span><strong>◈ ${money(worth(game, game.current))}</strong></div>`;
  }
  return `<div class="player-list">${game.players.map((p, i) => `<div class="player-row ${game.current === i ? "current-player" : ""} ${p.bankrupt ? "bankrupt" : ""}"><span class="player-avatar" style="--player:${TOKEN_COLORS[i]}">${icon(p.token)}</span><div class="player-info"><strong>${escape(p.name)}<span class="player-type">${p.bot ? "Bot" : "Human"}</span></strong><span>${p.bankrupt ? "Bankrupt" : p.jailed ? "SitOnHands · 1 turn" : `${assets(game, i).length} properties`}${game.current === i && game.phase !== "finished" ? '<span class="current-dot"> · Active</span>' : ""}</span></div><span class="player-balance">◈ ${money(p.cash)}</span></div>`).join("")}</div><div class="roster-summary"><span>${game.owners.filter((x) => x !== null).length} of 28 properties claimed</span><span>◈ = credits</span></div>`;
}
function updateTimer() {
  const t = game.remaining;
  $("#timer span").textContent =
    t === null
      ? "Untimed"
      : `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    storageOk = true;
  } catch {
    storageOk = false;
  }
  $("#save-status").textContent = !storageOk
    ? "Saving unavailable — keep this tab open"
    : restoreFailed
      ? "Unreadable save — fresh table ready"
      : "Progress saved on this device";
}
function render() {
  const focused = document.activeElement as HTMLElement | null;
  const key =
    focused?.id ||
    (focused?.dataset.space ? `space-${focused.dataset.space}` : "");
  const boardScroll = $(".board-scroll").scrollLeft;
  $("#turn-panel").innerHTML = turnMarkup();
  $("#board").innerHTML = boardMarkup();
  $(".board-scroll").scrollLeft = boardScroll;
  $("#roster").innerHTML = rosterMarkup();
  $("#feed").innerHTML = game.log.length
    ? `<ol class="activity-list">${game.log
        .slice(0, 5)
        .map(
          (l, i) =>
            `<li class="${i === 0 ? "latest" : ""}"><span class="activity-dot"></span><p>${escape(l.text)}</p><span class="activity-turn">T${l.turn}</span></li>`,
        )
        .join("")}</ol>`
    : `<div class="feed-empty"><span class="activity-dot"></span><p>A new swarm is gathering.<br><span>Roll the dice to write the first chapter.</span></p></div>`;
  $("#player-count").textContent = String(game.players.length);
  $("#mode-label").textContent =
    game.remaining === null ? "Untimed game" : "Quick game";
  $("#round-label").textContent = `Turn ${String(game.turn).padStart(2, "0")}`;
  $("#table-status").textContent =
    game.phase === "finished"
      ? "Game complete"
      : game.paused
        ? "Table paused"
        : game.started
          ? "Game in progress"
          : "Table ready";
  const pause = $<HTMLButtonElement>("#pause");
  pause.innerHTML = icon(game.paused ? "play" : "pause");
  pause.setAttribute("aria-label", game.paused ? "Resume game" : "Pause game");
  pause.disabled = rolling || game.phase === "finished";
  $<HTMLButtonElement>("#new-game").disabled = rolling;
  for (const view of ["players", "portfolio"]) {
    const tab = $(`#${view}-tab`);
    tab.classList.toggle("selected", view === rosterView);
    tab.setAttribute("aria-pressed", String(view === rosterView));
  }
  updateTimer();
  save();
  if (key && !dialog.open) {
    const next = key.startsWith("space-")
      ? document.querySelector<HTMLElement>(
          `#board [data-space="${key.slice(6)}"]`,
        )
      : document.getElementById(key);
    if (next && !(next as HTMLButtonElement).disabled)
      next.focus({ preventScroll: true });
    else if (focused?.closest("#turn-panel"))
      $("#turn-panel").focus({ preventScroll: true });
  }
  scheduleBot();
}
function dispatch(action: Action) {
  const prev = game;
  game = reduceGame(game, action);
  if (prev === game) return;
  render();
  $("#announcement").textContent = game.paused
    ? "Game paused."
    : `${game.players[game.current].name}’s turn. ${game.message}`;
}
function beep() {
  if (!sound) return;
  try {
    audio ||= new AudioContext();
    void audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
    osc.start();
    osc.stop(audio.currentTime + 0.2);
  } catch {
    /* Sound is optional; game remains playable. */
  }
}
function roll() {
  if (rolling || game.paused || game.phase !== "roll" || dialog.open) return;
  if (game.players[game.current].jailed) {
    dispatch({ type: "roll", dice: [1, 1], card: 0 });
    return;
  }
  rolling = true;
  render();
  beep();
  window.setTimeout(
    () => {
      rolling = false;
      dispatch({
        type: "roll",
        dice: [randomInt(6) + 1, randomInt(6) + 1],
        card: randomInt(CARDS.length),
      });
      render();
    },
    matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 650,
  );
}
function scheduleBot() {
  window.clearTimeout(botTimeout);
  if (
    !game.players[game.current].bot ||
    game.paused ||
    game.phase === "finished" ||
    rolling ||
    dialog.open ||
    document.hidden
  )
    return;
  botTimeout = window.setTimeout(() => {
    if (game.phase === "roll") roll();
    else dispatch(botAction(game));
  }, 1300);
}
function openDialog(html: string) {
  window.clearTimeout(botTimeout);
  returnFocus = document.activeElement as HTMLElement;
  $("#dialog-content").innerHTML = html;
  dialog.showModal();
}
function propertyDialog(id: number) {
  const s = BOARD[id],
    owner = game.owners[id],
    purchaseable = ["property", "pass", "utility"].includes(s.kind);
  const descriptions: Record<string, string> = {
    start: "Collect 200 credits each time you pass or land here.",
    jail: "Just visiting? Carry on. Sent here by Hands Off or a card? Skip your next turn. This is a game-only timeout; no tokens are locked.",
    park: "Take a breather. No fee, no reward. A good moment to touch grass.",
    gotojail:
      "Move straight to SitOnHands and skip your next turn. You do not collect Genesis credits on this move.",
    fee: `Pay ${s.price} play credits to the bank.`,
    lore: "Draw a random swarm lore card. Collect a grant, pay for a launch, or take a detour.",
    signal:
      "Draw a random signal card from the shared lore deck. Anything can happen.",
  };
  openDialog(
    `<div class="property-card-banner" style="--group:${GROUPS[s.group || ""] || "#b6a2e2"}"><span>${s.group || "Swarm space"}</span>${icon(s.kind === "property" ? "orb" : s.kind)}</div><div class="eyebrow modal-eyebrow">Space ${String(s.id + 1).padStart(2, "0")} / 40</div><h2 id="dialog-title">${s.name}</h2>${purchaseable ? `<p>${s.kind === "property" ? "A corner of the swarm to call your own." : s.kind === "pass" ? "More passes. More connections. More rent." : "Keep the swarm connected."}</p><dl class="property-stats"><div><dt>Purchase price</dt><dd>◈ ${s.price}</dd></div><div><dt>${owner !== null ? "Current rent" : "Base rent"}</dt><dd>${s.kind === "utility" ? `${owner === null ? "4" : rent(game, id, 1)}× dice total` : `◈ ${rent(game, id)}`}</dd></div><div><dt>Owner</dt><dd>${owner === null ? "Available" : escape(game.players[owner].name)}</dd></div></dl><p class="rule-note">${s.kind === "property" ? "Own every property in this color group to collect double base rent." : s.kind === "pass" ? "Rent with 1 / 2 / 3 / 4 passes: 25 / 50 / 100 / 200 credits." : "Rent is 4× the dice total with one utility, or 10× with both."}</p>${game.phase === "buy" && game.players[game.current].position === id ? '<p class="rule-note">Close this card to buy or pass using the turn controls.</p>' : ""}` : `<p>${descriptions[s.kind]}</p>`}<button class="button secondary" data-close>Back to the board</button>`,
  );
}
function rulesDialog() {
  openDialog(
    `<div class="eyebrow">A little strategy. A little chaos.</div><h2 id="dialog-title">How to play</h2><p>Build the biggest corner of the swarm. Play with 2–4 people on one device, or let bots take a seat.</p><ol class="rules-list"><li><strong>Roll & move.</strong> Move clockwise around 40 spaces. Passing Genesis pays 200 credits. Everyone starts with 1,500.</li><li><strong>Buy & collect.</strong> Buy available properties or pass. Landing on someone else’s property pays rent automatically. Full color sets earn double rent.</li><li><strong>Expect a detour.</strong> Cards give rewards, charge fees, or move you. Hands Off sends you to SitOnHands: skip one turn. Landing on SitOnHands is only a visit.</li><li><strong>Stay in the game.</strong> If you cannot cover a payment, you go bankrupt. Remaining cash goes to the creditor; properties return to the bank.</li><li><strong>Make it count.</strong> Last player standing wins. At the time limit, highest cash + property purchase value wins. Ties share the win.</li></ol><div class="rule-note"><strong>The v1 house rules</strong><p>No auctions, trading, mortgages, buildings, or extra turns for doubles. Passed properties stay available. Bots keep a 100-credit reserve. Lore and Signal use the same random deck, with replacement.</p><p>The clock starts on the first roll. Pausing, opening a dialog, or hiding the tab stops the clock and bots. Untimed play is available in New game.</p></div><p class="muted">All credits and launches are fictional. Onchain features are off and are not wired in this edition. No wallet is needed.</p><button class="button primary" data-close>Back to the game ${icon("arrow")}</button>`,
  );
}
function setupDialog() {
  openDialog(
    `<div class="eyebrow">A fresh start</div><h2 id="dialog-title">Gather your swarm.</h2><p>One screen, 2–4 players. Make room for friends or let the bots join in.</p><form id="setup-form"><div class="setup-options"><label>Players<select name="count" id="setup-count"><option value="2">2 players</option><option value="3" selected>3 players</option><option value="4">4 players</option></select></label><label>Game length<select name="minutes"><option value="10">10 minutes</option><option value="20" selected>20 minutes</option><option value="40">40 minutes</option><option value="0">Untimed</option></select></label></div><div id="setup-players"></div><p class="rule-note">Starting this game replaces the saved game on this device. Each player receives 1,500 play credits.</p><button class="button primary" type="submit">Start new game ${icon("arrow")}</button><button class="button secondary" type="button" data-close>Keep current game</button></form>`,
  );
  setupPlayers(3);
}
function setupPlayers(count: number) {
  const previous = Array.from(
    document.querySelectorAll<HTMLInputElement>("#setup-players input"),
  ).map((el, i) => ({
    name: el.value,
    bot: $<HTMLSelectElement>(`#setup-type-${i}`).value,
  }));
  $("#setup-players").innerHTML =
    Array.from(
      { length: count },
      (_, i) =>
        `<div class="setup-player"><span class="player-avatar" style="--player:${TOKEN_COLORS[i]}">${icon(["imp", "seat", "dog", "orb"][i])}</span><label>Player ${i + 1}<input name="player-${i}" id="setup-name-${i}" value="${escape(previous[i]?.name || ["Imp", "Seat", "Dog", "Orb"][i])}" maxlength="20" required autocomplete="off" /></label><label>Controlled by<select name="type-${i}" id="setup-type-${i}" ${i === 0 ? 'aria-describedby="human-note"' : ""}><option value="human">Human</option>${i > 0 ? `<option value="bot" ${previous[i]?.bot !== "human" ? "selected" : ""}>Bot</option>` : ""}</select></label></div>`,
    ).join("") +
    '<span class="sr-only" id="human-note">Player 1 is always human.</span>';
}
document.addEventListener("click", (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return;
  if (button.dataset.space !== undefined) {
    propertyDialog(Number(button.dataset.space));
    return;
  }
  if (button.dataset.deck) {
    openDialog(
      `<div class="eyebrow">The shared lore deck</div><h2 id="dialog-title">${button.dataset.deck === "lore" ? "Swarm lore" : "Signal drop"}</h2><p>Land on a card space to draw one of these eight stories. The effect happens automatically.</p><ul class="card-preview-list">${CARDS.map((c) => `<li>${icon("lore")}<div><strong>${c.title}</strong><p>${c.text}</p></div></li>`).join("")}</ul><button class="button secondary" data-close>Back to the board</button>`,
    );
    return;
  }
  if (button.hasAttribute("data-close") || button.id === "close-dialog") {
    dialog.close();
    return;
  }
  switch (button.id) {
    case "roll":
      roll();
      break;
    case "buy":
      dispatch({ type: "buy" });
      break;
    case "skip":
      dispatch({ type: "skip" });
      break;
    case "end-turn":
      dispatch({ type: "end" });
      break;
    case "pause":
    case "resume":
      dispatch({ type: "pause" });
      break;
    case "new-game":
    case "play-again":
      setupDialog();
      break;
    case "rules":
      rulesDialog();
      break;
    case "sound":
      sound = !sound;
      button.innerHTML = icon(sound ? "sound" : "mute");
      button.setAttribute("aria-pressed", String(sound));
      button.setAttribute(
        "aria-label",
        sound ? "Disable sound" : "Enable sound",
      );
      beep();
      break;
    case "players-tab":
    case "portfolio-tab":
      rosterView = button.id.split("-")[0];
      render();
      break;
  }
});
document.addEventListener("change", (e) => {
  const target = e.target as HTMLSelectElement;
  if (target.id === "setup-count") setupPlayers(Number(target.value));
  if (target.id === "space-picker" && target.value) {
    propertyDialog(Number(target.value));
    target.value = "";
  }
});
document.addEventListener("submit", (e) => {
  if ((e.target as HTMLElement).id !== "setup-form") return;
  e.preventDefault();
  const data = new FormData(e.target as HTMLFormElement),
    count = Number(data.get("count"));
  const config = Array.from({ length: count }, (_, i) => ({
    name: String(data.get(`player-${i}`)),
    bot: data.get(`type-${i}`) === "bot",
  }));
  const blank = config.findIndex((p) => !p.name.trim());
  if (blank >= 0) {
    const field = $<HTMLInputElement>(`#setup-name-${blank}`);
    field.setCustomValidity(
      "Enter a name with at least one visible character.",
    );
    field.reportValidity();
    field.addEventListener("input", () => field.setCustomValidity(""), {
      once: true,
    });
    return;
  }
  game = createGame(config, Number(data.get("minutes")));
  rosterView = "players";
  restoreFailed = false;
  dialog.close();
  render();
  $("#turn-panel").focus();
  $("#announcement").textContent = "New game started. Player 1, roll the dice.";
});
dialog.addEventListener("close", () => {
  if (returnFocus?.isConnected) returnFocus.focus();
  else if (returnFocus?.dataset.space) {
    document
      .querySelector<HTMLElement>(
        `#board [data-space="${returnFocus.dataset.space}"]`,
      )
      ?.focus();
  } else $("#turn-panel").focus({ preventScroll: true });
  scheduleBot();
});
dialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
    ),
  ).filter((element) => element.getClientRects().length > 0);
  const first = focusable[0],
    last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearTimeout(botTimeout);
  else scheduleBot();
});
window.setInterval(() => {
  if (game.paused || dialog.open || document.hidden || rolling) return;
  const previous = game;
  game = reduceGame(game, { type: "tick" });
  if (previous !== game) {
    if (game.phase === "finished") {
      render();
      $("#announcement").textContent = `Time is up. ${winners(game)
        .map((i) => game.players[i].name)
        .join(" and ")} wins.`;
    } else {
      updateTimer();
      save();
    }
  }
}, 1000);
render();
