"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export interface ItemTypeOption {
  itemType: string;
  label: string;
  count: number;
  peerReviewed: boolean;
}

export function ItemTypeFilter({
  options,
  excluded,
  onChange,
}: {
  options: ItemTypeOption[];
  /** Item types unchecked by the user. Empty = everything selected (the default). */
  excluded: string[];
  onChange: (excluded: string[]) => void;
}) {
  const { messages } = useLanguage();
  const t = messages.compare;

  if (options.length === 0) return null;

  function toggle(itemType: string) {
    onChange(excluded.includes(itemType) ? excluded.filter((v) => v !== itemType) : [...excluded, itemType]);
  }

  function toggleGroup(groupOptions: ItemTypeOption[]) {
    const groupTypes = groupOptions.map((o) => o.itemType);
    const allExcluded = groupTypes.every((it) => excluded.includes(it));
    onChange(
      allExcluded
        ? excluded.filter((it) => !groupTypes.includes(it))
        : Array.from(new Set([...excluded, ...groupTypes]))
    );
  }

  const peerReviewed = options.filter((o) => o.peerReviewed);
  const other = options.filter((o) => !o.peerReviewed);

  return (
    <div>
      <div className="flex items-center gap-2 text-xs">
        <button type="button" onClick={() => onChange([])} className="text-zinc-500 underline hover:text-zinc-700">
          {t.selectAllTypes}
        </button>
        <span className="text-zinc-300 dark:text-zinc-700">·</span>
        <button
          type="button"
          onClick={() => onChange(options.map((o) => o.itemType))}
          className="text-zinc-500 underline hover:text-zinc-700"
        >
          {t.deselectAllTypes}
        </button>
      </div>
      <OptionRow
        label={t.peerReviewedGroup}
        options={peerReviewed}
        excluded={excluded}
        onToggle={toggle}
        onToggleGroup={() => toggleGroup(peerReviewed)}
      />
      <OptionRow
        label={t.otherTypesGroup}
        options={other}
        excluded={excluded}
        onToggle={toggle}
        onToggleGroup={() => toggleGroup(other)}
      />
    </div>
  );
}

function OptionRow({
  label,
  options,
  excluded,
  onToggle,
  onToggleGroup,
}: {
  label: string;
  options: ItemTypeOption[];
  excluded: string[];
  onToggle: (itemType: string) => void;
  onToggleGroup: () => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <button
        type="button"
        onClick={onToggleGroup}
        className="text-xs text-zinc-500 underline decoration-dotted hover:text-zinc-700 hover:decoration-solid dark:hover:text-zinc-300"
      >
        {label}:
      </button>
      {options.map((o) => (
        <label key={o.itemType} className="flex items-center gap-1 whitespace-nowrap">
          <input
            type="checkbox"
            checked={!excluded.includes(o.itemType)}
            onChange={() => onToggle(o.itemType)}
            className="h-3.5 w-3.5"
          />
          {o.label} ({o.count})
        </label>
      ))}
    </div>
  );
}
