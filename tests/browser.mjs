import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { createGame, SAVE_KEY, BOARD } from "../src/game.ts";

// The toolchain override keeps installed dependencies outside constrained workspaces.
const require = createRequire(
  process.env.SWARMOPOLY_TOOLCHAIN ||
    new URL("../package.json", import.meta.url),
);
const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const root = resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!path.startsWith("/preview/")) {
      res.writeHead(404).end();
      return;
    }
    const file = resolve(root, path.slice("/preview/".length) || "index.html");
    if (!file.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
let browser;
const results = [],
  faults = [];
const check = (name, details = "Pass") => {
  results.push({ name, details });
  console.log(`PASS ${name}`);
};
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SWARMOPOLY_CHROMIUM || undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => faults.push(error.message));
  page.on("requestfailed", (req) =>
    faults.push(`${req.url()}: ${req.failure()?.errorText}`),
  );
  page.on("response", (res) => {
    if (res.status() >= 400) faults.push(`${res.status()} ${res.url()}`);
  });
  const state = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
  const load = async (g) => {
    await page.evaluate(
      ({ key, g }) => localStorage.setItem(key, JSON.stringify(g)),
      { key: SAVE_KEY, g },
    );
    await page.reload();
  };
  const audit = async (name) => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
      .analyze();
    assert.deepEqual(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          failureSummary: n.failureSummary,
        })),
      })),
      [],
      name,
    );
    check(
      `axe: ${name}`,
      `${result.passes.length} rules passed; ${result.incomplete.length} require manual review`,
    );
  };
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator("#board > .space").count(), 40);
  assert.ok(
    await page.evaluate(() => document.fonts.check('600 16px "Space Grotesk"')),
  );
  check(
    "Production export, 40 board spaces, local font loaded under /preview/",
  );
  await audit("desktop initial state");

  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "skip-link",
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "turn-panel",
  );
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "roll");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.querySelector(".rolling"));
  let g = await state();
  assert.ok(g.started);
  assert.ok(g.dice.every((d) => d >= 1 && d <= 6));
  if (g.phase === "buy") await page.locator("#buy").click();
  await page.locator("#end-turn").click();
  await page.waitForFunction(
    (key) => {
      const g = JSON.parse(localStorage.getItem(key));
      return g.current === 0 && g.turn === 4;
    },
    SAVE_KEY,
    { timeout: 20000 },
  );
  check("Keyboard roll and both bots resolve their turns");

  await page.locator("#pause").click();
  const paused = await state();
  await page.waitForTimeout(1200);
  assert.equal((await state()).remaining, paused.remaining);
  await page.reload();
  assert.equal((await state()).paused, true);
  await page.locator("#resume").click();
  assert.equal((await state()).paused, false);
  check("Pause freezes clock, survives reload, resumes");

  const buy = createGame();
  buy.phase = "buy";
  buy.started = true;
  buy.players[0].position = 3;
  buy.message = "Seed Seat is available.";
  await load(buy);
  await page.locator("#buy").click();
  assert.equal((await state()).players[0].cash, 1440);
  assert.equal((await state()).owners[3], 0);
  await page.locator("#portfolio-tab").click();
  assert.match(await page.locator("#roster").innerText(), /Seed Seat/);
  await page.locator(".holding").click();
  assert.match(await page.locator("dialog").innerText(), /Owner\s+Imp/);
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "holding",
  );
  check(
    "Buy updates balance, portfolio and property card; Escape restores focus",
  );
  await load(buy);
  await page.locator("#skip").click();
  assert.equal((await state()).owners[3], null);
  assert.equal((await state()).phase, "end");
  buy.players[0].cash = 10;
  await load(buy);
  assert.equal(await page.locator("#buy").isDisabled(), true);
  await page.locator("#skip").click();
  check("Pass and insufficient-credit recovery");

  for (const count of [2, 4]) {
    await page.locator("#new-game").click();
    await page.locator("#setup-count").selectOption(String(count));
    await page.locator("[name=minutes]").selectOption("0");
    for (let i = 0; i < count; i++) {
      await page.locator(`#setup-name-${i}`).fill(`Local ${i + 1}`);
      if (i) await page.locator(`#setup-type-${i}`).selectOption("human");
    }
    await page.locator("#setup-form button[type=submit]").click();
    g = await state();
    assert.equal(g.players.length, count);
    assert.equal(g.remaining, null);
    assert.ok(g.players.every((p) => !p.bot));
    await page.locator("#roll").click();
    await page.waitForFunction(() => !document.querySelector(".rolling"));
    if ((await state()).phase === "buy") await page.locator("#skip").click();
    await page.locator("#end-turn").click();
    assert.equal((await state()).current, 1);
    assert.equal(await page.locator("#roll").isEnabled(), true);
  }
  check("2- and 4-human setup and local turn handoff; untimed mode");
  await page.locator("#new-game").click();
  await page.locator("[data-close]").click();
  assert.equal((await state()).players.length, 4);
  check("New-game cancellation preserves saved match");

  const finish = createGame();
  finish.started = true;
  finish.remaining = 1;
  finish.players[0].cash = 1800;
  await load(finish);
  await page.waitForSelector("#play-again");
  assert.match(await page.locator("#turn-panel").innerText(), /Imp wins/);
  check("Timer ending shows correct winner and replay action");

  await page.evaluate(
    (key) => localStorage.setItem(key, "{bad json"),
    SAVE_KEY,
  );
  await page.reload();
  assert.match(
    await page.locator("#save-status").innerText(),
    /Unreadable save/,
  );
  assert.equal((await state()).turn, 1);
  check("Corrupt saved game recovers to a usable fresh table");

  await load(createGame());
  for (const width of [1440, 1000, 760, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `page overflow at ${width}`,
    );
    await page.locator("#rules").click();
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "close-dialog",
    );
    await page.keyboard.press("Shift+Tab");
    assert.ok(
      await page.evaluate(() => !!document.activeElement.closest("dialog")),
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.id), "rules");
    check(`${width}px reflow, rules dialog focus trap and restore`);
    if (width === 1440 || width === 320)
      await audit(`${width}px initial state`);
  }
  await page.locator("#new-game").click();
  await page.locator("#setup-count").selectOption("4");
  await audit("320px four-player setup");
  assert.ok(
    await page
      .locator("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  );
  await page.keyboard.press("Escape");
  await page.locator("#space-picker").selectOption("39");
  assert.match(await page.locator("#dialog-title").innerText(), /Identity HQ/);
  await audit("320px property dialog");
  await page.keyboard.press("Escape");
  check("All 40 spaces accessible through narrow-screen selector");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#roll").click();
  assert.equal(
    await page
      .locator(".die")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.waitForFunction(() => !document.querySelector(".rolling"));
  check("Reduced-motion roll has no dice animation");

  await load(createGame());
  await page.setViewportSize({ width: 760, height: 1000 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#rules").click();
  assert.ok(
    await page
      .locator("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  check(
    "200% root text sizing: page and dialog do not overflow (not native browser zoom)",
  );

  const denied = await browser.newPage();
  await denied.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "setItem", {
      value() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  await denied.goto(url);
  assert.match(
    await denied.locator("#save-status").innerText(),
    /Saving unavailable/,
  );
  await denied.locator("#roll").click();
  await denied.waitForFunction(() => !document.querySelector(".rolling"));
  assert.ok(await denied.locator("#buy, #end-turn").count());
  await denied.close();
  check("Blocked storage reports limitation and game remains playable");

  await page.setViewportSize({ width: 1440, height: 1100 });
  await load(createGame());
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  await page.locator("#new-game").click();
  await page.screenshot({ path: "artifacts/setup.png" });
  assert.deepEqual(faults, []);
  check("No failed resources or uncaught browser errors");
  await writeFile(
    "artifacts/browser-results.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: await browser.version(),
        urlPath: "/preview/",
        results,
        errors: faults,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`${results.length} browser checks passed.`);
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
