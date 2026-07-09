import { describe, expect, it } from "vitest";

import { GetCustomerReportService } from "@/modules/reporting/application/services/get-customer-report.service";
import { GetInventoryReportService } from "@/modules/reporting/application/services/get-inventory-report.service";
import { GetRentalReportService } from "@/modules/reporting/application/services/get-rental-report.service";

import { buildRentalOrder, buildStandardReportingDataset } from "./helpers/reporting.fixtures";
import { InMemoryReportingRepository } from "./helpers/in-memory-reporting.repository";

function seedManyRentals() {
  const repository = new InMemoryReportingRepository();
  const dataset = buildStandardReportingDataset();
  const extraRentals = Array.from({ length: 5 }, (_, index) =>
    buildRentalOrder({
      id: `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb${10 + index}`,
      orderNumber: `RO-P${index + 1}`,
      bookingDate: new Date(`2026-03-${10 + index}T00:00:00.000Z`),
      eventStartDate: new Date(`2026-03-${10 + index}T00:00:00.000Z`),
      eventEndDate: new Date(`2026-03-${11 + index}T00:00:00.000Z`),
      status: "CONFIRMED",
      grandTotal: 100 + index,
    }),
  );
  repository.seed({
    ...dataset,
    rentals: [...dataset.rentals, ...extraRentals],
  });
  return repository;
}

describe("reporting pagination tests", () => {
  it("returns first page of rental report", async () => {
    const service = new GetRentalReportService(seedManyRentals());
    const result = await service.execute({
      page: 1,
      pageSize: 2,
      sortBy: "bookingDate",
      sortOrder: "asc",
    });

    expect(result.lines).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.total).toBe(9);
    expect(result.totalPages).toBe(5);
  });

  it("returns middle page of rental report", async () => {
    const service = new GetRentalReportService(seedManyRentals());
    const result = await service.execute({
      page: 2,
      pageSize: 2,
      sortBy: "bookingDate",
      sortOrder: "asc",
    });

    expect(result.lines).toHaveLength(2);
  });

  it("returns final partial page", async () => {
    const service = new GetRentalReportService(seedManyRentals());
    const result = await service.execute({
      page: 5,
      pageSize: 2,
      sortBy: "bookingDate",
      sortOrder: "asc",
    });

    expect(result.lines).toHaveLength(1);
  });

  it("returns empty page beyond range", async () => {
    const service = new GetRentalReportService(seedManyRentals());
    const result = await service.execute({
      page: 20,
      pageSize: 2,
    });
    expect(result.lines).toHaveLength(0);
    expect(result.total).toBe(9);
  });

  it("paginates inventory report", async () => {
    const repository = new InMemoryReportingRepository();
    repository.seed(buildStandardReportingDataset());
    const service = new GetInventoryReportService(repository);
    const page1 = await service.execute({ page: 1, pageSize: 2 });
    const page2 = await service.execute({ page: 2, pageSize: 2 });

    expect(page1.lines).toHaveLength(2);
    expect(page2.lines).toHaveLength(1);
    expect(page1.totalPages).toBe(2);
  });

  it("coerces string pagination params", async () => {
    const service = new GetRentalReportService(seedManyRentals());
    const result = await service.execute({
      page: "2",
      pageSize: "3",
    });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(3);
  });

  it("paginates customer report", async () => {
    const repository = new InMemoryReportingRepository();
    repository.seed(buildStandardReportingDataset());
    const service = new GetCustomerReportService(repository);
    const result = await service.execute({ page: 1, pageSize: 1 });
    expect(result.lines).toHaveLength(1);
    expect(result.total).toBe(2);
  });

  it("uses default page size when omitted", async () => {
    const service = new GetRentalReportService(seedManyRentals());
    const result = await service.execute({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});
