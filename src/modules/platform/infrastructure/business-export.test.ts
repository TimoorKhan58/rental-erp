import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";

import { toCsv, toCsvCell } from "./business-export";

describe("business export CSV (SaaS phase 4b)", () => {
  it("writes values the way spreadsheets expect", () => {
    expect(toCsvCell(null)).toBe("");
    expect(toCsvCell(undefined)).toBe("");
    expect(toCsvCell(true)).toBe("true");
    expect(toCsvCell(12.5)).toBe("12.5");
    expect(toCsvCell(new Date("2026-11-18T00:00:00Z"))).toBe("2026-11-18T00:00:00.000Z");
    expect(toCsvCell(new Prisma.Decimal("1500.00"))).toBe("1500");
    expect(toCsvCell({ a: 1 })).toBe('"{""a"":1}"');
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(toCsvCell("Khan, Imran")).toBe('"Khan, Imran"');
    expect(toCsvCell('6" pole')).toBe('"6"" pole"');
    expect(toCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("starts with a byte-order mark and a header row, and keeps Urdu text", () => {
    const csv = toCsv(["name", "city"], [{ name: "محمد", city: "Lahore" }]);
    expect(csv.startsWith("﻿name,city\r\n")).toBe(true);
    expect(csv).toContain("محمد,Lahore\r\n");
  });
});
