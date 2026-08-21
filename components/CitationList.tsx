"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { APACitationParts } from "@/lib/citations/apa";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** The subset of QuerySetStats (or a network edge) this list actually needs. */
export interface CitationListStat {
  name: string;
  total: number;
  items: APACitationParts[];
  itemsTruncated: boolean;
}

export function CitationList({ stat }: { stat: CitationListStat }) {
  const { messages } = useLanguage();
  const [open, setOpen] = useState(false);

  if (stat.items.length === 0) return null;

  return (
    <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {stat.name} — {messages.compare.citationListHeading} ({stat.total})
      </button>

      {open && (
        <div className="mt-2">
          {stat.itemsTruncated && (
            <p className="mb-2 text-xs text-zinc-500">
              {messages.compare.showingOf
                .replace("{shown}", String(stat.items.length))
                .replace("{total}", String(stat.total))}
            </p>
          )}
          <ul className="space-y-2 text-sm">
            {stat.items.map((item, i) => (
              <li key={i} style={{ paddingLeft: "1.5rem", textIndent: "-1.5rem" }}>
                {item.authors && `${item.authors} `}({item.year}).{" "}
                {item.container ? (
                  item.containerIsIn ? (
                    <>
                      {item.title}. In <em>{item.container}</em>
                      {item.volumeIssuePages && ` (${item.volumeIssuePages})`}.
                    </>
                  ) : (
                    <>
                      {item.title}. <em>{item.container}</em>
                      {item.volumeIssuePages && `, ${item.volumeIssuePages}`}.
                    </>
                  )
                ) : (
                  <em>{item.title}.</em>
                )}
                {item.publisher && ` ${item.publisher}.`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
