import { downloadText } from "./download";

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export type CsvColumnDef<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

export function toCsv<T>(rows: T[], columns: Array<CsvColumnDef<T>>): string {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.value(row))).join(","),
  );

  return [header, ...body].join("\r\n");
}

export function downloadCsv<T>(
  rows: T[],
  columns: Array<CsvColumnDef<T>>,
  filename: string,
): void {
  const csv = toCsv(rows, columns);
  const withBom = `\uFEFF${csv}`;
  downloadText(withBom, filename.endsWith(".csv") ? filename : `${filename}.csv`, "text/csv;charset=utf-8");
}
