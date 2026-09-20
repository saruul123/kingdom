# Монгол хаант улс

2D side-scrolling steppe survival / kingdom-building game (spec: `../project.md`).
Canvas 2D + TypeScript, served by TanStack Start. The whole UI is in Mongolian (`src/game/i18n.ts`;
unit/building/enemy names live in the `label` fields of `src/game/config/*.json`).

```bash
npm run dev      # http://localhost:3000
npm test         # headless simulation tests (a bot plays the MVP loop)
npm run lint
```

Add `?debug=1` to the URL for an FPS/state overlay, `window.__game`, and
`&speed=3` (time multiplier) / `&seed=N` (deterministic world).

## Controls

| Key           | Action                                             |
| ------------- | -------------------------------------------------- |
| ← → / A D     | Ride (давхих)                                      |
| Shift         | Gallop (stamina)                                   |
| E / ↓ / Space | Recruit, build, make Archer/Builder at a tool rack |
| P / Esc       | Pause                                              |

## Status

Development phases 1–5 of the spec (the MVP loop) are implemented:
explore → coins → recruit → Archer/Builder → wall & tower → sunset → night raid →
archers defend, builders repair → sunrise. Autosave at every sunrise and on exit;
game over when the banner leaves your territory or the Central Ger falls.
Phases 6–9 (horsemen, territory, trade, boss nights…) are not started.

## Gameplay systems beyond the core loop

- **Upgrades:** walls and towers can be upgraded once (data in `config/buildings.json` → `upgrades`);
  builders do the work. Upgraded towers hold 3 archers and shoot further.
- **Raid warning:** the night's wave is planned at dusk; the HUD shows how many raiders come from each side,
  and off-screen raiders get edge arrows at night.
- **Income that never runs out:** a dawn tax is left at the ger (`economy.tax`), new treasure caches keep
  appearing (`caches.respawnPerDay`, closer to home via `respawnMinX`), and herders at a **pasture**
  (`buildings.json` → `pasture`, `professions.json` → `herder`) produce a coin every few seconds.
- **Loot:** raiders may drop a coin (`coinDropChance` in `config/enemies.json`).
- **UX:** next-step objective with a pointer, population panel, fog-of-war map (fills in as you explore),
  floating `+N` / `-N`, hold the action key to repeat, auto-pause when the tab is hidden, remembered mute.

## Expansion systems (spec phases 6–9)

- **Enemies:** bandits, archer raiders (ranged), horse raiders (fast, hunt citizens), heavy soldiers
  and siege rams (gates/walls first, big structure damage) — all data in `config/enemies.json` /
  `config/waves.json`. Every 7th night is a **boss night** (bigger raid, reward chest).
- **Hero combat:** hold `F` (or `J`) to shoot raiders, game and enemy camps. Wolves bite.
- **Enemy camps → outposts:** camps keep guards and add raiders to every night's raid. Destroy one for loot,
  then pay for an **outpost**: builders raise it, the border moves out and new build points open.
- **Eras:** upgrade the central ger (kingdom level 1→4) to unlock gates, stables, markets, stone walls,
  stronger towers and relay stations (`minKingdomLevel` in the building data).
- **Horsemen** (stable) patrol and charge raiders. **Traders** (market) run routes to camps/outposts —
  longer routes pay more. **Örtöö** relay stations give the hero speed and fast travel.
- **Steppe events:** offerings at ovoos (blessing / coins), wells (stamina + speed), ruins (loot, sometimes an ambush).
- **Meta:** difficulty (menu), 11 achievements (pause menu), generative music, autosave + exit save.

## Layout (`src/game`)

- `config/*.json` — all balance data (times, costs, HP, enemies, waves, world). Rebalance here.
- `core/` — plain-data `GameState` and entity types, event bus, seeded RNG.
- `systems/` — Time, World, Economy, Recruitment, Profession, Building, Construction,
  Combat, Damage, Enemy, Wave, Territory, Save, Player. They talk via `ctx.sys`
  interfaces (`core/context.ts`) and the event bus, never via `GameManager`.
- `ai/` — state machines for archers, builders, citizens and enemies.
- `render/` + `ui/` — pixel-art canvas renderer (low-res buffer, nearest-neighbour upscale), HUD, audio. Reads state only.
  The look is deliberately plain for readability: flat low-contrast backdrop, a 1px dark outline on every sprite,
  coloured discs under units (allies green, raiders red, neutrals white, hero gold) and job badges on workers.
  Hero sprites come from `src/assests/model.png` via `scripts/extract-hero-sprites.py` → `src/assests/sprites/hero.png`;
  `cover.png` is the menu background; everything else is drawn procedurally in `render/sprites.ts` / `atmosphere.ts`.
- `GameManager.ts` — composition root; `GameShell.tsx` — React menu/pause/game-over shell.

State is JSON-serialisable, so saves are just `JSON.stringify(state)`.

# kingdom
