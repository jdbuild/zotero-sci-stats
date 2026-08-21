export type ZoteroLibraryType = "user" | "group";

export interface ZoteroLibraryRef {
  id: string;
  type: ZoteroLibraryType;
  name: string;
}

export interface ZoteroCreator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface ZoteroItemData {
  key: string;
  version: number;
  itemType: string;
  title?: string;
  creators?: ZoteroCreator[];
  date?: string;
  dateAdded?: string;
  dateModified?: string;
  tags?: { tag: string }[];
  collections?: string[];
  url?: string;
  abstractNote?: string;
  publicationTitle?: string;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface ZoteroItemResponse {
  key: string;
  version: number;
  library: { type: ZoteroLibraryType; id: number; name: string };
  data: ZoteroItemData;
}

export interface ZoteroKeyInfo {
  key: string;
  userID: number;
  username: string;
  access: {
    user?: { library?: boolean; write?: boolean };
    groups?: Record<string, { library?: boolean; write?: boolean }>;
  };
}

export interface ZoteroGroup {
  id: number;
  version: number;
  data: { id: number; name: string; [key: string]: unknown };
}

export interface ZoteroDeletedResponse {
  items: string[];
  collections: string[];
  searches: string[];
  tags: string[];
  settings: string[];
}
