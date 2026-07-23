"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useT } from "./LanguageProvider";
import { Field, Input } from "./ui";
import type { AuthRole } from "../lib/auth";

/** All Indian states and union territories — no API needed for this one. */
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

type Suggestion = {
  village: string;
  tehsil: string | null;
  district: string;
  state: string;
};

/**
 * Village / city / tehsil / district / state as one unit. Typing in the
 * village box queries India Post's post-office directory (via our backend
 * proxy) and picking a suggestion autofills tehsil, district and state.
 * Every field stays a plain editable input, so a hamlet the directory does
 * not know can still be typed by hand.
 */
export function LocationFields({
  role,
  disabled,
  listPrefix = "",
}: {
  role: AuthRole;
  disabled?: boolean;
  /** Matches the ids of any datalists the page renders (e.g. "city-options"). */
  listPrefix?: string;
}) {
  const t = useT();
  const [values, setValues] = useState({
    village: "",
    city: "",
    tehsil: "",
    district: "",
    state: "",
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedVillage = useDebouncedValue(values.village, 350);
  // A picked suggestion must not immediately re-trigger a search for itself.
  const pickedRef = useRef<string | null>(null);
  // The API can answer after the user has already tabbed to the next field —
  // the list must only pop open while the village box still has focus.
  const isFocusedRef = useRef(false);

  useEffect(() => {
    const term = debouncedVillage.trim();
    if (term.length < 3 || term === pickedRef.current) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    void apiRequest<Suggestion[]>(
      `/api/locations/suggest?q=${encodeURIComponent(term)}`,
      undefined,
      role
    )
      .then((data) => {
        if (cancelled) return;
        setSuggestions(data);
        setIsOpen(data.length > 0 && isFocusedRef.current);
      })
      .catch(() => undefined); // suggestions are best-effort
    return () => {
      cancelled = true;
    };
  }, [debouncedVillage, role]);

  function set(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function pick(suggestion: Suggestion) {
    pickedRef.current = suggestion.village;
    setValues((current) => ({
      ...current,
      village: suggestion.village,
      tehsil: suggestion.tehsil ?? current.tehsil,
      district: suggestion.district,
      state: suggestion.state,
    }));
    setSuggestions([]);
    setIsOpen(false);
  }

  // Big-to-small entry: a state/district already chosen above narrows the
  // village matches, so a same-named village in another state never shows.
  const matches = (chosen: string, fromApi: string | null) =>
    !chosen.trim() ||
    (fromApi ?? "").toLowerCase().includes(chosen.trim().toLowerCase());
  const visibleSuggestions = suggestions.filter(
    (suggestion) =>
      matches(values.state, suggestion.state) && matches(values.district, suggestion.district)
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("admin.state")} className="sm:col-span-2">
        <Input
          name="state"
          value={values.state}
          list="indian-states"
          placeholder={t("admin.state")}
          disabled={disabled}
          onChange={(event) => set("state", event.target.value)}
        />
        <datalist id="indian-states">
          {INDIAN_STATES.map((state) => (
            <option key={state} value={state} />
          ))}
        </datalist>
      </Field>
      <Field label={t("admin.district")}>
        <Input
          name="district"
          value={values.district}
          placeholder={t("admin.district")}
          disabled={disabled}
          onChange={(event) => set("district", event.target.value)}
        />
      </Field>
      <Field label={t("admin.tehsil")}>
        <Input
          name="tehsil"
          value={values.tehsil}
          placeholder={t("admin.tehsil")}
          disabled={disabled}
          onChange={(event) => set("tehsil", event.target.value)}
        />
      </Field>
      <Field label={t("admin.village")} className="relative">
        <Input
          name="village"
          value={values.village}
          autoComplete="off"
          placeholder={t("admin.village")}
          disabled={disabled}
          onChange={(event) => {
            pickedRef.current = null;
            set("village", event.target.value);
          }}
          onFocus={() => {
            isFocusedRef.current = true;
            setIsOpen(suggestions.length > 0);
          }}
          onBlur={() => {
            isFocusedRef.current = false;
            setIsOpen(false);
          }}
          // Esc dismisses the list so the typed name can stay as-is.
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
        />
        {isOpen && visibleSuggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg">
            {visibleSuggestions.map((suggestion) => (
              <li key={`${suggestion.village}-${suggestion.district}`}>
                <button
                  type="button"
                  // onMouseDown fires before the input's blur closes the list.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(suggestion);
                  }}
                  className="w-full px-3 py-2 text-left text-sm transition hover:bg-saffron-50"
                >
                  <span className="font-semibold">{suggestion.village}</span>
                  <span className="block text-xs text-muted">
                    {[suggestion.tehsil, suggestion.district, suggestion.state]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </button>
              </li>
            ))}
            {/* Escape hatch: the directory may simply not know this village. */}
            <li className="border-t border-line-soft">
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  pickedRef.current = values.village;
                  setSuggestions([]);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-muted transition hover:bg-saffron-50"
              >
                {t("admin.keepTyped", { name: values.village })}
              </button>
            </li>
          </ul>
        )}
      </Field>
      <Field label={t("admin.city")}>
        <Input
          name="city"
          value={values.city}
          list={listPrefix ? `${listPrefix}city-options` : undefined}
          placeholder={t("admin.city")}
          disabled={disabled}
          onChange={(event) => set("city", event.target.value)}
        />
      </Field>
    </div>
  );
}
