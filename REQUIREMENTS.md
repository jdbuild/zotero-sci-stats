# Requirements

This documents the requirements as they were actually given during
development, organized by topic rather than in prompt order. It's the
record of *what was asked for and why* — see [ARCHITECTURE.md](ARCHITECTURE.md)
for *how* it's built.

## Original request

Build a Node.js/Next.js app for statistics over a Zotero library.

- **Input**: Zotero credentials and a library name.
- **Output**: a responsive website with filtering by 1..N tags and date
  bounds, producing a summary (e.g. publications for a tag combination).
  Results of several searches should be comparable against each other -
  e.g. tag `#ICMT` + year 2026 (Institute for Creative Media Technologies)
  vs. tag `#CDHSI` + year 2026 (CDHSI).

### Constraints given up front

| Requirement | Status |
| --- | --- |
| **Read access only** - the app must never write to the Zotero library | ✅ Enforced at two layers - see [ARCHITECTURE.md § Read-only guarantee](ARCHITECTURE.md#read-only-guarantee) |
| ~5,000+ entries across 15 years → needs a local cache/sync (e.g. MongoDB), and the sync must be reliable, run on startup or via a button | ✅ MongoDB cache, full + incremental sync, reliability model in [ARCHITECTURE.md § Sync strategy](ARCHITECTURE.md#sync-strategy); currently button-triggered only, startup auto-sync still open (see Architecture's "future extensions") |
| Architecture proposals should be discussed before building | ✅ Proposed stack/sync/UX choices, clarified via 4 explicit questions before implementation started - decisions recorded in project memory |
| Clean code, classic `INSTALL.md`/`README.md`, GitHub-repo-ready, correct GitHub-style "logos", credentials in an ignore file | ✅ README/INSTALL/ARCHITECTURE/LICENSE, shields.io badges, original SVG logo, `.env.local` git-ignored, Zotero key stored only in local MongoDB |
| Find a good project name | ✅ **ZoteroSciStats** (user's own suggestion, adopted) |

### Clarifying decisions (asked before implementation)

Four open questions were resolved with the user before writing code; all
four went with the recommended option:

1. **MongoDB hosting** → local via Docker Compose.
2. **Usage model** → single-user, local only, no login/auth system.
3. **Date field for filtering** → publication date (not "date added").
4. **Library selection UX** → auto-discovery from the API key (list
   accessible libraries by name) rather than manual numeric ID entry.

## Follow-up round: filtering, sync visibility, citations

Given after the first working version was reviewed:

| Requirement | Status |
| --- | --- |
| UI available in English too, with a language switch | ✅ DE/EN switcher, persisted in `localStorage` ([`lib/i18n/`](lib/i18n/)) |
| Publications chart as bars rather than a line | ✅ [`ComparisonChart.tsx`](components/ComparisonChart.tsx) uses `BarChart` |
| Multiple persons/authors should also be selectable (not just tags) | ✅ Author filter with AND/OR, mirrors the tag filter (`creatorNames` field, backfillable without a re-sync - see below) |
| If a re-sync isn't needed (library already imported, ~9,000 entries), report roughly how much data (MB) was synced and how long it took | ✅ Cache size (live, via `$bsonSize`) always shown regardless of sync history; sync duration/bytes recorded from the next sync onward |
| Report how many items were added / changed / deleted in the last sync | ✅ `syncmetas.lastRun = { added, updated, deleted }`, shown on Settings |
| Store previous comparisons on the page | ✅ `comparisonruns` collection, last 20 per library, survives reloads, reload-into-editor / delete |
| List each query set's publications as a formatted reference list | ✅ Initially IEEE, superseded by APA per the follow-up below - [`lib/citations/apa.ts`](lib/citations/apa.ts) + [`CitationList.tsx`](components/CitationList.tsx), collapsible per query set, capped at 150 with a "showing X of Y" note |

**Note on the author filter and the existing ~9,000-entry library**: adding
`creatorNames` as a new field meant already-synced items wouldn't have it
until they were next touched by a sync - and incremental sync only
re-fetches *changed* items. Since the full original Zotero payload was
already being stored per item (`items.raw`), a **"Reprocess cache"** action
was added instead of requiring a full re-sync: it recomputes derived
fields locally from `raw`, with zero Zotero API calls. See
[ARCHITECTURE.md § Reprocessing without re-syncing](ARCHITECTURE.md#reprocessing-without-re-syncing).

## Follow-up: default language, citation style

| Requirement | Status |
| --- | --- |
| Auto-select English as the GUI default | ✅ `LanguageProvider` defaults to `"en"`; a stored preference (via the switcher) still overrides it on later visits |
| Use APA style instead of IEEE - APA lists up to 20 authors before truncating, not just ~6-7 like IEEE | ✅ [`lib/citations/apa.ts`](lib/citations/apa.ts) replaces `lib/citations/ieee.ts`; author-date format, italicized container title, no bracketed numbering (kept reverse-chronological ordering rather than switching to strict alphabetical-by-author, since that's more useful for a "publications this year" report - flag if strict APA ordering is wanted instead) |

## Follow-up: suggestion list quality

> "there are tags with hardly any or no entries - can tags be removed from
> the list, or sorted by frequency?"

✅ `GET /api/tags` and `GET /api/authors` now rank suggestions by usage
count (most-used first) and drop values used by fewer than 2 items by
default. This only trims the *autocomplete dropdown* - typing a rare tag
or author by hand still works, since filtering was never restricted to
suggested values.

## Follow-up: publication-type filter

| Requirement | Status |
| --- | --- |
| Multi-filter for publication type (book, conference paper, etc.), visually grouped into peer-reviewed vs. not peer-reviewed | ✅ [`ItemTypeFilter.tsx`](components/ItemTypeFilter.tsx), two checkbox groups per query set; classification (journal article + conference paper = peer-reviewed, everything else = other) lives in [`lib/zotero/itemTypes.ts`](lib/zotero/itemTypes.ts) - a pragmatic default, not something Zotero itself records |
| Show the count in brackets in the publication-type list | ✅ Each option reads e.g. "Book (5)" - counts come from `GET /api/item-types`. Also added to the per-query-set citation list toggle ("Publication list (APA) (20)"), since that's the other place this plausibly meant |

*Coded per explicit instruction not to test/validate this round and not to touch the database - build/lint pass, but this hasn't been exercised against real data yet.*

## Follow-up: day-precision date filtering

| Requirement | Status |
| --- | --- |
| Date selection with a specific day, not just a year | ✅ `yearFrom`/`yearTo` (year numbers) replaced with `dateFrom`/`dateTo` (ISO day strings) throughout; matched against a new `items.publicationDate` field. A bare year like "2026" still normalizes to 2026-01-01, so a 2026-01-01..2026-12-31 filter still catches it - confirmed with the user before implementing. |
| Calendar picker, and does it work on mobile | ✅ Native `<input type="date">` - gets the browser/OS's own calendar (desktop) or date-wheel (iOS/Android) picker with no extra library, and is responsive by construction since it's platform UI. |
| Quick "+1 month" / "+1 year" buttons from the start date, like other software | ✅ Two buttons next to the date range that shift the end date by exactly one calendar month/year from the start date (`addToIsoDate` in `app/compare/page.tsx`) - disabled until a start date is set. |

*Also coded per explicit instruction not to test/validate and not to touch the database.*

## Follow-up: publication-type filter UX

| Requirement | Status |
| --- | --- |
| Select all / deselect all for publication types | ✅ Two small buttons above the type checkboxes. Default state is "everything selected" (no filter); "deselect all" now correctly means *match nothing*, not *no filter* - see the note below. |
| Default to all types selected | ✅ The default requires no async population: the UI tracks *excluded* types (empty = nothing excluded = everything on), so "all selected" is the natural starting state rather than something to be initialized once type options load. |
| Publication types laid out inline, not as a vertical list, to save vertical space | ✅ Wrapped inline checkboxes (`flex flex-wrap`) instead of one-per-line. |
| Move it after the date selection, since it's optional | ✅ Reordered: Tags → Authors → Date range → Publication type. |

**A correctness fix this required**: previously, an empty `itemTypes` array and "no filter" were indistinguishable, so "deselect all" would have silently matched *everything* instead of *nothing*. Fixed at the time by having the backend treat the field's presence as the signal - then superseded by the exclusion-list redesign below, which sidesteps the ambiguity entirely.

*Also coded per explicit instruction not to test/validate and not to touch the database.*

## Follow-up: filter dropdowns should narrow together with the results

| Requirement | Status |
| --- | --- |
| Tag/author dropdowns aren't filtered like the chart - e.g. selecting only conference papers should also narrow those lists | ✅ New `POST /api/facets` endpoint, scoped to a query set's *other* active filters (`computeFacets` in `lib/stats/aggregate.ts`). Each query-set card now owns its own suggestions, refetched whenever that card's filters change - previously `/api/tags`/`/api/authors`/`/api/item-types` were flat, page-wide, and fetched once on load. |
| Make "peer-reviewed" and "other" group labels themselves clickable, to select/deselect everything in that category | ✅ Each group label in `ItemTypeFilter.tsx` is now a button: toggles the whole group (deselects if everything in it is selected, otherwise selects everything in it) - alongside the existing global select-all/deselect-all. |

**A design simplification this prompted**: the item-type filter's contract changed from a positive "included types" list to a negative "excluded types" list (`excludedItemTypes`, matched with `$nin`). The old approach needed the client to know the *full* universe of types to convert "what's unchecked" into "what's included," which got awkward once each query-set card has its own independently-fetched, filter-scoped type list. Sending exclusions directly removes that need entirely - see [`lib/stats/aggregate.ts`](lib/stats/aggregate.ts).

*Also coded per explicit instruction not to test/validate and not to touch the database.*

## Follow-up: comparison-wide filters + a collaboration network view

Two requests together, explicitly asked to be tested/verified this time
(unlike the last several rounds) - so, unusually, this round *was* checked
against seeded, verified data before being reported done (see below).

| Requirement | Status |
| --- | --- |
| Publication type and date range shouldn't be per query set - move them to apply once, to the whole comparison | ✅ New [`GlobalFilterBar.tsx`](components/GlobalFilterBar.tsx), rendered once above the query-set cards on both Compare and Network. `QuerySetEditor` no longer holds date/type state; it receives the shared filter as a prop purely to scope its own tag/author suggestions correctly. |
| A second, different visualization - maybe D3 - comparing query sets (institutes) pairwise by how many publications they share, as a network graph with edge weight/label = shared-publication count, plus a ranked list with the actual shared papers | ✅ New **Collaboration Network** page at `/network`. `d3-force` powers a force-directed graph (nodes = query sets, edge thickness/label = overlap count); a ranked list below shows every pair's shared publications in APA format, reusing `CitationList`. |
| With N query sets there should be N·(N-1)/2 pairwise combinations (e.g. 5 sets → 10) | ✅ Confirmed exactly - see verification below. |

**Verification performed** (per the explicit request, unlike prior rounds): seeded 29 test items across 5 tags with deliberately known overlaps, including one item tagged with three sets at once to check that a triple-overlap item correctly counts into all three relevant pairs. Built a 5-node network in the running app and confirmed, live:
- All 5 node totals matched expected counts exactly (12, 12, 6, 6, 4).
- All 10 edges were present (5·4/2), including the 6 zero-overlap pairs rendering as "no shared publications" rather than being omitted.
- The 4 non-zero pairwise counts matched expected values exactly, including the triple-tagged item correctly appearing in all three of its relevant pairs' shared-publication lists.
- The Compare page's new global filter bar was also exercised (date range + item-type facet counts updating live) with no regressions.
- No console errors during any of the above. Test data was removed afterward, as with every other round.

*Test data was seeded and removed as usual; the app's own database was otherwise left untouched.*

## Follow-up: stable suggestions, clearer naming, bubble weight, network history

| Requirement | Status |
| --- | --- |
| Tags shouldn't appear/disappear based on the date filter - a tag with 0 matches for the current range is still 0, not a reason to hide it | ✅ `computeFacets` now strips `dateFrom`/`dateTo` from every facet match (tags, authors, *and* item types, for consistency) - the suggestion pool is stable regardless of date; actual comparison results still correctly show 0 when that's the true count. See [`lib/stats/aggregate.ts`](lib/stats/aggregate.ts). |
| Rename "Compare" to something more descriptive (e.g. "Tag Compare"), keep "Collaboration Network" as the visualization's name | ✅ Nav + page heading renamed to "Tag Compare" / "Tag-Vergleich". "Collaboration Network" was already the name from the prior round. |
| On the Network page, say somewhere who has the most connections | ✅ A line above the graph: "{name} has the most connections: {count} shared publications in total" (only shown if any pair actually overlaps) - `findMostConnected` in `NetworkGraph.tsx`. |
| Bubble size/weight should reflect *total collaborative* publications, not each node's own raw total; show both, e.g. "2 (of 8)" | ✅ Circle size now scales with each node's summed overlap count across all its pairings (`computeCollabTotals`), not its own library total. Each bubble shows the collab number large and "of N" (the node's own total) small underneath. |
| Can a Network query also be reloaded, like Compare's history? | ✅ New `networkruns` collection + `/api/network-runs` routes, mirroring `comparisonruns`/`/api/comparisons` exactly - same reload-into-editor, delete, persist-across-reloads behavior. |
| Code and validate without destroying MongoDB data or the Zotero key | ✅ This round's verification ran against a fully **isolated** test database (`zoterosci-stats-test` - a different database name on the same local MongoDB instance), by temporarily pointing `.env.local` at it, testing, then restoring the exact original value and dropping the test database. The app's real database (`zoterosci-stats`) was never opened for writes this round - confirmed by reading its item/config counts before and after, unchanged. |

**Verification performed**: seeded 21 items across 4 tags (including one, "OLDONLY", with items only in 2020) into the isolated test DB. Confirmed live: setting the date filter to 2026 left "OLDONLY" in the tag suggestion list (previously it would have vanished), while actually running a comparison with that tag for 2026 correctly returned 0 hits. Built a 3-node network and confirmed bubble numbers, "of N" labels, and the "most connected" callout all matched hand-computed expected values exactly; reloaded the page and confirmed the network history entry persisted; used "Load into editor" and confirmed all three query sets were restored correctly.

## Follow-up: network polish, table detail, date-math correctness

| Requirement | Status |
| --- | --- |
| Rename the nav menu entry to "Tag NetworkVis" | ✅ Nav label only - the page itself keeps its "Collaboration Network" title/heading from the prior round, per that round's explicit naming choice. |
| Rank *all* nodes by collaboration, not just the single most-connected one (e.g. "CDHSI 40 collab, 2nd ..., 3rd ...") | ✅ The single "most connected" sentence was replaced with a full ordered list (`rankNodesByCollab` in `NetworkGraph.tsx`), every node shown with its rank, name, and "{collab} (of {total})". |
| Keep existing (already-run) queries visible/executed rather than replacing them | ✅ History expand/collapse changed from a single `expandedId` to a `Set` of expanded ids on both Compare and Network - running a new comparison/network no longer collapses whatever was already open. |
| Movable bubbles on the network graph, draggable by mouse | ✅ Pointer-event drag on each node circle, using `getScreenCTM().inverse()` to map screen coordinates into the SVG's internal coordinate space correctly regardless of rendered size. Drag offsets are local display state, reset when the underlying data changes. |
| Percentages in brackets on Tag Compare's Overview table, plus a total row at the end | ✅ Each item-type cell now reads "N (X%)" (of that row's total), and a `<tfoot>` total row sums every column with its own overall percentage. |
| Say which time period the Overview reflects | ✅ A "Period: …" line next to the Overview heading, reading the shared date range from the saved run. |
| "+1 year" from 2025-01-01 should land on 2025-12-31, not 2026-01-01 - a same-date span overflows into the next year's publications otherwise | ✅ Real bug, now fixed: `spanEndFromIsoDate` (renamed from `addToIsoDate`) subtracts one day after adding the month/year. Verified live with a boundary-case item dated exactly 2026-01-01, confirmed excluded from a "2025-01-01, +1 year" range. |
| Say the time period on the Network history output too | ✅ Same period line, reused via `formatPeriod`, shown above each network's graph. |

**Verification performed**: isolated test DB again (per the established pattern). Confirmed live: the date-span fix with a real boundary item (2026-01-01, correctly excluded from a "+1 year from 2025-01-01" range); a 3-node network's full collaboration ranking matched hand-computed values exactly (including which node ranked #1, which the old single-line summary would have hidden the #2/#3 detail of); building a second network left the first one still expanded; dragging a node (via a real down→move→up pointer sequence, not just a single synthetic dispatch) moved it by the correct, coordinate-transformed amount; the Tag Compare Overview table's percentages and total row were arithmetically exact. Real database confirmed untouched before and after (items/configs/comparisonruns/networkruns counts unchanged apart from the app's own ordinary use between sessions).

## Follow-up: vertical (column-based) percentages

| Requirement | Status |
| --- | --- |
| Tag Compare's Overview table: percentages should not be horizontal (each query set's share of its own row) but vertical - each column (Total hits, and every item type) should sum to 100% down the query sets | ✅ `pct()` in `ComparisonTable.tsx` now divides by the column's total across all query sets instead of the row's own total. The total row shows plain counts (always 100% by construction, so not repeated as a percentage). |
| The Network page's "Ranking by collaborations" should become a similar table: a total row summing to 100%, each query set's share of it - and additionally, horizontally, each query set's own total count and what percentage of that is collaborative | ✅ Replaced the ranked `<ol>` with a table: "Total publications" (raw count), "Collaborative" (count + horizontal % of that node's own total, e.g. "9 (75%)"), "Share of all collaboration" (vertical % of the sum of every node's collaborative count, summing to 100%), plus a total row. |

**Verification performed**: isolated test DB again. Tag Compare's Overview table: for a 3-set comparison (15/12/8 hits), the Total-hits column read 43%/34%/23% (sums to 100%), and each item-type column independently summed to 100% down its own values - confirmed against hand-calculated expectations exactly. Network ranking table: Total publications 15/12/8; Collaborative 7 (47%) / 9 (75%) / 6 (75%) - each against that node's own total; Share of all collaboration 32%/41%/27% (sums to 100%, against the pooled collaborative total of 22); total row read 35 / 22 (63%) / 100%. All values matched hand-calculation exactly. Real database confirmed untouched before and after.

## Bug fix: deduplicated collaboration counts

A node's "Collaborative"/bubble number could exceed its own total (e.g.
"30 of 27") when a single publication was tagged into 3+ query sets at
once - it was being counted on every edge touching that node, so an item
shared with 3 other sets contributed 3x instead of once.

| Requirement | Status |
| --- | --- |
| A query set's collaboration count can never exceed its own total - deduplicate so an item overlapping with several other sets at once still counts once | ✅ `computeNetwork` in `lib/stats/network.ts` now computes `collabTotal` per node directly as the count of *distinct* items in that set which appear in at least one other set, rather than deriving it client-side as a sum of edge overlap counts. `NetworkGraph.tsx`'s `computeCollabTotals` reads this field, falling back to the old sum-of-edges behavior only for network runs saved before this fix (which don't have the field). |

**Verification performed**: pure in-memory logic check (three sets, one
item shared across all three, two more items shared pairwise) confirmed
each set's dedup count is now ≤ its own total, and matches hand
calculation exactly - no DB or browser round-trip needed since the fix is
a pure function of already-fetched key sets. `npm run build` and
`npm run lint` both pass against the real database's `.env.local`
(build doesn't touch the DB at build time - the affected routes are all
server-rendered on demand).

## Follow-up: per-node author attribution on the Network page

For each network node (a tag/author combination), declare an optional
roster of "tracked authors" - people known to belong to that node's
group. Purely an annotation: it never narrows which items count toward
that node (unlike the existing Authors filter). With a roster declared,
every pairwise edge shows who's actually behind the overlap.

| Requirement | Status |
| --- | --- |
| Declare tracked authors per node, without narrowing the node's own results | ✅ New optional `members` field on each node/query set, a chip input reusing `TagInput`, rendered via a new `extra` slot on `QuerySetEditor` (unused by Tag Compare, so its behavior there is unaffected). Suggestions are the same tag-scoped author list the Authors field already fetches. |
| Show who's behind a given pairwise overlap - which side (or specific person) contributed | ✅ Each edge's "Contributors" panel: any roster member appearing as a creator on the shared items, tallied per person. |
| Distinguish who *originated* (first-authored) shared publications, not just who co-authored them - can it work for any tag sets, not just institutes? | ✅ Yes, generic - the mechanism only checks declared names against each item's first author (`creatorType: "author"`, Zotero's own creator order), nothing tag-specific. New "Originated by" panel per edge, computed from the full uncapped overlap (not the 100-item citation-list cap). Untracked/unattributable items are counted explicitly (`untrackedOriginCount`), so the breakdown always sums exactly to the edge's total. |
| A name declared on both nodes' rosters shouldn't be picked for one side or double-counted | ✅ Labelled `"shared"` explicitly, both in Contributors and Originated-by. |
| A node with no roster declared shouldn't show a misleading "0" | ✅ Renders as a greyed "not tracked" badge instead, distinct from a real 0. |
| Show this on the graph itself, bidirectionally | ✅ An edge with attributable origination data renders as three segments - a source-colored tip, a neutral grey middle, target-colored tip - sized by each side's share, reusing each node's own existing color. Edges with no roster data render exactly as before. |
| At 6-7+ nodes, bubble/edge colors were hard to tell apart | ✅ `CHART_COLORS` grew from 6 to 12 (first 6 unchanged) - at exactly 7 nodes the old palette literally repeated a color. |

**Verification performed**: against real, live library data (not seeded
test fixtures - the user gave explicit permission to use/modify the real
database for this round). Confirmed the sum-to-total invariant exactly
(e.g. 30 shared + 12 target + 4 source + 98 untracked = 144, matching the
edge's total precisely) across several real institute-tag pairs, the
"shared" label triggering correctly when a name was declared on both
rosters, the "not tracked" badge appearing only for a genuinely
roster-less side, and the rendered SVG edge segments' pixel lengths
matching the computed fractions exactly (checked via live DOM
inspection, not just visually). A real bug was caught this round: the
first version crashed the whole `/network` page on load because older
saved network runs (from before this feature) lack the new
`contributors`/`originators` fields - fixed with defensive `?? []`
fallbacks, and confirmed old saved runs now render their empty state
gracefully instead of crashing.

## Follow-up: two "who owns this collaboration" scoring methods (branch `medal-race`)

Built on a separate `medal-race` branch (not yet merged to `main`) so it
could be tried against real data before committing to it - see the
branch-vs-page-placement discussion that opened this round. Reuses the
same per-node `members` roster from [[project_network_author_attribution]]
unchanged; adds two independent ways of asking "which institute owns a
shared publication," replacing the earlier "Contributors"/"Originated by"
panels entirely (removed - "no use of this data" once these existed).

| Requirement | Status |
| --- | --- |
| **Method 1, "Initiator"**: whichever side's earliest tracked byline position wins the whole publication, no partial credit | ✅ `computeInitiator` in `lib/stats/network.ts`. A name declared on both compared institutes' rosters, or nobody tracked at all, is left unassigned rather than guessed at. |
| **Method 2, "Medal race"**: byline position earns gold (first author, 3pts) / silver (second-or-last author, 2pts) / bronze (everyone else, 1pt); an institute's total is the sum from its own roster members; higher total wins that publication | ✅ `computeMedalRace`. A name declared on both rosters scores for both sides on that item (explicit user decision - not excluded, not picked for one side). UI shows 🥇/🥈/🥉 counts plus point totals per side, not just a single number. |
| Both methods need a plain-language explanation in the UI, not just numbers | ✅ A native `<details>`/`<summary>` "(i)" disclosure next to each method's heading - works identically on touch and desktop, no JS state needed. |
| "Wins" read too competitive/aggressive | ✅ Reworded to "credited" (both languages), and every count (credited, ties, unassigned) now shows a percentage of the edge's total, using one shared `StatLine` component so the core stat looks visually identical in both panels regardless of what extra detail (medal breakdown) surrounds it in Method 2. |
| At 6-7+ nodes, bubble/edge colors were hard to tell apart | ✅ `CHART_COLORS` grew from 6 to 12 (first 6 unchanged). |

### Bug fix: Method 1 ignored third institutes with 3+ nodes in the network

A real correctness bug, only visible once comparing more than two
institutes at once. `computeInitiator` originally scoped its "who's
earliest" check to only the *current pair's* two rosters - so for a
publication first-authored by institute C (untracked by this edge), with
institute A's tracked member appearing before institute B's tracked
member later in the same byline, the A×B edge would credit A, even
though neither A nor B actually initiated it - C did, and C was never
even checked because it isn't part of that specific pairwise comparison.

Medal race was never affected: it sums each institute's own roster
members' points independently, regardless of who else (from any
institute) is elsewhere on the byline - a third institute's presence
doesn't corrupt either side's own tally.

**Fix**: `computeInitiator` now takes a network-wide `nameToNodeIds` map
(built once per `computeNetwork` call, from every node's roster, not
just the current pair's) instead of two local rosters. For each item, it
finds the byline's *true* earliest tracked author across every node in
the network, then classifies: source-only -> source; target-only ->
target; declared on both compared rosters -> unassigned (as before);
**declared on some other node's roster (neither source nor target) ->
new `otherInstitute` category**, shown in the UI as "initiated by
another tracked institute."

**Verification**: built the same CDHSI x ICMT pair twice against real
data - once in a 2-node network (just CDHSI + ICMT), once in a 3-node
network with IGW added. Total overlap count was identical (14) in both,
but one item moved from ICMT's count to the new `otherInstitute` bucket
once IGW was checked - proving the bug was real and the fix corrects it
without losing or double-counting anything. Sum invariant
(sourceWins + targetWins + unassigned + otherInstitute = edge count)
verified exactly across every edge of a live 7-institute network build,
not just the one pair.

**Not computationally complex**: no new database queries or fetched
fields - rosters are small, human-curated lists, and the network-wide
lookup is built once and reused across every edge, rather than rebuilt
per-pair as before.

## Follow-up: optional access management for a hosted demo (branch `access-management`)

The single-user/no-login decision from the original request still holds
for local, internal use - but the user also wants to put a demo of the
app somewhere reachable by other people, which needs *some* gate.
Resolved by making the whole feature an opt-in flag rather than
replacing the original model: unset, nothing changes from before; set,
the app requires login and Settings requires an admin.

| Requirement | Status |
| --- | --- |
| Secure the Settings page behind an admin login | ✅ Two layers: `proxy.ts` optimistically redirects a non-admin away from `/settings` using a cheap role-hint cookie, and every Settings-related Route Handler (`/api/config`, `/api/sync`, `/api/reprocess`, `/api/zotero/libraries`) independently re-checks admin status server-side via `isAdminOrAuthDisabled()` - confirmed by curling one of those endpoints directly as a logged-in member and getting `403`, not just relying on the page being hidden. |
| A handful (4-5) of member accounts, created from Settings with a generated username/password | ✅ "Access management" section on Settings, admin-only: username field + "Add member", each new member gets a random 12-character password shown exactly once in a copy-to-clipboard banner, and a table of all accounts with a remove button (self-deletion blocked). |
| Store it simply in MongoDB | ✅ Two new collections, `users` and `sessions` - see [ARCHITECTURE.md § Access management](ARCHITECTURE.md#access-management). |
| Balance "fine as-is for internal use" against "want a demo for certain people" | ✅ A single `NEXT_PUBLIC_AUTH_ENABLED` flag in `.env.local`. Absent or not `"true"`: the entire feature is a no-op, byte-for-byte the same behavior as before it existed (confirmed live - see verification below). Set to `"true"`: login is required app-wide and Settings requires the admin role. |
| Whole app requires login, not just Settings; Settings additionally requires admin | ✅ Confirmed via clarifying question before implementation. `proxy.ts` gates every route once enabled; the admin-only redirect is scoped to `/settings` specifically. |
| Session length | ✅ 7 days (recommended option, confirmed before implementation). |
| Where does the first admin account come from | ✅ `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars, read once on first login attempt after the flag is enabled (`ensureBootstrapAdmin()`) - hashed immediately into the `users` collection and never read again afterward. Chosen over a "first person to sign up becomes admin" wizard specifically because that pattern race-conditions once the app is actually reachable by strangers on a hosted demo. |

**Verification performed**: build + lint pass. Live-tested against an
**isolated** Atlas database (`zoterosci-stats-authtest` - a separate
database name on the same cluster, `.env.local` temporarily repointed at
it and restored to the exact original value afterward, real production
data never touched) with the flag temporarily enabled: confirmed the
disabled state first (unset flag - app behaved identically to before,
Settings reachable, no login prompt), then the enabled state - login
redirect for an unauthenticated visit to any page, bootstrap admin
creation and login on first attempt, a created member's one-time
password login working, a member correctly bounced from `/settings`
back to `/` (both via the nav link and a direct URL), a member's direct
`POST /api/config` call returning `403` even though the UI never shows
it that option, logout clearing the session, and the admin regaining
full access including the Access management table afterward. Test
accounts were removed and `.env.local` restored before finishing.

## Open / explicitly deferred

- Automatic sync on app startup (currently manual button only).
- Reloading/saving named query sets via the `savedquerys` collection in
  the Compare UI (model exists, UI wiring doesn't).
- Multi-user / login support for the *default*, local/internal use case -
  still intentionally off unless `NEXT_PUBLIC_AUTH_ENABLED` is explicitly
  set, per the original "single-user, local only" decision; see the
  access-management follow-up above for the opt-in version built for a
  hosted demo.
