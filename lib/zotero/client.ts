import type {
  ZoteroDeletedResponse,
  ZoteroGroup,
  ZoteroItemResponse,
  ZoteroKeyInfo,
  ZoteroLibraryType,
} from "./types";

/**
 * Read-only Zotero Web API v3 client.
 *
 * This module intentionally exposes GET requests only. There is no
 * create/update/delete method anywhere in this file, and none should ever
 * be added - ZoteroSciStats must never be able to write to a user's
 * Zotero library, regardless of the permissions on the API key in use.
 * See ARCHITECTURE.md for the full read-only guarantee.
 */

const API_BASE = "https://api.zotero.org";
const API_VERSION = "3";
const PAGE_LIMIT = 100;

export class ZoteroApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ZoteroApiError";
  }
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    "Zotero-API-Version": API_VERSION,
    Authorization: `Bearer ${apiKey}`,
  };
}

async function zoteroGet(path: string, apiKey: string): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders(apiKey),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ZoteroApiError(`Zotero API request failed: ${res.status} ${res.statusText} (${path})`, res.status);
  }
  return res;
}

/** Verifies the API key and returns the associated user + access grants. */
export async function getKeyInfo(apiKey: string): Promise<ZoteroKeyInfo> {
  const res = await zoteroGet(`/keys/${encodeURIComponent(apiKey)}`, apiKey);
  return res.json();
}

/** Lists the groups this API key can read, for library auto-discovery. */
export async function getAccessibleGroups(apiKey: string, userId: number): Promise<ZoteroGroup[]> {
  const res = await zoteroGet(`/users/${userId}/groups`, apiKey);
  return res.json();
}

function libraryPath(libraryType: ZoteroLibraryType, libraryId: string): string {
  return `/${libraryType}s/${libraryId}`;
}

/**
 * Fetches one page of items. Pass `sinceVersion` for incremental syncs -
 * Zotero then returns only items added/changed after that library version.
 */
export async function getItemsPage(
  apiKey: string,
  libraryType: ZoteroLibraryType,
  libraryId: string,
  start: number,
  sinceVersion?: number
): Promise<{ items: ZoteroItemResponse[]; totalResults: number; libraryVersion: number }> {
  const params = new URLSearchParams({
    format: "json",
    include: "data",
    limit: String(PAGE_LIMIT),
    start: String(start),
  });
  if (sinceVersion !== undefined) {
    params.set("since", String(sinceVersion));
  }

  const res = await zoteroGet(`${libraryPath(libraryType, libraryId)}/items?${params}`, apiKey);
  const items = (await res.json()) as ZoteroItemResponse[];
  const totalResults = Number(res.headers.get("Total-Results") ?? items.length);
  const libraryVersion = Number(res.headers.get("Last-Modified-Version") ?? 0);
  return { items, totalResults, libraryVersion };
}

/** Keys deleted from the library since `sinceVersion`. */
export async function getDeleted(
  apiKey: string,
  libraryType: ZoteroLibraryType,
  libraryId: string,
  sinceVersion: number
): Promise<ZoteroDeletedResponse> {
  const res = await zoteroGet(
    `${libraryPath(libraryType, libraryId)}/deleted?since=${sinceVersion}`,
    apiKey
  );
  return res.json();
}

/** Current library version, without pulling any items. */
export async function getLibraryVersion(
  apiKey: string,
  libraryType: ZoteroLibraryType,
  libraryId: string
): Promise<number> {
  const res = await zoteroGet(`${libraryPath(libraryType, libraryId)}/items?format=json&limit=1`, apiKey);
  return Number(res.headers.get("Last-Modified-Version") ?? 0);
}
