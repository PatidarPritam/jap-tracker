import type { Devotee } from "./api";

type LocationFields = Pick<Devotee, "village" | "city" | "tehsil" | "district" | "state">;

/** Human-readable location string from the devotee's address hierarchy. */
export function locationText(devotee: LocationFields): string {
  return (
    [devotee.village || devotee.city, devotee.tehsil, devotee.district, devotee.state]
      .filter(Boolean)
      .join(", ") || "Location not added"
  );
}

/** Disambiguating label for selects/search where names may collide. */
export function devoteeLabel(devotee: Devotee): string {
  return [
    devotee.name,
    devotee.email,
    devotee.mobile ? `Mobile ${devotee.mobile}` : null,
    locationText(devotee),
  ]
    .filter(Boolean)
    .join(" - ");
}
