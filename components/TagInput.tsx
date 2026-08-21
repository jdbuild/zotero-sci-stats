"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export function TagInput({
  tags,
  onChange,
  suggestions,
  placeholder,
  prefix = "#",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder: string;
  prefix?: string;
}) {
  const [draft, setDraft] = useState("");
  // useId (not the query set's own id, which is client-generated via
  // crypto.randomUUID() and would differ between the server and client
  // render) keeps this datalist id stable and unique across SSR + hydration.
  const listId = useId();

  function addTag(value: string) {
    const tag = value.trim();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 rounded-md border border-zinc-300 p-2 dark:border-zinc-700">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
          >
            {prefix}
            {tag}
            <button onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          list={listId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft && addTag(draft)}
          placeholder={placeholder}
          className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
