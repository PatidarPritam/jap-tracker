"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  apiRequest,
  asPage,
  Devotee,
  emptyLocationOptions,
  formatCount,
  LocationOptions,
  Paginated,
  today,
  threeMonthsFromToday,
} from "../../lib/api";
import { locationText } from "../../lib/devotee";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { TrustShell } from "../../components/TrustShell";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  Input,
  Skeleton,
  useToast,
} from "../../components/ui";
import { useT } from "../../components/LanguageProvider";
import type { TranslationKey } from "../../lib/i18n";

const PAGE_SIZE = 10;

const LOCATION_FIELDS: { name: string; labelKey: TranslationKey; list: string }[] = [
  { name: "village", labelKey: "admin.village", list: "village-options" },
  { name: "city", labelKey: "admin.city", list: "city-options" },
  { name: "tehsil", labelKey: "admin.tehsil", list: "tehsil-options" },
  { name: "district", labelKey: "admin.district", list: "district-options" },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminDevoteesPage() {
  const { hasToken, handleAuthError } = useAdminGuard();
  const t = useT();
  const toast = useToast();
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [selectedDevotee, setSelectedDevotee] = useState<Devotee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDevotee, setIsAddingDevotee] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [locationOptions, setLocationOptions] = useState<LocationOptions>(emptyLocationOptions);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadDevotees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      const term = debouncedSearch.trim();
      if (term) params.set("search", term);
      const data = await apiRequest<Paginated<Devotee> | Devotee[]>(
        `/api/devotees?${params.toString()}`,
        undefined,
        "admin"
      );
      const pageData = asPage(data);
      setDevotees(pageData.items);
      setTotal(pageData.total);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.backendUnreachable");
      if (!handleAuthError(message)) toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, handleAuthError, toast, t]);

  const loadOptions = useCallback(async () => {
    const options = await apiRequest<LocationOptions>(
      "/api/locations/options",
      undefined,
      "admin"
    ).catch(() => emptyLocationOptions);
    setLocationOptions(options);
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    // Fetch-on-mount / search / page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDevotees();
  }, [hasToken, loadDevotees]);

  useEffect(() => {
    if (!hasToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOptions();
  }, [hasToken, loadOptions]);

  async function createDevotee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      setIsAddingDevotee(true);
      const createdDevotee = await apiRequest<
        Pick<
          Devotee,
          | "id"
          | "name"
          | "email"
          | "mobile"
          | "accessCode"
          | "village"
          | "city"
          | "tehsil"
          | "district"
          | "state"
        >
      >(
        "/api/devotees",
        {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name") ?? "").trim(),
            email: String(form.get("email") ?? "").trim(),
            mobile: String(form.get("mobile") ?? "").trim(),
            village: String(form.get("village") ?? "").trim(),
            city: String(form.get("city") ?? "").trim(),
            tehsil: String(form.get("tehsil") ?? "").trim(),
            district: String(form.get("district") ?? "").trim(),
            state: String(form.get("state") ?? "").trim(),
          }),
        },
        "admin"
      );
      await apiRequest(
        "/api/sankalps",
        {
          method: "POST",
          body: JSON.stringify({
            devoteeId: createdDevotee.id,
            title: String(form.get("title") ?? ""),
            targetCount: Number(form.get("targetCount") ?? 0),
            startDate: String(form.get("startDate") ?? ""),
            endDate: String(form.get("endDate") ?? ""),
          }),
        },
        "admin"
      );
      const newDevotee: Devotee = {
        ...createdDevotee,
        totalJap: 0,
        activeSankalp: {
          id: "new",
          title: String(form.get("title") ?? ""),
          targetCount: Number(form.get("targetCount") ?? 0),
          completedCount: 0,
          progressPercent: 0,
          startDate: String(form.get("startDate") ?? ""),
          endDate: String(form.get("endDate") ?? ""),
          assignedAt: new Date().toISOString(),
          isCompleted: false,
        },
      };
      formElement.reset();
      setSelectedDevotee(newDevotee);
      setSearchInput("");
      setPage(1);
      toast.success(t("admin.registered1", { name: newDevotee.name }));
      await loadDevotees();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.registerFailed");
      if (!handleAuthError(message)) {
        toast.error(
          message.includes("already exists")
            ? t("admin.emailExists")
            : message
        );
      }
    } finally {
      setIsAddingDevotee(false);
    }
  }

  async function resetLoginPin() {
    if (!selectedDevotee) return;
    try {
      setIsResettingPin(true);
      const updated = await apiRequest<Pick<Devotee, "id" | "accessCode">>(
        `/api/devotees/${selectedDevotee.id}/reset-pin`,
        { method: "POST" },
        "admin"
      );
      setSelectedDevotee((current) =>
        current ? { ...current, accessCode: updated.accessCode } : current
      );
      setDevotees((current) =>
        current.map((devotee) =>
          devotee.id === updated.id ? { ...devotee, accessCode: updated.accessCode } : devotee
        )
      );
      toast.success(t("admin.pinReset"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.pinResetFailed");
      if (!handleAuthError(message)) toast.error(message);
    } finally {
      setIsResettingPin(false);
    }
  }

  // Devotees sign in with their mobile + PIN, so everyone shares the same
  // app link — there is no per-devotee URL to hand out any more.
  const devoteeUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "";

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("admin.copied", { label }));
    } catch {
      toast.error(t("admin.copyFailed"));
    }
  }

  if (!hasToken) {
    return (
      <TrustShell active="devotees">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-40" />
        </div>
      </TrustShell>
    );
  }

  return (
    <TrustShell active="devotees">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-7">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
          >
            ← Admin Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Register New Devotee</h1>
          <p className="mt-2 max-w-2xl text-muted">
            For first-time devotees, create their profile and first sankalp together. For an
            existing devotee, search below and assign a new sankalp from the Sankalp page.
          </p>
        </header>

        <datalist id="village-options">
          {locationOptions.villages.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="city-options">
          {locationOptions.cities.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="tehsil-options">
          {locationOptions.tehsils.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="district-options">
          {locationOptions.districts.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="state-options">
          {locationOptions.states.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>

        <section className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          {/* Register form */}
          <Card className="lg:sticky lg:top-24">
            <CardHeader title={t("admin.newDevotee")} />
            <form onSubmit={createDevotee} className="mt-5 grid gap-4">
              <Field label={t("admin.devoteeName")} required>
                <Input name="name" placeholder={t("admin.fullName")} disabled={isAddingDevotee} required />
              </Field>
              <Field label={t("admin.email")} required>
                <Input
                  name="email"
                  type="email"
                  placeholder="devotee@example.com"
                  disabled={isAddingDevotee}
                  required
                />
              </Field>
              <Field label={t("admin.mobile")} hint={t("admin.mobileHint")}>
                <Input
                  name="mobile"
                  type="tel"
                  inputMode="tel"
                  placeholder="10-digit mobile"
                  disabled={isAddingDevotee}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                {LOCATION_FIELDS.map((field) => (
                  <Field key={field.name} label={t(field.labelKey)}>
                    <Input
                      name={field.name}
                      list={field.list}
                      placeholder={t(field.labelKey)}
                      disabled={isAddingDevotee}
                    />
                  </Field>
                ))}
                <Field label={t("admin.state")} className="sm:col-span-2">
                  <Input
                    name="state"
                    list="state-options"
                    placeholder={t("admin.state")}
                    disabled={isAddingDevotee}
                  />
                </Field>
              </div>

              <div className="my-1 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                <span className="h-px flex-1 bg-line" />
                {t("admin.firstSankalp")}
                <span className="h-px flex-1 bg-line" />
              </div>

              <Field label={t("admin.sankalpTitle")} required>
                <Input
                  name="title"
                  defaultValue="3 Month Jap Sankalp"
                  disabled={isAddingDevotee}
                  required
                />
              </Field>
              <Field label={t("admin.targetCount")} required>
                <Input
                  name="targetCount"
                  type="number"
                  min="1"
                  defaultValue="100000"
                  disabled={isAddingDevotee}
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("admin.startDate")} required>
                  <Input
                    name="startDate"
                    type="date"
                    defaultValue={today()}
                    disabled={isAddingDevotee}
                    required
                  />
                </Field>
                <Field label={t("admin.endDate")} required>
                  <Input
                    name="endDate"
                    type="date"
                    defaultValue={threeMonthsFromToday()}
                    disabled={isAddingDevotee}
                    required
                  />
                </Field>
              </div>
              <Button type="submit" isLoading={isAddingDevotee} fullWidth>
                {isAddingDevotee ? t("admin.registering") : t("admin.registerSubmit")}
              </Button>
            </form>
          </Card>

          <div className="grid gap-6">
            {/* Access panel */}
            <Card>
              <CardHeader
                title={t("admin.devoteeAccess")}
                subtitle={t("admin.devoteeAccessSub")}
              />
              {selectedDevotee ? (
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-saffron-100 text-sm font-semibold text-saffron-700"
                    >
                      {initials(selectedDevotee.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{selectedDevotee.name}</p>
                      <p className="truncate text-sm text-muted">
                        {selectedDevotee.email}
                        {selectedDevotee.mobile ? ` · ${selectedDevotee.mobile}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-soft bg-surface-muted px-3 py-2.5">
                    <Icon name="key" className="h-4 w-4 text-saffron-700" />
                    <span className="text-sm text-muted">{t("admin.loginPin")}</span>
                    <span className="font-mono text-base font-semibold tracking-wider text-ink">
                      {selectedDevotee.accessCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedDevotee.accessCode ?? "", "PIN")}
                      className="ml-auto text-sm font-semibold text-saffron-700 hover:text-saffron-800"
                    >
                      {t("admin.copy")}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-surface-muted px-3 py-2.5">
                    <Icon name="link" className="h-4 w-4 flex-none text-saffron-700" />
                    <span className="truncate text-sm text-muted">{devoteeUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(devoteeUrl, "Link")}
                      className="ml-auto flex-none text-sm font-semibold text-saffron-700 hover:text-saffron-800"
                    >
                      {t("admin.copy")}
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link href={`/admin/devotees/${selectedDevotee.id}`} className="contents">
                      <Button variant="success" fullWidth>
                        {t("admin.openPanel")}
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      isLoading={isResettingPin}
                      onClick={resetLoginPin}
                      fullWidth
                    >
                      <Icon name="refresh" className="h-4 w-4" />
                      {isResettingPin ? t("admin.resetting") : t("admin.resetPin")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  {t("admin.noneSelected")}
                </p>
              )}
            </Card>

            {/* All devotees */}
            <Card>
              <CardHeader title={t("admin.allDevotees")} subtitle={t("admin.registered", { count: total })} />
              <div className="relative mt-4">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("admin.searchPlaceholder")}
                  className="pl-9"
                  aria-label={t("admin.searchDevotees")}
                />
              </div>
              <div className="mt-4 grid gap-2.5">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20" />
                  ))
                ) : devotees.length ? (
                  devotees.map((devotee) => {
                    const isSelected = selectedDevotee?.id === devotee.id;
                    return (
                      <button
                        key={devotee.id}
                        type="button"
                        onClick={() => setSelectedDevotee(devotee)}
                        aria-pressed={isSelected}
                        className={
                          isSelected
                            ? "flex items-center justify-between gap-3 rounded-lg border-2 border-saffron-400 bg-saffron-50 p-3.5 text-left"
                            : "flex items-center justify-between gap-3 rounded-lg border border-line-soft p-3.5 text-left transition hover:border-saffron-300 hover:bg-saffron-50"
                        }
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden
                            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-saffron-100 text-sm font-semibold text-saffron-700"
                          >
                            {initials(devotee.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{devotee.name}</p>
                            <p className="truncate text-sm text-muted">{devotee.email}</p>
                            <p className="truncate text-sm text-muted">{locationText(devotee)}</p>
                          </div>
                        </div>
                        <div className="flex-none text-right">
                          <p className="font-semibold">{formatCount(devotee.totalJap)}</p>
                          <p className="text-xs text-muted">{t("admin.totalJapShort")}</p>
                          <Badge tone="neutral" className="mt-1">
                            PIN {devotee.accessCode}
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <EmptyState
                    icon={<Icon name="search" className="h-6 w-6" />}
                    title={t(debouncedSearch.trim() ? "admin.noMatches" : "admin.noDevoteesTitle")}
                    description={
                      debouncedSearch.trim()
                        ? t("admin.noMatchesText")
                        : t("admin.registerFirstText")
                    }
                  />
                )}
              </div>

              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
                  <p className="text-sm text-muted">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1 || isLoading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages || isLoading}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </section>
      </div>
    </TrustShell>
  );
}
