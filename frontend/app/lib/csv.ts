import type { BulkDevoteeRow } from "./api";

/**
 * Minimal RFC-4180 parser. Written by hand rather than pulled from a library
 * because the only input is a small devotee sheet, but it does handle quoted
 * fields — Indian addresses are full of commas ("Ward 4, Gulawad"), and a
 * naive `split(",")` shifts every column after them.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Normalise line endings so a Windows-saved sheet doesn't leave \r in fields.
  const input = text.replace(/\r\n?/g, "\n");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside a quoted field is an escaped quote.
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Flush the trailing field/row when the file doesn't end in a newline.
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim()));
}

/** Column aliases, so an admin's sheet doesn't have to match ours exactly. */
const COLUMN_ALIASES: Record<string, keyof BulkDevoteeRow> = {
  name: "name",
  fullname: "name",
  devotee: "name",
  devoteename: "name",
  email: "email",
  emailid: "email",
  mobile: "mobile",
  phone: "mobile",
  mobileno: "mobile",
  mobilenumber: "mobile",
  village: "village",
  gaon: "village",
  city: "city",
  tehsil: "tehsil",
  taluka: "tehsil",
  district: "district",
  state: "state",
};

function normaliseHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z]/g, "");
}

export type CsvRowResult = {
  /** 1-based row number as it appears in the sheet, for error messages. */
  lineNumber: number;
  row: BulkDevoteeRow;
  error: string | null;
};

export type CsvParseResult = {
  results: CsvRowResult[];
  /** Headers we didn't recognise — surfaced so typos aren't silently dropped. */
  unknownColumns: string[];
  headerError: string | null;
};

/**
 * Turn raw CSV text into validated rows. Every row is returned, valid or not,
 * so the UI can show a preview with per-row errors instead of failing the
 * whole file on the first bad cell.
 */
export function parseDevoteeCsv(text: string): CsvParseResult {
  const rows = parseCsv(text);

  if (!rows.length) {
    return { results: [], unknownColumns: [], headerError: "The file is empty." };
  }

  const [headerRow, ...dataRows] = rows;
  const unknownColumns: string[] = [];
  const columns = headerRow.map((header) => {
    const key = COLUMN_ALIASES[normaliseHeader(header)];
    if (!key && header.trim()) unknownColumns.push(header.trim());
    return key ?? null;
  });

  if (!columns.includes("name")) {
    return {
      results: [],
      unknownColumns,
      headerError: "The file must have a 'name' column.",
    };
  }

  const seenEmails = new Set<string>();

  const results = dataRows.map((cells, index) => {
    const row: BulkDevoteeRow = { name: "" };

    columns.forEach((key, columnIndex) => {
      if (!key) return;
      const value = (cells[columnIndex] ?? "").trim();
      if (value) row[key] = value;
    });

    let error: string | null = null;
    const email = row.email?.toLowerCase() ?? "";

    if (!row.name || row.name.length < 2) {
      error = "Name is missing or too short";
    } else if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      error = "Email looks invalid";
    } else if (email && seenEmails.has(email)) {
      error = "This email appears earlier in the file";
    }

    if (!error && email) seenEmails.add(email);

    // +2: one for the header row, one to make it 1-based like a spreadsheet.
    return { lineNumber: index + 2, row, error };
  });

  return { results, unknownColumns, headerError: null };
}

export const CSV_TEMPLATE =
  "name,email,mobile,village,city,tehsil,district,state\n" +
  "Ram Prasad,ram@example.com,9876543210,Gulawad,,Badnawar,Dhar,Madhya Pradesh\n";
