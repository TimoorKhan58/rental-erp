import { describe, expect, it } from "vitest";

import { GetRentalInvoiceSummaryService } from "@/modules/rental-invoice/application/services/get-rental-invoice-summary.service";
import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import {
  computeRentalInvoiceSummaryResult,
  filterRentalInvoicesForSummary,
} from "@/modules/rental-invoice/domain/rental-invoice-summary.rules";
import {
  buildIssuedRentalInvoiceEntity,
  buildPartiallyPaidRentalInvoiceEntity,
  buildPaidRentalInvoiceEntity,
  buildRentalInvoiceEntity,
  buildVoidRentalInvoiceEntity,
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
} from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import {
  createSeededRentalInvoiceRepository,
  InMemoryRentalInvoiceRepository,
} from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import type { RentalInvoiceId } from "@/shared/domain/ids";

function buildManyDraftInvoices(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildRentalInvoiceEntity({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}` as RentalInvoiceId,
      status: "DRAFT",
    }),
  );
}

describe("N-39-UI-01 rental invoice summary stats completeness", () => {
  it("returns correct summary for exactly 100 invoices", async () => {
    const repository = createSeededRentalInvoiceRepository(buildManyDraftInvoices(100));
    const service = new GetRentalInvoiceSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalInvoices).toBe(100);
    expect(summary.statusCounts.all).toBe(100);
    expect(summary.statusCounts.DRAFT).toBe(100);
    expect(summary.paymentStatusCounts.unpaid).toBe(100);
  });

  it("returns correct summary for 101 invoices (pagination boundary)", async () => {
    const repository = createSeededRentalInvoiceRepository(buildManyDraftInvoices(101));
    const service = new GetRentalInvoiceSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalInvoices).toBe(101);
    expect(summary.statusCounts.all).toBe(101);
    expect(summary.statusCounts.DRAFT).toBe(101);
  });

  it("returns correct summary for 150 invoices", async () => {
    const repository = createSeededRentalInvoiceRepository(buildManyDraftInvoices(150));
    const service = new GetRentalInvoiceSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalInvoices).toBe(150);
    expect(summary.statusCounts.DRAFT).toBe(150);
  });

  it("counts each status and payment category across the full dataset", async () => {
    const invoices = [
      buildRentalInvoiceEntity({
        id: "00000000-0000-4000-8000-000000000020" as RentalInvoiceId,
        status: "DRAFT",
      }),
      RentalInvoice.reconstitute({
        ...buildIssuedRentalInvoiceEntity().toProps(),
        id: "00000000-0000-4000-8000-000000000021" as RentalInvoiceId,
      }),
      RentalInvoice.reconstitute({
        ...buildPartiallyPaidRentalInvoiceEntity(100).toProps(),
        id: "00000000-0000-4000-8000-000000000022" as RentalInvoiceId,
      }),
      RentalInvoice.reconstitute({
        ...buildPaidRentalInvoiceEntity().toProps(),
        id: "00000000-0000-4000-8000-000000000023" as RentalInvoiceId,
      }),
      RentalInvoice.reconstitute({
        ...buildVoidRentalInvoiceEntity().toProps(),
        id: "00000000-0000-4000-8000-000000000024" as RentalInvoiceId,
      }),
    ];
    const repository = createSeededRentalInvoiceRepository(invoices);
    const service = new GetRentalInvoiceSummaryService(repository);

    const summary = await service.execute({});
    const expected = computeRentalInvoiceSummaryResult(invoices);

    expect(summary).toEqual(expected);
    expect(summary.stats.activeInvoices).toBe(4);
    expect(summary.statusCounts.VOID).toBe(1);
    expect(summary.paymentStatusCounts.void).toBe(1);
  });

  it("applies the same customer filter as the invoice listing", async () => {
    const matching = buildRentalInvoiceEntity({
      id: "00000000-0000-4000-8000-000000000001" as RentalInvoiceId,
      customerId: CUSTOMER_ID,
      status: "DRAFT",
    });
    const other = buildRentalInvoiceEntity({
      id: "00000000-0000-4000-8000-000000000002" as RentalInvoiceId,
      customerId: OTHER_CUSTOMER_ID,
      status: "DRAFT",
    });
    const repository = createSeededRentalInvoiceRepository([matching, other]);
    const service = new GetRentalInvoiceSummaryService(repository);

    const summary = await service.execute({ customerId: CUSTOMER_ID });

    expect(summary.stats.totalInvoices).toBe(1);
    expect(summary.statusCounts.all).toBe(1);
  });

  it("applies search filters to summary counts", async () => {
    const alpha = buildRentalInvoiceEntity({
      id: "00000000-0000-4000-8000-000000000010" as RentalInvoiceId,
      notes: "alpha batch",
    });
    const beta = buildRentalInvoiceEntity({
      id: "00000000-0000-4000-8000-000000000011" as RentalInvoiceId,
      notes: "beta batch",
    });
    const repository = createSeededRentalInvoiceRepository([alpha, beta]);
    const service = new GetRentalInvoiceSummaryService(repository);

    const summary = await service.execute({ search: "alpha" });

    expect(summary.stats.totalInvoices).toBe(1);
  });

  it("matches list filter semantics via shared summary query rules", () => {
    const repository = new InMemoryRentalInvoiceRepository();
    const invoices = buildManyDraftInvoices(120);
    repository.seed(invoices);

    const filtered = filterRentalInvoicesForSummary(invoices, {
      status: "DRAFT",
    });
    const expected = computeRentalInvoiceSummaryResult(filtered);

    expect(expected.stats.totalInvoices).toBe(120);
  });
});
