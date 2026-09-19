# StallMind Analysis (Firefox MV3)

Analysis-only extension. Reads the current battle's own protocol stream from the page's
WebSocket and forwards it to the local analysis server. It never submits moves, reads
credentials, or touches any information beyond the battle text shown in the page.

## Pipeline

```text
page WebSocket (own battle log)
  → bridge.js (main world, web_accessible_resource)
  → content.js (content script, relays)
  → background.js (service worker, batches POSTs)
  → http://127.0.0.1:3100/ingest
  → LiveBattleStore → decisions NDJSON → /snapshot + /timeline → panel
```

## Load (temporary, developer build)

1. Start the server: `npm run serve:analysis` (defaults: port 3100, `data/derived/selfplay-decisions.ndjson`).
2. Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → `apps/showdown-extension/manifest.json`.
3. Open `https://play.pokemonshowdown.com`, join/start a battle, open `?server=127.0.0.1:3100&battleId=<id>` panel or the `/` page.

## Boundaries

- Frames are forwarded only while the battle page is open; nothing is stored client-side.
- Perspective is auto-detected from the `|player|` line when the content script reads the
  logged-in username from `#userbar .username`; falls back to p1.
- The bridge only sees the page's own WebSocket frames (same text as the battle log); no
  other traffic is observed.
- Server must be reachable at `http://127.0.0.1:3100`; failures stay silent (analysis best-effort).

## Checks

`npm run lint` at the repo root runs `node --check` on these files.