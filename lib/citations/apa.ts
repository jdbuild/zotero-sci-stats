import type { ZoteroCreator, ZoteroItemData } from "@/lib/zotero/types";

export interface APACitationParts {
  authors: string;
  year: string;
  title: string;
  /** Journal/proceedings/book title etc. Italicized in the rendered list. */
  container: string;
  /** Whether the container should be introduced with "In " (chapters, papers in proceedings). */
  containerIsIn: boolean;
  /** "12(3), 45-52" for a journal article, "pp. 45-52" for a chapter/paper, or "" */
  volumeIssuePages: string;
  /** Publisher. APA 7 dropped the publisher location, so no place here. */
  publisher: string;
}

function formatAuthorAPA(creator: ZoteroCreator): string {
  if (creator.name) return creator.name;
  const initials = (creator.firstName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(" ");
  return [creator.lastName, initials].filter(Boolean).join(", ");
}

/**
 * APA 7th-edition reference-list author formatting: every author is named
 * up to 20; only beyond that does it truncate (first 19, an ellipsis, then
 * the final author) - unlike IEEE's much shorter "et al." cutoff.
 */
function formatAuthorsAPA(creators: ZoteroCreator[]): string {
  const authors = creators.filter((c) => !c.creatorType || c.creatorType === "author");
  const list = (authors.length > 0 ? authors : creators).map(formatAuthorAPA).filter(Boolean);

  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  // APA always puts a comma before the final "&", even for exactly 2 authors
  // ("Author, A., & Author, B.") - unlike IEEE, which omits it for a pair.
  if (list.length <= 20) return `${list.slice(0, -1).join(", ")}, & ${list[list.length - 1]}`;
  return `${list.slice(0, 19).join(", ")}, ... ${list[list.length - 1]}`;
}

function containerTitle(itemType: string, raw: ZoteroItemData): string {
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");

  switch (itemType) {
    case "journalArticle":
    case "magazineArticle":
    case "newspaperArticle":
      return str("publicationTitle");
    case "conferencePaper":
      return str("proceedingsTitle") || str("conferenceName");
    case "bookSection":
      return str("bookTitle");
    case "thesis":
      return str("university");
    case "report":
      return str("institution") || str("seriesTitle");
    case "webpage":
      return str("websiteTitle");
    case "preprint":
      return str("repository");
    default:
      return "";
  }
}

const IN_PREFIX_TYPES = new Set(["conferencePaper", "bookSection"]);

export function toAPAParts(item: {
  itemType: string;
  title: string;
  publicationYear: number | null;
  date: string;
  raw: ZoteroItemData;
}): APACitationParts {
  const raw = item.raw ?? ({} as ZoteroItemData);
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");

  const container = containerTitle(item.itemType, raw);
  const volume = str("volume");
  const issue = str("issue");
  const pages = str("pages");
  const publisher = str("publisher");

  const volumeIssuePages = IN_PREFIX_TYPES.has(item.itemType)
    ? pages
      ? `pp. ${pages}`
      : ""
    : [volume ? `${volume}${issue ? `(${issue})` : ""}` : "", pages].filter(Boolean).join(", ");

  return {
    authors: formatAuthorsAPA(raw.creators ?? []),
    year: item.publicationYear ? String(item.publicationYear) : item.date || "n.d.",
    title: item.title || "[Untitled]",
    container,
    containerIsIn: IN_PREFIX_TYPES.has(item.itemType),
    volumeIssuePages,
    publisher,
  };
}
