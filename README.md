# Swarmopoly v1

An original, local board game for the Identity MD swarm. Roll around 40 spaces, buy fictional launches, collect rent, draw lore cards, and try to outlast the table. The finished static site is in **`dist/`**; its source, package manifest, and npm lockfile are included.

## Play

The default table has one human (Imp) and two bots (Seat and Dog). Select **Roll the dice** to begin. **New game** configures 2–4 players, human/bot seats, names, and a 10-, 20-, 40-minute or untimed match. Player 1 is always human. The fourth token is an Orb.

- Start with 1,500 play credits. Passing or landing on Genesis pays 200.
- Buy an available property, or pass. Land on another player’s property to pay rent automatically. Complete color sets double base rent.
- Pass rent increases with the number of passes owned; utility rent uses the dice total. Inspect any space for the exact rule.
- Lore and Signal draw from the same eight-card deck, with replacement.
- Hands Off and the Diamond Hands card send you to SitOnHands. Skip your next turn; visiting the space normally has no penalty.
- Insufficient cash for a payment causes bankruptcy. The creditor receives remaining cash; properties return to the bank. There are no mortgages or asset sales.
- Last solvent player wins. At timeout, cash plus purchase value of properties decides the winner. Equal totals share the win.
- No auctions, trades, buildings, or extra turns for doubles in this edition.

The clock starts on the first roll and measures active play. Pause, open dialogs, hidden tabs, and dice animations stop the clock. Bots stop while paused, while a dialog is open, or while the tab is hidden. Sound is off initially and can be enabled beside the timer.

Progress saves automatically in `localStorage` under `swarmopoly.v1`. Refresh resumes the saved match. If storage is blocked, the game still runs and displays a notice. Malformed saves recover to a fresh table. Saves are local to the browser origin, editable, and intended for a single open tab. They are not synchronized or tamper-proof. New game explicitly replaces the current save.

## Install, develop, and preview

Use Node.js **22.18+ or 24** and npm. Node 24.21.0 was used for this delivery.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To rebuild and preview the production export:

```sh
npm run typecheck
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

To preview the already-built export without Node dependencies, serve it over HTTP:

```sh
python3 -m http.server 8080 --directory dist --bind 127.0.0.1
```

Open `http://127.0.0.1:8080/`. Use HTTP/HTTPS instead of double-clicking `index.html`; browser module security prevents reliable `file://` use.

The game makes no runtime API calls. Fonts, icons, scripts, and styles are local. Internet is needed for an initial dependency installation or to first load a remotely hosted site, but not for gameplay. There is no service worker or promise of offline reload caching.

## Publish

1. Run the checks and `npm run build` after source changes.
2. Include **the entire `dist/` directory** in the submission, including `dist/index.html`, `dist/assets/`, `dist/fonts/`, and `dist/favicon.svg`. The publishing service serves this export and does not rebuild it.
3. Set a static host’s publish directory to `dist`, or upload the contents of `dist/` to an IMD site. For IPFS, add the whole directory and use its directory CID.
4. Use a directory URL ending in `/`. Vite’s `base: './'` produces relative script, stylesheet, and font URLs; the export was tested under `/preview/`. No server rewrites, backend, keys, wallet, or environment files are required.

Keep source, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `public/`, documentation, tests, and the export. Do **not** submit `node_modules`, package caches, browser installations, `.playwright-mcp`, scratch output, dependency tarballs, or registry mirrors at any level. No ignore file was created or changed. In this constrained workspace, dependencies were installed under `/tmp`. Temporary Vite/formatter caches were removed before delivery; no dependency directory remains in the repository. Normal development can use `npm ci` as above; exclude its generated dependency directory from any later submission.

## Verification

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser test starts its own temporary static server, serves the production export under `/preview/`, runs interactions and axe scans, writes evidence under `artifacts/`, and closes the server/browser. It requires Playwright Chromium; on a minimal Linux system install its system dependencies with Playwright’s documented installation mechanism.

Actual worker results:

- TypeScript `tsc --noEmit`: passed.
- Vite 8.3.3 production build: passed; all asset URLs are relative.
- Node rules tests: **17 passed**, including 100 seeded full-game simulations.
- Production browser suite: **24 checks passed**, including five axe scans with zero detected violations. Viewports: 1440, 1000, 760, 390, and 320 CSS pixels.
- Confirmed roll/buy/pass/end-turn, both bots, 2/4 human tables, setup cancellation, portfolios, property inspection, keyboard skip link/dialog focus, pause/resume, refresh persistence, corrupt/blocked storage, timer winner, and reduced motion.
- No uncaught browser errors or failed resources in the automated suite. `npm audit` reported zero known vulnerabilities at validation time.

The worker used an external dependency installation to respect the repository restriction:

```sh
PATH=/tmp/swarmopoly-toolchain/node_modules/.bin:$PATH npm run typecheck
PATH=/tmp/swarmopoly-toolchain/node_modules/.bin:$PATH npm run build
SWARMOPOLY_TOOLCHAIN=/tmp/swarmopoly-toolchain/package.json \
SWARMOPOLY_CHROMIUM=/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
npm run test:browser
```

Those optional overrides are for this environment; standard installation does not need them. Full review, repaired findings, contrast measurements, and limitations are in [artifacts/validation.md](artifacts/validation.md). Machine results: [artifacts/browser-results.json](artifacts/browser-results.json). Screenshots: [desktop](artifacts/desktop.png), [mobile](artifacts/mobile.png), [setup](artifacts/setup.png).

Limits: Chromium was tested; Firefox, Safari, physical touch devices, and screen readers were not. Root text enlargement and narrow reflow were checked, not native browser 200% zoom. The dense board intentionally scrolls horizontally on small screens; all 40 spaces also have a labeled selector and readable detail dialog. Rules intentionally simplify the traditional property-board loop.

## Optional mainnet / SitOnHands path

**Off and not implemented in v1.** There is no wallet connection, RPC, price feed, approval, lock call, or feature switch that enables an incomplete transaction. SitOnHands is purely a one-turn game timeout. Credits are fictional and are not IMD; this project creates no token or yield product.

Assignment-provided addresses, recorded only for a future integration:

- Ethereum mainnet chain ID: `1`.
- SitOnHands vault: `0x20bcc5c678b0beea9a042cd03e3abc36d00e734a`.
- IMD token: `0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7`.

The deployed ABI, contract behavior, decimals, allowances, and addresses have **not** been independently verified here. A future opt-in integration must verify these first, reject other chains, keep offline play independent, and show the precise token amount, allowance spender, 1–365-day duration, and unlock date. It must prominently state **“No early exit”** before consent, request approval for the exact chosen amount, wait for its receipt, then request the verified lock call and handle its receipt, rejection, and failure separately. This describes required future work, not a supported path in this build.

## Source map

- `src/game.ts`: board, cards, immutable game transitions, bot decisions, scoring, saved-state validation.
- `src/main.ts`: DOM views, interactions, dialogs, timer, persistence, optional synthesized sound.
- `src/icons.ts`: original inline SVG tokens/icons and dice.
- `src/style.css`: final tokens, components, responsive layout, reduced-motion and forced-colors rules.
- `public/fonts/`: local Space Grotesk variable font and OFL license.
- `tests/`: deterministic rules tests and actual-export browser checks.
- [DESIGN.md](DESIGN.md): implemented design system.
- [artifacts/NOTICE.md](artifacts/NOTICE.md): design-guide and font attribution.
