# Swarmopoly design system

## Overview

Swarmopoly is an informal board game for the Identity MD community. The implemented direction is a dark arcade table: near-black chrome, a deep-purple board, bright IMD-green actions, muted property color bands, and original outlined Imp/Seat/Dog/Orb tokens. It uses typography, a geometric mascot, and a faint static scanline texture rather than external illustrations.

The page establishes the game name and then gives the board and the current turn most of the space. Desktop places the board beside the controls. The DOM puts the controls first so keyboard and narrow-screen users reach the next action quickly. One filled green action represents the current decision. Secondary actions remain neutral. Rules and details use dialogs instead of expanding the main table.

Source of truth: [src/style.css](src/style.css), [src/main.ts](src/main.ts), [src/icons.ts](src/icons.ts), and the category values in [src/game.ts](src/game.ts). This describes the final implementation, not a proposed component library.

## Colors

Canonical CSS values are sRGB hex. The site implements one dark theme.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#101014` | Page background |
| `--surface` | `#19191f` | Turn, player, activity, and dialog surfaces |
| `--raised` | `#212128` | Secondary buttons |
| `--board` | `#1c1b25` | Board spaces |
| `--center` | `#16161e` | Insets, form controls, purchase cards |
| `--text` | `#f0f0f2` | Primary text |
| `--muted` | `#a4a2b0` | Descriptions, field labels, secondary metadata |
| `--subtle` | `#9894aa` | Small supporting metadata and timestamps |
| `--line` | `#35333f` | Separators and secondary outlines |
| `--accent` | `#b6f85d` | Primary action, brand, current-turn markers |
| `--accent-hover` | `#c7ff7f` | Primary button hover |
| `--on-accent` | `#18210d` | Primary action label |
| `--focus` | `#d5ff9d` | Keyboard focus perimeter |
| `--purple` | `#bca0ff` | Lore cards and supporting game illustration |

`GROUPS` in `src/game.ts` maps Origin `#b6a2e2`, Signal `#85d8ec`, Factory `#e987c3`, Culture `#f6b37b`, Collective `#f38686`, Launch `#e9d47c`, Frontier `#a6d493`, and Legacy `#969ef3`. These are property categories, repeated on the tile stripe and the detail/purchase card. Do not use them to imply different action priority.

`TOKEN_COLORS` assigns Imp `#b6f85d`, Seat `#bca0ff`, Dog `#ffb57b`, and Orb `#86ddea`. Player identity also appears as a distinct shape and name. Current-player and bankrupt states have text as well as visual treatment. Avatar backgrounds and borders use `color-mix()` with their assigned player color.

Measured rendered solid pairs: primary button 13.13:1, turn description 6.98:1, activity timestamp 5.96:1, and page title 16.68:1. See the validation report for foreground/background values. These measurements do not certify every pixel over the center's gradient and scanlines.

## Typography

`--font` is `"Space Grotesk", Arial, sans-serif`. The bundled `public/fonts/space-grotesk-latin.woff2` is a variable normal-style font supporting weights 400–700. `font-display: swap` is set. The browser confirmed the font loaded. `font-synthesis: none` is applied at the root; no italic face is used. Characters outside the Latin subset can use the system fallback.

`--mono` is `"SFMono-Regular", Consolas, "Liberation Mono", monospace`. It is reserved for timer/turn data, board prices, and arcade metadata; no additional font download is required.

- Root: 16px, line-height 1.5; body smoothing is defined once at `:root`.
- Page title: `clamp(1.6rem, 2.55vw, 2.2rem)`, weight 600, line-height 1.2, letter-spacing −1.2px. Compact layouts use 26–27px and −0.8px.
- Turn title: 26px/1.2, weight 600, −0.8px; 23–29px at the implemented breakpoints. Dialog titles are 30px/1.2, −1px, reducing to 27px on narrow screens.
- Primary buttons: 14px, weight 600, line-height 1.4. Inputs/selects use 16px, except the board selector uses 14px at intermediate widths and returns to 16px at 470px and below.
- Turn descriptions: 12–13px/1.6; dialog prose: 13px/1.65 with a 65-character maximum measure. Prose uses `text-wrap: pretty`; headings use `text-wrap: balance`.
- Player names: 12–13px, weight 600; balances: 12–14px. Balances and the timer use tabular numerals.
- The board is deliberately dense: names are 8–11px; prices and decorative metadata can be 6–9px. Full readable details are available through every tile button and the labeled space selector. Essential purchase decisions use the larger turn card. Board labels are not the only path to their information.
- Uppercase eyebrow styles use CSS text transformation and positive tracking. Player names wrap and are limited to 20 characters; inserted player content is escaped.

## Layout

Header, main, and footer share a 1,280px maximum width. Desktop inline padding is 48px; it reduces to 30px, 24px, 20px, then 16px. Common interior gaps use 4, 8, 12, 16, 20, 24, and 32px. Controls use 48px minimum-height primary buttons, 44px fields, and 32–38px utility buttons. Board tile targets remain at least 24px across at the tested sizes.

`.game-layout` has a flexible board column and a 326px sidebar, with a 24px gap. At 1440px and above the sidebar becomes 350px and the gap 30px. At 1170px it becomes 290px/20px; at 1000px it becomes 274px/16px.

At 760px and below, the main arrangement stacks. The controls use a two-column subgrid, with the turn card beside players and activity. At 470px and below those panels become a single column. The compact header retains the named rules button as an icon and the New game action. The page itself does not scroll horizontally in the tested 320–1440px range.

