import type { ZoteroCreator } from "./types";

/** "First Last" for a person creator, or the plain `name` for an institutional one. */
export function creatorFullName(creator: ZoteroCreator): string {
  if (creator.name) return creator.name;
  return [creator.firstName, creator.lastName].filter(Boolean).join(" ").trim();
}

export function creatorNames(creators: ZoteroCreator[] | undefined): string[] {
  return (creators ?? []).map(creatorFullName).filter(Boolean);
}
