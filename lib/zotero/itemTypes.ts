/**
 * Zotero item types, human labels, and a classification used to group
 * the publication-type filter into three sections. This is a pragmatic
 * default (journal articles + conference papers count as peer-reviewed;
 * preprints get their own section, since they're real scholarly output
 * but explicitly not yet peer-reviewed - lumping them into either of the
 * other two groups would misrepresent them; everything else is "other")
 * - accurate for most academic libraries, but not a judgment Zotero
 * itself makes.
 */
export const PEER_REVIEWED_TYPES = new Set(["journalArticle", "conferencePaper"]);
const PREPRINT_TYPES = new Set(["preprint"]);

export type ItemTypeCategory = "peerReviewed" | "preprint" | "other";

const ITEM_TYPE_LABELS: Record<string, string> = {
  journalArticle: "Journal Article",
  conferencePaper: "Conference Paper",
  book: "Book",
  bookSection: "Book Section",
  thesis: "Thesis",
  report: "Report",
  preprint: "Preprint",
  manuscript: "Manuscript",
  presentation: "Presentation",
  patent: "Patent",
  magazineArticle: "Magazine Article",
  newspaperArticle: "Newspaper Article",
  webpage: "Web Page",
  blogPost: "Blog Post",
  document: "Document",
  encyclopediaArticle: "Encyclopedia Article",
  dictionaryEntry: "Dictionary Entry",
  case: "Case",
  statute: "Statute",
  bill: "Bill",
  hearing: "Hearing",
  letter: "Letter",
  interview: "Interview",
  film: "Film",
  videoRecording: "Video Recording",
  audioRecording: "Audio Recording",
  podcast: "Podcast",
  radioBroadcast: "Radio Broadcast",
  tvBroadcast: "TV Broadcast",
  artwork: "Artwork",
  map: "Map",
  computerProgram: "Software",
  dataset: "Dataset",
  standard: "Standard",
  instantMessage: "Instant Message",
  forumPost: "Forum Post",
};

export function itemTypeLabel(itemType: string): string {
  return ITEM_TYPE_LABELS[itemType] ?? itemType;
}

export function itemTypeCategory(itemType: string): ItemTypeCategory {
  if (PEER_REVIEWED_TYPES.has(itemType)) return "peerReviewed";
  if (PREPRINT_TYPES.has(itemType)) return "preprint";
  return "other";
}
