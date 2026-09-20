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

| Key | Action |
| --- | --- |
| ← → / A D | Ride (давхих) |
| Shift | Gallop (stamina) |
| E / ↓ / Space | Recruit, build, make Archer/Builder at a tool rack |
| P / Esc | Pause |

## Status

Development phases 1–5 of the spec (the MVP loop) are implemented:
explore → coins → recruit → Archer/Builder → wall & tower → sunset → night raid →
archers defend, builders repair → sunrise. Autosave at every sunrise and on exit;
game over when the banner leaves your territory or the Central Ger falls.
Phases 6–9 (horsemen, territory, trade, boss nights…) are not started.

## Layout (`src/game`)

- `config/*.json` — all balance data (times, costs, HP, enemies, waves, world). Rebalance here.
- `core/` — plain-data `GameState` and entity types, event bus, seeded RNG.
- `systems/` — Time, World, Economy, Recruitment, Profession, Building, Construction,
  Combat, Damage, Enemy, Wave, Territory, Save, Player. They talk via `ctx.sys`
  interfaces (`core/context.ts`) and the event bus, never via `GameManager`.
- `ai/` — state machines for archers, builders, citizens and enemies.
- `render/` + `ui/` — pixel-art canvas renderer (low-res buffer, nearest-neighbour upscale), HUD, audio. Reads state only.
  Hero sprites come from `src/assests/model.png` via `scripts/extract-hero-sprites.py` → `src/assests/sprites/hero.png`;
  `cover.png` is the menu background; everything else is drawn procedurally in `render/sprites.ts` / `atmosphere.ts`.
- `GameManager.ts` — composition root; `GameShell.tsx` — React menu/pause/game-over shell.

State is JSON-serialisable, so saves are just `JSON.stringify(state)`.
# kingdom
