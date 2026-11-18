import { strToU8, zipSync } from "fflate";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { NotFoundError } from "@/shared/infrastructure/errors";
import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";
import { runTenantTransaction } from "@/shared/infrastructure/tenancy/rls-session";
import { TENANT_MODELS } from "@/shared/infrastructure/tenancy/tenant-model-map";
import { businessDateString } from "@/shared/infrastructure/time";

/**
 * A full export of one business's data (SaaS phase 4b): one CSV file per
 * record type plus a manifest, in a single zip.
 *
 * It reads inside the business's own scope (tenant guard + row-level
 * security), so it can only ever contain that business's rows. Logins,
 * passwords and sessions are platform tables and are never included.
 */

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
type FindManyDelegate = { findMany: (args?: object) => Promise<Array<Record<string, unknown>>> };

export type BusinessExport = {
  readonly fileName: string;
  readonly data: Uint8Array;
  readonly recordCounts: Readonly<Record<string, number>>;
  readonly totalRecords: number;
};

/** One CSV cell (RFC 4180 quoting). */
export function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (value instanceof Date) text = value.toISOString();
  else if (value instanceof Prisma.Decimal) text = value.toString();
  else if (typeof value === "bigint") text = value.toString();
  else if (value instanceof Uint8Array) text = Buffer.from(value).toString("base64");
  else if (typeof value === "object") text = JSON.stringify(value);
  else text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(columns: readonly string[], rows: ReadonlyArray<Record<string, unknown>>): string {
  const lines = [columns.map(toCsvCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => toCsvCell(row[column])).join(","));
  }
  // A byte-order mark lets Excel open the file as UTF-8 (Urdu names etc.).
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** The model's column names, in schema order. */
function columnsOf(model: string): string[] {
  const fieldEnum = (Prisma as unknown as Record<string, Record<string, string> | undefined>)[
    `${model}ScalarFieldEnum`
  ];
  if (fieldEnum === undefined) {
    throw new Error(`No field list for ${model}`);
  }
  return Object.values(fieldEnum);
}

function delegateOf(tx: Tx, model: string): FindManyDelegate {
  const name = `${model.charAt(0).toLowerCase()}${model.slice(1)}`;
  return (tx as unknown as Record<string, FindManyDelegate>)[name]!;
}

export async function buildBusinessExport(
  prisma: PrismaClient,
  organizationId: string,
  now: Date = new Date(),
): Promise<BusinessExport> {
  return runInOrganization(organizationId, () =>
    runTenantTransaction(
      prisma,
      async (tx: Tx) => {
        const organization = await tx.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, slug: true },
        });
        if (organization === null) {
          throw new NotFoundError({ message: "Business not found." });
        }

        const settings = await tx.companySetting.findFirst({
          where: { isActive: true },
          select: { timezone: true },
        });

        const files: Record<string, Uint8Array> = {};
        const recordCounts: Record<string, number> = {};

        for (const model of [...TENANT_MODELS].sort()) {
          const rows = await delegateOf(tx, model).findMany();
          files[`data/${model}.csv`] = strToU8(toCsv(columnsOf(model), rows));
          recordCounts[model] = rows.length;
        }

        const totalRecords = Object.values(recordCounts).reduce((sum, count) => sum + count, 0);
        const manifest = {
          business: { name: organization.name, shortName: organization.slug },
          exportedAt: now.toISOString(),
          format: "One CSV file per record type in data/ (UTF-8 with BOM, comma separated, ISO dates).",
          note: "Logins, passwords and sessions are not included.",
          totalRecords,
          recordCounts,
        };
        files["manifest.json"] = strToU8(`${JSON.stringify(manifest, null, 2)}\n`);
        files["README.txt"] = strToU8(
          [
            `RentCore data export for ${organization.name}`,
            `Exported: ${now.toISOString()}`,
            "",
            "data/ holds one CSV file per kind of record (customers, orders, invoices, ...).",
            "Open them with Excel or Google Sheets. manifest.json lists how many records each file has.",
            "Logins, passwords and sessions are not included.",
            "",
          ].join("\r\n"),
        );

        const day = businessDateString(settings?.timezone ?? "UTC", now);
        return {
          fileName: `rentcore-${organization.slug}-${day}.zip`,
          data: zipSync(files, { level: 6, mtime: now }),
          recordCounts,
          totalRecords,
        };
      },
      // One consistent snapshot, and enough time for a large business.
      { isolationLevel: "RepeatableRead", timeout: 120_000, maxWait: 10_000 },
    ),
  );
}
