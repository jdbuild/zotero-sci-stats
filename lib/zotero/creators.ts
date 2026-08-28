import type { ZoteroCreator } from "./types";

/** "First Last" for a person creator, or the plain `name` for an institutional one. */
export function creatorFullName(creator: ZoteroCreator): string {
  if (creator.name) return creator.name;
  return [creator.firstName, creator.lastName].filter(Boolean).join(" ").trim();
}

export function creatorNames(creators: ZoteroCreator[] | undefined): string[] {
  return (creators ?? []).map(creatorFullName).filter(Boolean);
}

/**
 * Creators with role "author", in Zotero's own order - excludes
 * editors/translators/etc. so author-position logic (first author, medal
 * scoring by byline position) isn't thrown off by a non-author creator
 * sitting somewhere in the list.
 *
 * Some Zotero item types don't use "author" as a role at all -
 * presentations use "presenter", artwork uses "artist", film uses
 * "director", and so on - so a strict "author" filter would wrongly
 * treat those items as having nobody on the byline even though a real
 * person is listed first. When no "author"-typed creator exists, this
 * falls back to every creator in Zotero's own order regardless of role,
 * rather than reporting an empty byline.
 */
export function authorNamesInOrder(creators: ZoteroCreator[] | undefined): string[] {
  const list = creators ?? [];
  const authorsOnly = list.filter((c) => c.creatorType === "author").map(creatorFullName).filter(Boolean);
  if (authorsOnly.length > 0) return authorsOnly;
  return list.map(creatorFullName).filter(Boolean);
}

/** The first creator with role "author" (in Zotero's own order) - skips
 * editors/translators/etc. that might otherwise be listed first. */
export function firstAuthorName(creators: ZoteroCreator[] | undefined): string | null {
  return authorNamesInOrder(creators)[0] ?? null;
}
