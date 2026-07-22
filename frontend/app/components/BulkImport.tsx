"use client";

import { ChangeEvent, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { CSV_TEMPLATE, parseDevoteeCsv, type CsvRowResult } from "../lib/csv";
import { Button, Card, CardHeader, Icon, useToast } from "./ui";
import { useT } from "./LanguageProvider";

/**
 * CSV-backed bulk registration. The file is parsed and validated in the
 * browser first and shown as a preview, so an admin fixes a bad sheet before
 * anything reaches the server — the import itself is all-or-nothing.
 */
export function BulkImport({ onImported }: { onImported?: () => void }) {
  const t = useT();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<CsvRowResult[]>([]);
  const [unknownColumns, setUnknownColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const errorCount = results.filter((entry) => entry.error).length;
  const validCount = results.length - errorCount;

  function reset() {
    setResults([]);
    setUnknownColumns([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseDevoteeCsv(text);

    if (parsed.headerError) {
      toast.error(parsed.headerError);
      reset();
      return;
    }

    setFileName(file.name);
    setResults(parsed.results);
    setUnknownColumns(parsed.unknownColumns);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "devotees-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function runImport() {
    if (errorCount) {
      toast.error(t("admin.fixErrorsFirst"));
      return;
    }

    try {
      setIsImporting(true);
      const response = await apiRequest<{ imported: number }>(
        "/api/devotees/bulk",
        { method: "POST", body: JSON.stringify({ rows: results.map((entry) => entry.row) }) },
        "admin"
      );
      toast.success(t("admin.importDone", { count: response.imported }));
      reset();
      onImported?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.importFailed"));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader title={t("admin.bulkImport")} subtitle={t("admin.bulkImportSub")} />

      <div className="mt-5 flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void handleFile(event)}
          className="hidden"
          id="bulk-import-file"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
        >
          <Icon name="plus" className="h-4 w-4" />
          {t("admin.chooseFile")}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={downloadTemplate}>
          <Icon name="arrowRight" className="h-4 w-4" />
          {t("admin.downloadTemplate")}
        </Button>
      </div>

      {fileName && (
        <p className="mt-3 truncate text-sm font-medium text-muted">{fileName}</p>
      )}

      {unknownColumns.length > 0 && (
        <p className="mt-3 rounded-md border border-line bg-surface-muted p-3 text-sm text-muted">
          {t("admin.unknownColumns", { columns: unknownColumns.join(", ") })}
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <span className="text-success">{t("admin.rowsReady", { count: validCount })}</span>
            {errorCount > 0 && (
              <span className="text-danger">{t("admin.rowsWithErrors", { count: errorCount })}</span>
            )}
          </div>

          <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-muted">
                <tr>
                  <th className="p-2 font-semibold">#</th>
                  <th className="p-2 font-semibold">{t("admin.fullName")}</th>
                  <th className="p-2 font-semibold">{t("admin.email")}</th>
                  <th className="p-2 font-semibold">{t("admin.mobile")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((entry) => (
                  <tr
                    key={entry.lineNumber}
                    className={entry.error ? "bg-danger-soft" : "border-t border-line-soft"}
                  >
                    <td className="p-2 text-muted">{entry.lineNumber}</td>
                    <td className="p-2">
                      {entry.row.name || "—"}
                      {entry.error && (
                        <span className="block text-xs font-medium text-danger">{entry.error}</span>
                      )}
                    </td>
                    <td className="p-2 break-all">{entry.row.email || "—"}</td>
                    <td className="p-2">{entry.row.mobile || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void runImport()}
              isLoading={isImporting}
              disabled={isImporting || errorCount > 0}
            >
              {isImporting ? t("admin.importing") : t("admin.importRows", { count: validCount })}
            </Button>
            <Button type="button" variant="secondary" onClick={reset} disabled={isImporting}>
              {t("admin.cancel")}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
