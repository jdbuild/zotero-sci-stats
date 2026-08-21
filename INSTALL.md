# Installation

## Prerequisites

- [Node.js](https://nodejs.org) 20 or newer
- [Docker](https://www.docker.com/) (for the local MongoDB cache) — or an
  existing MongoDB instance you already have a connection string for
- A Zotero account with access to the library you want statistics for

## 1. Clone and install

```bash
git clone https://github.com/jdbuild/zotero-sci-stats.git
cd zotero-sci-stats
npm install
```

## 2. Configure the environment

```bash
cp .env.example .env.local
```

Open `.env.local` and check `MONGODB_URI`. The default matches the
`docker-compose.yml` in this repo, so you usually don't need to change it.

`.env.local` is git-ignored — it is never committed.

## 3. Start MongoDB

```bash
docker compose up -d
```

This starts a local `mongo:7` container on port `27017`, with its data
persisted in a named Docker volume (`mongo-data`) — safe across restarts.

Already have a MongoDB instance? Skip this step and point `MONGODB_URI` at
it instead.

## 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 5. Create a read-only Zotero API key

1. Go to [zotero.org/settings/keys](https://www.zotero.org/settings/keys)
   and click **Create new private key**.
2. Give it a name (e.g. "ZoteroSciStats - read only").
3. Under **Personal Library**, enable **Allow library access** and leave
   **Allow write access** unchecked.
4. Under **Default Group Permissions** (or per-group, further down), grant
   **Read Only** access to whichever groups you want statistics for.
5. Save, and copy the generated key — Zotero only shows it once.

ZoteroSciStats never sends anything but `GET` requests to the Zotero API
(see [ARCHITECTURE.md](ARCHITECTURE.md#read-only-guarantee)), but starting
from a read-only key is good practice regardless.

## 6. Connect the app to your library

The UI defaults to English; switch to German any time with the language
button top right.

1. In the app, go to **Settings**.
2. Paste the API key and click **Fetch libraries**.
3. Pick your personal library or group by name from the dropdown.
4. Click **Save connection**.
5. Click **Sync now** to pull your library into the local cache. The first
   sync of a large library (thousands of items) can take a while;
   subsequent syncs are incremental and much faster. Once it's done, the
   Settings page shows the cache size, how long the sync took, and how
   many items were added/updated/deleted.

## 7. Use it

Go to **Tag Compare**. Set the shared date range and publication type once at
the top (day-precision, with "+1 month"/"+1 year" buttons to quickly shift
the end date) - these apply to every query set below. Then build one or
more query sets (tags + authors, with AND/OR mode) and click **Compare**.
Each result includes a bar chart, a breakdown table, and a collapsible
APA-style publication list per query set. Every comparison you run is
saved and stays listed on the page across reloads - reload one back into
the editor to tweak it, or delete it.

Go to **Tag NetworkVis** for a different view: pick several tag/author
combinations (e.g. two or more institutes) and click **Build network** to
see how strongly they're connected - a graph where bubble size shows each
one's total collaboration count (drag bubbles to rearrange them), edge
thickness/label shows how many publications each pair shares, and every
node is ranked by how connected it is, not just the top one. Below that,
a ranked list of the strongest pairwise connections with the actual
shared papers. Like Tag Compare, every network you build is saved and
stays listed on the page - reload one back into the editor, or delete it.

## Updating your synced data later

Click **Sync now** again any time — only items changed or added since the
last sync are re-fetched from Zotero.

If you're upgrading from an earlier version of this app and already have a
large library synced, some newer features (like author filtering) rely on
a field that only gets computed for items touched by a sync. Rather than
forcing a full re-sync, click **Reprocess cache** on the Settings page -
it recomputes such fields from the data already stored locally, with no
Zotero API calls at all.

## Troubleshooting

- **"No library configured yet"** — you haven't completed step 6 yet.
- **Sync fails with a 403** — your API key doesn't have read access to the
  selected library; re-check the key's permissions on zotero.org.
- **MongoDB connection errors** — confirm `docker compose ps` shows the
  `mongodb` service as `running`, and that `MONGODB_URI` in `.env.local`
  matches.
