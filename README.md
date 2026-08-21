# ZoteroSciStats

![license](https://img.shields.io/badge/license-MIT-3b82f6) ![next.js](https://img.shields.io/badge/next.js-16-000000) ![mongodb](https://img.shields.io/badge/mongodb-cache%2Fsync-47A248) ![zotero api](https://img.shields.io/badge/zotero%20api-read--only-dc2f36)

Publication statistics for a Zotero library — filter by 1..N tags and a date
range, and compare multiple such queries side by side (e.g. `#ICMT 2026` vs.
`#CDHSI 2026`). Built for libraries with thousands of items across many
years, with a local sync cache so you're not re-querying the Zotero API on
every page load.

**Read access only.** ZoteroSciStats never writes to your Zotero library —
see [Read-only guarantee](ARCHITECTURE.md#read-only-guarantee).

## Features

- **Tag + author filtering per query set**, plus a shared day-precision
  date range and publication-type filter (peer-reviewed vs. other) that
  apply across the whole comparison - so every query set you're comparing
  uses the same time window and scope.
- **Tag Compare** — run several query sets at once and see them side by
  side in a bar chart and a breakdown table (with each cell's share in
  brackets, plus a total row), an APA-style publication list, and the
  date range the results reflect. Suggestions (tags, authors) narrow down
  live as you filter, not just the results - and stay stable across date
  changes, so they don't flicker in and out as you adjust the range.
- **Tag NetworkVis** — a second, D3-force-powered visualization
  ("Collaboration Network"): pick several tag/author combinations and see
  every pairwise overlap as a network graph. Bubble size reflects each
  one's total collaboration count (not just its own library size), edge
  thickness/label shows how many publications each pair shares, bubbles
  are draggable to rearrange, and every node is ranked by how connected
  it is (not just the top one) - plus a ranked list of the strongest
  pairwise connections with the actual shared papers.
- **History for both** — every Tag Compare and Network run is saved and
  stays on the page across reloads; reload an old one back into the
  editor, delete it, or keep several expanded side by side to compare.
- **Reliable local sync** — full sync on first run, incremental sync
  afterwards (Zotero's `since` versioning), triggered via a manual Sync
  button. Reports how many items were added/updated/deleted and how long
  it took; a separate "reprocess cache" action backfills new derived
  fields (like author names) onto an already-synced library without
  touching the Zotero API again.
- **Library auto-discovery** — paste a Zotero API key and pick your library
  by name instead of looking up numeric IDs.
- **German / English UI** — switchable at any time, top right.

## Quickstart

```bash
git clone https://github.com/jdbuild/zotero-sci-stats.git
cd zotero-sci-stats
npm install
cp .env.example .env.local
docker compose up -d
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), go to **Settings**,
paste a **read-only** Zotero API key, pick your library, and hit **Sync**.

Full setup instructions (including how to create a read-only Zotero API
key): [INSTALL.md](INSTALL.md).

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [MongoDB](https://www.mongodb.com) via Mongoose — local sync cache
- [Tailwind CSS](https://tailwindcss.com) — responsive UI
- [Recharts](https://recharts.org) — comparison bar charts
- [d3-force](https://github.com/d3/d3-force) — collaboration network layout
- [Zotero Web API v3](https://www.zotero.org/support/dev/web_api/v3/start) — read-only

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — data model, sync strategy, read-only guarantee
- [INSTALL.md](INSTALL.md) — setup, Zotero API key, MongoDB, environment variables
- [REQUIREMENTS.md](REQUIREMENTS.md) — the requirements this app was actually built against, and their status

## Credentials & privacy

Your Zotero API key is only ever stored in your local MongoDB instance —
never in this repository and never in `.env.local`, which only holds the
MongoDB connection string. `.env.local` is git-ignored regardless; see
[.env.example](.env.example).

## License

[MIT](LICENSE)
