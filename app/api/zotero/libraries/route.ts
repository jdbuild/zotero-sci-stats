import { NextResponse } from "next/server";
import { getAccessibleGroups, getKeyInfo, ZoteroApiError } from "@/lib/zotero/client";
import type { ZoteroLibraryRef } from "@/lib/zotero/types";

/**
 * Given a Zotero API key, discovers every library it can read: the user's
 * own personal library plus any accessible groups. Read-only - GET calls
 * to the Zotero API only.
 */
export async function POST(request: Request) {
  const { apiKey } = (await request.json()) ?? {};

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "apiKey is required." }, { status: 400 });
  }

  try {
    const keyInfo = await getKeyInfo(apiKey);
    const libraries: ZoteroLibraryRef[] = [];

    if (keyInfo.access.user?.library) {
      libraries.push({
        id: String(keyInfo.userID),
        type: "user",
        name: `${keyInfo.username} (personal library)`,
      });
    }

    const groups = await getAccessibleGroups(apiKey, keyInfo.userID);
    for (const group of groups) {
      libraries.push({ id: String(group.id), type: "group", name: group.data.name });
    }

    return NextResponse.json({ libraries });
  } catch (err) {
    if (err instanceof ZoteroApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 502 });
    }
    return NextResponse.json({ error: "Failed to reach Zotero." }, { status: 502 });
  }
}
