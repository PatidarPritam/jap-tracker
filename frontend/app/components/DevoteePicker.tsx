"use client";

import { useEffect, useState } from "react";
import { apiRequest, asPage, Devotee, Paginated } from "../lib/api";
import { devoteeLabel } from "../lib/devotee";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Icon, Input, Spinner } from "./ui";

/**
 * Server-backed devotee typeahead. Queries /api/devotees?search= on demand
 * (debounced) so it scales regardless of how many devotees exist — replacing
 * the old "load every devotee into a <select>" pattern.
 */
export function DevoteePicker({
  selected,
  onSelect,
  disabled,
}: {
  selected: Devotee | null;
  onSelect: (devotee: Devotee | null) => void;
  disabled?: boolean;
}) {
  const [queryText, setQueryText] = useState("");
  const debounced = useDebouncedValue(queryText, 300);
  const [results, setResults] = useState<Devotee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selected) return;
    const term = debounced.trim();
    if (!term) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    apiRequest<Paginated<Devotee> | Devotee[]>(
      `/api/devotees?search=${encodeURIComponent(term)}&pageSize=8`,
      undefined,
      "admin"
    )
      .then((data) => {
        if (!cancelled) {
          setResults(asPage(data).items);
          setOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, selected]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-muted px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-semibold">{selected.name}</p>
          <p className="truncate text-sm text-muted">{devoteeLabel(selected)}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQueryText("");
          }}
          className="flex-none text-sm font-semibold text-saffron-700 hover:text-saffron-800"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {open && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setOpen(false)}
        />
      )}
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <Input
        value={queryText}
        onChange={(event) => setQueryText(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search name, mobile, email, PIN…"
        className="relative z-20 pl-9"
        disabled={disabled}
        autoComplete="off"
      />
      {open && (debounced.trim() || isSearching) && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-float">
          {isSearching ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted">
              <Spinner size="sm" /> Searching…
            </div>
          ) : results.length ? (
            results.map((devotee) => (
              <button
                key={devotee.id}
                type="button"
                onClick={() => {
                  onSelect(devotee);
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start gap-0.5 border-b border-line-soft px-3 py-2 text-left last:border-0 hover:bg-saffron-50"
              >
                <span className="font-semibold">{devotee.name}</span>
                <span className="text-xs text-muted">{devoteeLabel(devotee)}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-muted">No devotee found. Register them first.</p>
          )}
        </div>
      )}
    </div>
  );
}
