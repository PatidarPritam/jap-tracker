"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  apiRequest,
  asPage,
  formatCount,
  formatDate,
  formatPercent,
  Paginated,
  SankalpStatus,
  SankalpSummary,
} from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  Input,
  ProgressBar,
  Select,
  Skeleton,
  useToast,
} from "./ui";
import { useT } from "./LanguageProvider";
import type { TranslationKey } from "../lib/i18n";

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: string; labelKey: TranslationKey }[] = [
  { value: "ALL", labelKey: "admin.statusAll" },
  { value: "ACTIVE", labelKey: "admin.statusActive" },
  { value: "COMPLETED", labelKey: "admin.statusCompleted" },
  { value: "CANCELLED", labelKey: "admin.statusCancelled" },
  { value: "SUPERSEDED", labelKey: "admin.statusSuperseded" },
];

const STATUS_LABEL: Record<SankalpStatus, TranslationKey> = {
  ACTIVE: "admin.statusActive",
  COMPLETED: "admin.statusCompleted",
  CANCELLED: "admin.statusCancelled",
  SUPERSEDED: "admin.statusSuperseded",
};

/** Date inputs need `yyyy-mm-dd`; the API sends full ISO timestamps. */
function toDateInput(value: string) {
  return value.slice(0, 10);
}

/**
 * The full sankalp history with inline edit and cancel. Previously only the
 * current ACTIVE sankalp per devotee was visible anywhere, and a mistyped
 * target could not be corrected at all.
 */
export function SankalpList({ onChanged }: { onChanged?: () => void }) {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState<SankalpSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status !== "ALL") params.set("status", status);
      const term = debouncedSearch.trim();
      if (term) params.set("search", term);

      const data = await apiRequest<Paginated<SankalpSummary>>(
        `/api/sankalps?${params.toString()}`,
        undefined,
        "admin"
      );
      const pageData = asPage(data);
      setItems(pageData.items);
      setTotal(pageData.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [page, status, debouncedSearch, toast, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function saveSankalp(event: FormEvent<HTMLFormElement>, sankalp: SankalpSummary) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setIsSaving(true);
      await apiRequest(
        `/api/sankalps/${sankalp.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: String(form.get("title") ?? "").trim(),
            targetCount: Number(form.get("targetCount") ?? 0),
            startDate: String(form.get("startDate") ?? ""),
            endDate: String(form.get("endDate") ?? ""),
          }),
        },
        "admin"
      );
      setEditingId(null);
      toast.success(t("admin.sankalpUpdated"));
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.updateFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelSankalp(sankalp: SankalpSummary) {
    // Cancelling hides an active sankalp from the devotee's dashboard, so it
    // gets a confirm even though the jap entries themselves are kept.
    if (!window.confirm(t("admin.cancelSankalpConfirm"))) return;

    try {
      await apiRequest(
        `/api/sankalps/${sankalp.id}`,
        { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) },
        "admin"
      );
      toast.success(t("admin.sankalpCancelled"));
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.updateFailed"));
    }
  }

  return (
    <Card>
      <CardHeader title={t("admin.allSankalps")} subtitle={t("admin.sankalpHistorySub")} />

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_12rem]">
        {/* Both filters reset to page 1 — otherwise a narrower filter can land
            the admin on a page that no longer exists, showing an empty list. */}
        <Input
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder={t("admin.searchSankalp")}
          aria-label={t("admin.searchSankalp")}
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label={t("admin.statusAll")}
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {t(filter.labelKey)}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-5 grid gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)
        ) : items.length ? (
          items.map((sankalp) =>
            editingId === sankalp.id ? (
              <form
                key={sankalp.id}
                onSubmit={(event) => void saveSankalp(event, sankalp)}
                className="grid gap-4 rounded-lg border border-saffron-200 bg-saffron-50/40 p-4"
              >
                <p className="font-semibold">{sankalp.devoteeName}</p>
                <Field label={t("admin.sankalpTitle")} required>
                  <Input name="title" defaultValue={sankalp.title} disabled={isSaving} required />
                </Field>
                <Field label={t("admin.targetCount")} required>
                  <Input
                    name="targetCount"
                    type="number"
                    min="1"
                    defaultValue={sankalp.targetCount}
                    disabled={isSaving}
                    required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("admin.startDate")} required>
                    <Input
                      name="startDate"
                      type="date"
                      defaultValue={toDateInput(sankalp.startDate)}
                      disabled={isSaving}
                      required
                    />
                  </Field>
                  <Field label={t("admin.endDate")} required>
                    <Input
                      name="endDate"
                      type="date"
                      defaultValue={toDateInput(sankalp.endDate)}
                      disabled={isSaving}
                      required
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" isLoading={isSaving}>
                    {isSaving ? t("admin.saving") : t("admin.save")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isSaving}
                    onClick={() => setEditingId(null)}
                  >
                    {t("admin.cancel")}
                  </Button>
                </div>
              </form>
            ) : (
              <div key={sankalp.id} className="rounded-lg border border-line-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/devotees/${sankalp.devoteeId}`}
                      className="truncate font-semibold hover:text-saffron-700"
                    >
                      {sankalp.devoteeName}
                    </Link>
                    <p className="truncate text-sm text-muted">{sankalp.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <Icon name="calendar" className="h-4 w-4" />
                      {formatDate(sankalp.startDate)} – {formatDate(sankalp.endDate)}
                    </p>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-2">
                    {sankalp.isCompleted ? (
                      <Badge tone="success">{t("admin.statusCompleted")}</Badge>
                    ) : sankalp.status === "ACTIVE" ? (
                      <Badge tone="gold">{t("admin.statusActive")}</Badge>
                    ) : (
                      <Badge tone="neutral">{t(STATUS_LABEL[sankalp.status])}</Badge>
                    )}
                    <span className="text-sm font-semibold text-saffron-800">
                      {formatPercent(sankalp.progressPercent)}%
                    </span>
                  </div>
                </div>

                <ProgressBar
                  className="mt-3"
                  value={sankalp.progressPercent}
                  tone={sankalp.isCompleted ? "success" : "saffron"}
                  label={`${sankalp.devoteeName} sankalp progress`}
                />
                <p className="mt-2 text-sm text-muted">
                  {formatCount(sankalp.completedCount)} / {formatCount(sankalp.targetCount)} jap
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(sankalp.id)}>
                    {t("admin.editSankalp")}
                  </Button>
                  {sankalp.status === "ACTIVE" && (
                    <Button size="sm" variant="secondary" onClick={() => void cancelSankalp(sankalp)}>
                      {t("admin.cancelSankalp")}
                    </Button>
                  )}
                </div>
              </div>
            )
          )
        ) : (
          <EmptyState
            icon={<Icon name="target" className="h-6 w-6" />}
            title={t("admin.noSankalpsFound")}
            description={t("admin.sankalpHistorySub")}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            ←
          </Button>
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            →
          </Button>
        </div>
      )}
    </Card>
  );
}
