function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Best-effort parse of Zotero's free-text `date` field into a real Date,
 * for day-precision filtering. Zotero dates arrive in wildly different
 * shapes ("2026", "2026-03", "2026-03-14", "March 2026", ...); this
 * normalizes missing precision to the 1st of the month/year, the same
 * convention most bibliographic tools use so a partial date still sorts
 * and range-filters sensibly (e.g. "2026" -> 2026-01-01, so a filter of
 * 2026-01-01..2026-12-31 still captures it).
 *
 * Unambiguous numeric forms are parsed with explicit regexes first,
 * since they're by far the most common case coming out of Zotero and
 * avoids the timezone quirks of the generic `Date` constructor (ISO
 * date-only strings parse as UTC, but free-text ones parse in local
 * time). Anything else falls back to `new Date(...)`, then to a bare
 * 4-digit year found anywhere in the string.
 */
export function parsePublicationDate(date: string | undefined): Date | null {
  if (!date) return null;
  const trimmed = date.trim();

  let match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return utcDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (match) return utcDate(Number(match[1]), Number(match[2]), 1);

  match = trimmed.match(/^(\d{4})$/);
  if (match) return utcDate(Number(match[1]), 1, 1);

  const lenient = new Date(trimmed);
  if (!Number.isNaN(lenient.getTime())) return lenient;

  match = trimmed.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  if (match) return utcDate(Number(match[0]), 1, 1);

  return null;
}

/** Convenience wrapper for the (still useful) year-only grouping used by the charts. */
export function parsePublicationYear(date: string | undefined): number | null {
  const parsed = parsePublicationDate(date);
  return parsed ? parsed.getUTCFullYear() : null;
}