The board is an 11×11 CSS grid with perimeter spaces and a center spanning rows/columns 2–10. Corners have 1.3fr tracks; other tracks use 1fr. `boardPosition()` maps the 40 spaces clockwise, beginning at bottom-right. The board keeps an intentional minimum width: 590px normally, 540px below 1170px, and 580px below 760px. `.board-scroll` contains horizontal scrolling where needed. A cue appears above the board at 1000px and below. The labeled selector is visible at every width as an equivalent way to inspect all spaces.

At 1170px and below, special-space captions are hidden and corner icons/names become smaller to keep the tiles legible and contained. The dialog and accessible button name retain the complete information. Small screens show two recent activity entries; desktop shows up to five. The saved log retains up to 60 entries.

Observed widths: 1440, 1000, 760, 390, 320 CSS pixels. Root text enlargement to 200% was checked separately; native browser zoom, RTL layouts, and non-English variants were not verified.

## Elevation & Depth

Panels use a light `#ffffff0d` 1px shadow ring on a tonal surface. The active turn card has a 2px green top border. The board uses a `#4c4759` outline and a dark 12px/45px ambient shadow. Tile dividers communicate the board grid and remain physical borders/gaps.

The board center has a purple-to-black radial gradient with faint 4px static horizontal scanlines. The scanline pseudo-element ignores pointer events. The mascot's restrained green drop shadow provides CRT-like glow. The two lore deck buttons use offset shadows resembling a small card stack.

Dialogs use the native top layer, a `#0b0a10c9` backdrop with a 5px blur, and a dark 24px/100px shadow. The dice have a 5px solid bottom edge and a soft ambient shadow; their only movement is an explicit roll.

## Shapes

`--radius: 12px` defines panels. Buttons and fields use 7px. Player avatars use 8px. The board wrapper uses 10px, with 6px internal corners. Dialogs use 16px, reducing to 12px on the narrowest layout. Tokens use circles; their original SVG silhouette distinguishes the player even without color. The property group stripe is flat and chunky, not a gradient.

## Components

| Pattern / function | Location | Use and states |
| --- | --- | --- |
| `.button`, `.primary`, `.secondary`, `.compact` | `src/style.css` | One filled action per decision; neutral secondary controls. Hover, visible focus, pressed, and disabled states. Disabled actions include explicit explanations such as insufficient credits or bot thinking. |
| `turnMarkup()` | `src/main.ts` | Human/bot turn, rolling, purchase, end turn, paused, and winner states. Persistent outside live region announces changes without making the clock a live announcement. |
| `boardMarkup()` / `boardPosition()` | `src/main.ts` | Native tile buttons with descriptive names, group stripes, ownership symbols, and player markers. Center deck buttons preview the eight possible cards; they do not draw for free. |
| `rosterMarkup()` | `src/main.ts` | Player list and active player's portfolio, switched by `aria-pressed` buttons. Empty portfolio explains how to acquire the first property. Holdings open the property inspector. |
| `propertyDialog()` | `src/main.ts` | Group-colored card, price, current/base rent, owner, and complete rules. Purchases remain in the turn controls to prevent two competing purchase flows. |
| `setupDialog()` / `setupPlayers()` | `src/main.ts` | Labeled fields for player count, duration, names, and controller types. Native required/max-length validation; whitespace-only names get a corrective error. Starting explicitly replaces the saved game. Cancel preserves it. |
| `openDialog()` and dialog listeners | `src/main.ts` | Native modal with background inertness, Tab/Shift+Tab wrapping, Escape dismissal, close button, and trigger focus return. Bots and clock stop during inspection. |
| `icon(name, cls)` / `die(n)` | `src/icons.ts` | One SVG path map using `currentColor`, typically 1.7px stroke. Decorative SVG/dice children are hidden from assistive technology; the parent dice group has the meaningful label. |
| `save()` / `readSave()` | `src/main.ts`, `src/game.ts` | Visible storage failure/recovery notices. Invalid saved structure cannot break rendering. Gameplay continues if saving is unavailable. |

Keyboard focus is a 2px `--focus` outline with 4px offset; board outlines are inset to remain visible inside the grid. The skip link jumps to the turn controls. Tested dialog focus returns to its trigger; a replaced board trigger has a fallback lookup.

Motion is opt-in under `prefers-reduced-motion: no-preference`: 150ms button color/press transitions, 0.96 pressed scale, and a single 650ms dice animation with `cubic-bezier(.2, 0, 0, 1)`. Reduced-motion mode removes the animation and resolves the roll after 80ms. No ambient animation runs on load. Hover effects are gated by hover capability. Forced-colors CSS supplies native-colored borders and focus; physical forced-colors device behavior was not tested.

## Do’s and don’ts

- Start related surfaces with the shared width/margins and `.panel`; keep the current task ahead of supplementary game information.
- Use the accent fill for the next game action, category hues for properties, and `TOKEN_COLORS` for identities. Preserve text/icon cues alongside color.
- Keep full game information in the turn card or inspector. Do not require reading miniature board captions to make a purchase decision.
- Reuse native buttons, selects, and the dialog pattern. Keep the skip link, focus ring, reduced-motion handling, and storage notices.
- To add a local help view, add content to the dialog pattern with a descriptive title and one clear return action; do not introduce another router or a new design palette.
- Do not place wallet, yield, or real-token implications in the play-credit flow. Optional onchain work is not implemented in this edition.
