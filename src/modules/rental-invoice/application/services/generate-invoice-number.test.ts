import { describe, expect, it } from "vitest";

import {
  buildInvoiceNumberYearPrefix,
  generateNextInvoiceNumber,
} from "@/modules/rental-invoice/application/services/generate-invoice-number";
import { InMemoryNumberSequenceRepository } from "@/modules/settings/tests/helpers/in-memory-number-sequence.repository";

describe("generateNextInvoiceNumber", () => {
  it("allocates the first invoice of a year as INV-YYYY-001", async () => {
    const numberSequences = new InMemoryNumberSequenceRepository();

    const invoiceNumber = await generateNextInvoiceNumber(
      numberSequences,
      new Date("2026-03-15T00:00:00.000Z"),
    );

    expect(invoiceNumber).toBe("INV-2026-001");
  });

  it("allocates sequential invoice numbers", async () => {
    const numberSequences = new InMemoryNumberSequenceRepository();
    const referenceDate = new Date("2026-03-15T00:00:00.000Z");

    const first = await generateNextInvoiceNumber(numberSequences, referenceDate);
    const second = await generateNextInvoiceNumber(numberSequences, referenceDate);
    const third = await generateNextInvoiceNumber(numberSequences, referenceDate);

    expect(first).toBe("INV-2026-001");
    expect(second).toBe("INV-2026-002");
    expect(third).toBe("INV-2026-003");
  });

  it("continues past 999 without collisions or format breakage", async () => {
    const numberSequences = new InMemoryNumberSequenceRepository();
    const referenceDate = new Date("2026-06-01T00:00:00.000Z");

    // Advance to the historical failure boundary (999 issued).
    for (let index = 0; index < 999; index += 1) {
      await generateNextInvoiceNumber(numberSequences, referenceDate);
    }

    const thousandth = await generateNextInvoiceNumber(
      numberSequences,
      referenceDate,
    );
    const next = await generateNextInvoiceNumber(numberSequences, referenceDate);

    expect(thousandth).toBe("INV-2026-1000");
    expect(next).toBe("INV-2026-1001");
  });

  it("resets the sequence on year rollover", async () => {
    const numberSequences = new InMemoryNumberSequenceRepository();

    const lastOf2026 = await generateNextInvoiceNumber(
      numberSequences,
      new Date("2026-12-31T12:00:00.000Z"),
    );
    const secondOf2026 = await generateNextInvoiceNumber(
      numberSequences,
      new Date("2026-12-31T13:00:00.000Z"),
    );
    const firstOf2027 = await generateNextInvoiceNumber(
      numberSequences,
      new Date("2027-01-01T00:00:00.000Z"),
    );

    expect(lastOf2026).toBe("INV-2026-001");
    expect(secondOf2026).toBe("INV-2026-002");
    expect(firstOf2027).toBe("INV-2027-001");
  });

  it("serializes concurrent allocations without duplicates", async () => {
    const numberSequences = new InMemoryNumberSequenceRepository();
    const referenceDate = new Date("2026-08-01T00:00:00.000Z");

    const results = await Promise.all(
      Array.from({ length: 25 }, () =>
        generateNextInvoiceNumber(numberSequences, referenceDate),
      ),
    );

    const unique = new Set(results);
    expect(unique.size).toBe(25);
    expect(results).toContain("INV-2026-001");
    expect(results).toContain("INV-2026-025");
  });

  it("builds the year prefix used by historical invoice format", () => {
    expect(buildInvoiceNumberYearPrefix(2026)).toBe("INV-2026-");
  });
});
