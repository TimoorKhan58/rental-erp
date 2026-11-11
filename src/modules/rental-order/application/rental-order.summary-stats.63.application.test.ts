import { describe, expect, it } from "vitest";

import { GetRentalOrderSummaryService } from "@/modules/rental-order/application/services/get-rental-order-summary.service";
import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import {
  computeRentalOrderSummaryResult,
  filterRentalOrdersForSummary,
} from "@/modules/rental-order/domain/rental-order-summary.rules";
import {
  buildRentalOrderEntity,
  CUSTOMER_ID,
  WAREHOUSE_ID,
} from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import {
  createSeededRentalOrderRepository,
  InMemoryRentalOrderRepository,
} from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type { CustomerId, RentalOrderId, WarehouseId } from "@/shared/domain/ids";

const OTHER_CUSTOMER_ID =
  "550e8400-e29b-41d4-a716-446655440001" as CustomerId;

const OTHER_WAREHOUSE_ID =
  "880e8400-e29b-41d4-a716-446655440021" as WarehouseId;

function buildManyDraftOrders(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildRentalOrderEntity({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}` as RentalOrderId,
      status: "DRAFT",
    }),
  );
}

describe("N-39-PATTERN-01 rental order summary stats completeness", () => {
  it("returns correct summary for exactly 100 orders", async () => {
    const repository = createSeededRentalOrderRepository(buildManyDraftOrders(100));
    const service = new GetRentalOrderSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalOrders).toBe(100);
    expect(summary.statusCounts.all).toBe(100);
    expect(summary.statusCounts.DRAFT).toBe(100);
    expect(summary.stats.pendingActionCount).toBe(100);
  });

  it("returns correct summary for 101 orders (pagination boundary)", async () => {
    const repository = createSeededRentalOrderRepository(buildManyDraftOrders(101));
    const service = new GetRentalOrderSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalOrders).toBe(101);
    expect(summary.statusCounts.all).toBe(101);
    expect(summary.statusCounts.DRAFT).toBe(101);
  });

  it("returns correct summary for 150 orders", async () => {
    const repository = createSeededRentalOrderRepository(buildManyDraftOrders(150));
    const service = new GetRentalOrderSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalOrders).toBe(150);
    expect(summary.statusCounts.DRAFT).toBe(150);
  });

  it("counts each status, revenue, and reservation category across the full dataset", async () => {
    const orders = [
      buildRentalOrderEntity({
        id: "00000000-0000-4000-8000-000000000020" as RentalOrderId,
        status: "DRAFT",
      }),
      buildRentalOrderEntity({
        id: "00000000-0000-4000-8000-000000000021" as RentalOrderId,
        status: "CONFIRMED",
      }),
      buildRentalOrderEntity({
        id: "00000000-0000-4000-8000-000000000022" as RentalOrderId,
        status: "RESERVED",
        reservedQuantity: 10,
      }),
      buildRentalOrderEntity({
        id: "00000000-0000-4000-8000-000000000023" as RentalOrderId,
        status: "CANCELLED",
      }),
      RentalOrder.reconstitute({
        ...buildRentalOrderEntity({
          id: "00000000-0000-4000-8000-000000000024" as RentalOrderId,
          status: "CONFIRMED",
          reservedQuantity: 4,
        }).toProps(),
      }),
    ];
    const repository = createSeededRentalOrderRepository(orders);
    const service = new GetRentalOrderSummaryService(repository);

    const summary = await service.execute({});
    const expected = computeRentalOrderSummaryResult(orders);

    expect(summary).toEqual(expected);
    expect(summary.stats.activeOrders).toBe(4);
    expect(summary.statusCounts.CANCELLED).toBe(1);
    expect(summary.reservationStatusCounts.complete).toBe(1);
    expect(summary.reservationStatusCounts.partial).toBe(1);
    expect(summary.stats.totalRevenue).toBeGreaterThan(0);
  });

  it("applies the same customer filter as the rental order listing", async () => {
    const matching = buildRentalOrderEntity({
      id: "00000000-0000-4000-8000-000000000001" as RentalOrderId,
      status: "DRAFT",
    });
    const other = RentalOrder.reconstitute({
      ...buildRentalOrderEntity({
        id: "00000000-0000-4000-8000-000000000002" as RentalOrderId,
        status: "DRAFT",
      }).toProps(),
      customerId: OTHER_CUSTOMER_ID,
    });
    const repository = createSeededRentalOrderRepository([matching, other]);
    const service = new GetRentalOrderSummaryService(repository);

    const summary = await service.execute({ customerId: CUSTOMER_ID });

    expect(summary.stats.totalOrders).toBe(1);
    expect(summary.statusCounts.all).toBe(1);
  });

  it("applies warehouse and search filters to summary counts", async () => {
    const alpha = RentalOrder.reconstitute({
      ...buildRentalOrderEntity({
        id: "00000000-0000-4000-8000-000000000010" as RentalOrderId,
      }).toProps(),
      remarks: "alpha batch",
      warehouseId: WAREHOUSE_ID,
    });
    const beta = RentalOrder.reconstitute({
      ...buildRentalOrderEntity({
        id: "00000000-0000-4000-8000-000000000011" as RentalOrderId,
      }).toProps(),
      remarks: "beta batch",
      warehouseId: OTHER_WAREHOUSE_ID,
    });
    const repository = createSeededRentalOrderRepository([alpha, beta]);
    const service = new GetRentalOrderSummaryService(repository);

    const searchSummary = await service.execute({ search: "alpha" });
    const warehouseSummary = await service.execute({ warehouseId: WAREHOUSE_ID });

    expect(searchSummary.stats.totalOrders).toBe(1);
    expect(warehouseSummary.stats.totalOrders).toBe(1);
  });

  it("matches list filter semantics via shared summary query rules", () => {
    const repository = new InMemoryRentalOrderRepository();
    const orders = buildManyDraftOrders(120);
    repository.seed(orders);

    const filtered = filterRentalOrdersForSummary(orders, {
      status: "DRAFT",
    });
    const expected = computeRentalOrderSummaryResult(filtered);

    expect(expected.stats.totalOrders).toBe(120);
  });
});
