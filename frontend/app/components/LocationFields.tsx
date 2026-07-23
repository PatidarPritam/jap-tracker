"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useT } from "./LanguageProvider";
import { Field, Input } from "./ui";
import type { AuthRole } from "../lib/auth";

/**
 * All Indian states and union territories, in both scripts — someone typing
 * "मध्य" must find Madhya Pradesh just as easily as someone typing "mp".
 * The English name is what gets stored, keeping the data searchable.
 */
const INDIAN_STATES: { en: string; hi: string }[] = [
  { en: "Andhra Pradesh", hi: "आंध्र प्रदेश" },
  { en: "Arunachal Pradesh", hi: "अरुणाचल प्रदेश" },
  { en: "Assam", hi: "असम" },
  { en: "Bihar", hi: "बिहार" },
  { en: "Chhattisgarh", hi: "छत्तीसगढ़" },
  { en: "Goa", hi: "गोवा" },
  { en: "Gujarat", hi: "गुजरात" },
  { en: "Haryana", hi: "हरियाणा" },
  { en: "Himachal Pradesh", hi: "हिमाचल प्रदेश" },
  { en: "Jharkhand", hi: "झारखंड" },
  { en: "Karnataka", hi: "कर्नाटक" },
  { en: "Kerala", hi: "केरल" },
  { en: "Madhya Pradesh", hi: "मध्य प्रदेश" },
  { en: "Maharashtra", hi: "महाराष्ट्र" },
  { en: "Manipur", hi: "मणिपुर" },
  { en: "Meghalaya", hi: "मेघालय" },
  { en: "Mizoram", hi: "मिज़ोरम" },
  { en: "Nagaland", hi: "नगालैंड" },
  { en: "Odisha", hi: "ओडिशा" },
  { en: "Punjab", hi: "पंजाब" },
  { en: "Rajasthan", hi: "राजस्थान" },
  { en: "Sikkim", hi: "सिक्किम" },
  { en: "Tamil Nadu", hi: "तमिलनाडु" },
  { en: "Telangana", hi: "तेलंगाना" },
  { en: "Tripura", hi: "त्रिपुरा" },
  { en: "Uttar Pradesh", hi: "उत्तर प्रदेश" },
  { en: "Uttarakhand", hi: "उत्तराखंड" },
  { en: "West Bengal", hi: "पश्चिम बंगाल" },
  { en: "Andaman and Nicobar Islands", hi: "अंडमान और निकोबार द्वीप समूह" },
  { en: "Chandigarh", hi: "चंडीगढ़" },
  { en: "Dadra and Nagar Haveli and Daman and Diu", hi: "दादरा और नगर हवेली और दमन और दीव" },
  { en: "Delhi", hi: "दिल्ली" },
  { en: "Jammu and Kashmir", hi: "जम्मू और कश्मीर" },
  { en: "Ladakh", hi: "लद्दाख" },
  { en: "Lakshadweep", hi: "लक्षद्वीप" },
  { en: "Puducherry", hi: "पुडुचेरी" },
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
  const [isStateOpen, setIsStateOpen] = useState(false);
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

  // "mp" should find Madhya Pradesh: match by substring OR by initials.
  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((word) => word[0] ?? "")
      .join("")
      .toLowerCase();
  const matchesName = (query: string, name: string | null) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const full = (name ?? "").toLowerCase();
    return full.includes(q) || initials(name ?? "").startsWith(q);
  };

  const stateSuggestions = values.state.trim()
    ? INDIAN_STATES.filter(
        (state) => matchesName(values.state, state.en) || matchesName(values.state, state.hi)
      ).slice(0, 8)
    : [];

  // A Hindi (or abbreviated) state entry still has to filter the English
  // village results — resolve it to the canonical English name first.
  const typedState = values.state.trim();
  const canonicalState =
    INDIAN_STATES.find(
      (state) => state.hi === typedState || state.en.toLowerCase() === typedState.toLowerCase()
    )?.en ?? values.state;

  // Big-to-small entry: a state/district already chosen above narrows the
  // village matches, so a same-named village in another state never shows.
  const visibleSuggestions = suggestions.filter(
    (suggestion) =>
      matchesName(canonicalState, suggestion.state) &&
      matchesName(values.district, suggestion.district)
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("admin.state")} className="relative sm:col-span-2">
        <Input
          name="state"
          value={values.state}
          autoComplete="off"
          placeholder={t("admin.state")}
          disabled={disabled}
          onChange={(event) => {
            set("state", event.target.value);
            setIsStateOpen(true);
          }}
          onFocus={() => setIsStateOpen(true)}
          onBlur={() => setIsStateOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsStateOpen(false);
          }}
        />
        {isStateOpen &&
          stateSuggestions.length > 0 &&
          // Exact match already picked — nothing left to suggest.
          stateSuggestions[0].en !== values.state && (
            <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg">
              {stateSuggestions.map((state) => (
                <li key={state.en}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      set("state", state.en);
                      setIsStateOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-medium transition hover:bg-saffron-50"
                  >
                    <span className="font-devanagari">{state.hi}</span>
                    <span className="text-muted"> — {state.en}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
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
