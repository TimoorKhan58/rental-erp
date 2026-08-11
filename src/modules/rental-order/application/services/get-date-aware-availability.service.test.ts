import { describe, expect, it, vi } from "vitest";

import { GetDateAwareAvailabilityService } from "@/modules/rental-order/application/services/get-date-aware-availability.service";
import type { AvailabilityCommitmentLineProjection } from "@/modules/rental-order/domain/rental-order.availability.projection";
import type { RentalOrderStatus } from "@/modules/rental-order/domain/rental-order.constants";
import {
  OTHER_PRODUCT_ID,
  PRODUCT_ID,
  WAREHOUSE_ID,
} from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { OTHER_WAREHOUSE_ID } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { ProductId, WarehouseId } from "@/shared/domain/ids";

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function projection(
  override: Partial<AvailabilityCommitmentLineProjection> & {
    reservedQuantity: number;
    status?: RentalOrderStatus;
  },
): AvailabilityCommitmentLineProjection {
  return {
    rentalOrderItemId: override.rentalOrderItemId ?? crypto.randomUUID(),
    rentalOrderId: override.rentalOrderId ?? crypto.randomUUID(),
    productId: (override.productId ?? PRODUCT_ID) as ProductId,
    warehouseId: (override.warehouseId ?? WAREHOUSE_ID) as WarehouseId,
    status: override.status ?? "RESERVED",
    reservedQuantity: override.reservedQuantity,
    eventStartDate: override.eventStartDate ?? d(2026, 1, 12),
    eventEndDate: override.eventEndDate ?? d(2026, 1, 18),
    dispatches: override.dispatches ?? [],
    returns: override.returns ?? [],
  };
}

describe("GetDateAwareAvailabilityService", () => {
  function createService(options?: {
    onHand?: number;
    reserved?: number;
    lines?: AvailabilityCommitmentLineProjection[];
  }) {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seedAvailabilityCommitmentLines(options?.lines ?? []);

    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({
        quantityOnHand: options?.onHand ?? 200,
        reservedQuantity: options?.reserved ?? 0,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
      }),
    ]);

    return {
      service: new GetDateAwareAvailabilityService(rentalOrders, inventory),
      rentalOrders,
      inventory,
    };
  }

  const request = {
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    startDate: "2026-01-10T00:00:00.000Z",
    endDate: "2026-01-20T00:00:00.000Z",
  };

  it("A: no overlapping rental → commitment = 0", async () => {
    const { service } = createService({
      lines: [
        projection({
          reservedQuantity: 100,
          eventStartDate: d(2026, 2, 1),
          eventEndDate: d(2026, 2, 5),
        }),
      ],
    });

    const result = await service.execute(request);
    expect(result.dateAwareCommittedQuantity).toBe(0);
    expect(result.dateAwareAvailableQuantity).toBe(200);
  });

  it("B: RESERVED overlapping → commitment = 100", async () => {
    const { service } = createService({
      lines: [projection({ reservedQuantity: 100 })],
    });
    const result = await service.execute(request);
    expect(result.dateAwareCommittedQuantity).toBe(100);
    expect(result.currentAvailableQuantity).toBe(200);
    expect(result.dateAwareAvailableQuantity).toBe(100);
  });

  it("C: CONFIRMED filtered by repository → commitment = 0", async () => {
    const { service } = createService({
      lines: [projection({ status: "CONFIRMED", reservedQuantity: 100 })],
    });
    const result = await service.execute(request);
    expect(result.dateAwareCommittedQuantity).toBe(0);
  });

  it("D: CANCELLED filtered → commitment = 0", async () => {
    const { service } = createService({
      lines: [projection({ status: "CANCELLED", reservedQuantity: 100 })],
    });
    const result = await service.execute(request);
    expect(result.dateAwareCommittedQuantity).toBe(0);
  });

  it("E: ON_RENT fully dispatched → commitment = 100", async () => {
    const { service } = createService({
      onHand: 100,
      reserved: 100,
      lines: [
        projection({
          status: "ON_RENT",
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
        }),
      ],
    });
    const result = await service.execute(request);
    expect(result.dateAwareCommittedQuantity).toBe(100);
    expect(result.outstandingOutQuantity).toBe(100);
    expect(result.baseCapacity).toBe(200);
    expect(result.dateAwareAvailableQuantity).toBe(100);
  });

  it("F: ON_RENT partially returned → commitment = 60", async () => {
    const { service } = createService({
      lines: [
        projection({
          status: "ON_RENT",
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
        }),
      ],
    });
    const result = await service.execute(request);
    expect(result.dateAwareCommittedQuantity).toBe(60);
  });

  it("G: RETURNED/COMPLETED statuses excluded by repository", async () => {
    const { service } = createService({
      lines: [
        projection({
          status: "RETURNED",
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 100 }],
        }),
        projection({
          status: "COMPLETED",
          reservedQuantity: 50,
          dispatches: [{ status: "COMPLETED", quantity: 50 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 50 }],
        }),
      ],
    });
    const result = await service.execute(request);
    expect(result.dateAwareCommittedQuantity).toBe(0);
  });

  it("H: partial dispatch → commitment = 100", async () => {
    const { service } = createService({
      lines: [
        projection({
          status: "ON_RENT",
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 60 }],
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(
      100,
    );
  });

  it("I: partial dispatch + partial return → commitment = 80", async () => {
    const { service } = createService({
      lines: [
        projection({
          status: "ON_RENT",
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 60 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 20 }],
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(80);
  });

  it("J: multiple overlapping → commitment = 90", async () => {
    const { service } = createService({
      lines: [
        projection({ reservedQuantity: 40 }),
        projection({ reservedQuantity: 30 }),
        projection({ reservedQuantity: 20 }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(90);
  });

  it("K: non-overlapping excluded", async () => {
    const { service } = createService({
      lines: [
        projection({
          reservedQuantity: 40,
          eventStartDate: d(2026, 3, 1),
          eventEndDate: d(2026, 3, 5),
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(0);
  });

  it("L: different warehouse excluded", async () => {
    const { service } = createService({
      lines: [
        projection({
          reservedQuantity: 100,
          warehouseId: OTHER_WAREHOUSE_ID,
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(0);
  });

  it("M: different product excluded", async () => {
    const { service } = createService({
      lines: [
        projection({
          reservedQuantity: 100,
          productId: OTHER_PRODUCT_ID,
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(0);
  });

  it("N: CANCELLED dispatch does not consume hold", async () => {
    const { service } = createService({
      lines: [
        projection({
          reservedQuantity: 100,
          dispatches: [{ status: "CANCELLED", quantity: 100 }],
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(
      100,
    );
  });

  it("O: READY + COMPLETED mixed", async () => {
    const { service } = createService({
      lines: [
        projection({
          status: "ON_RENT",
          reservedQuantity: 100,
          dispatches: [
            { status: "READY", quantity: 40 },
            { status: "COMPLETED", quantity: 60 },
          ],
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(60);
  });

  it("P: multi-dispatch 60+40 → commitment 100", async () => {
    const { service } = createService({
      lines: [
        projection({
          status: "ON_RENT",
          reservedQuantity: 100,
          dispatches: [
            { status: "COMPLETED", quantity: 60 },
            { status: "COMPLETED", quantity: 40 },
          ],
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(
      100,
    );
  });

  it("Q: return 40 after full dispatch → 60", async () => {
    const { service } = createService({
      lines: [
        projection({
          status: "PARTIALLY_RETURNED",
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(60);
  });

  it("R: return all 100 → 0", async () => {
    const { service } = createService({
      lines: [
        projection({
          status: "PARTIALLY_RETURNED",
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 100 }],
        }),
      ],
    });
    expect((await service.execute(request)).dateAwareCommittedQuantity).toBe(0);
  });

  it("S: single-day request overlaps inclusive", async () => {
    const { service } = createService({
      lines: [
        projection({
          reservedQuantity: 25,
          eventStartDate: d(2026, 1, 15),
          eventEndDate: d(2026, 1, 20),
        }),
      ],
    });
    const result = await service.execute({
      ...request,
      startDate: "2026-01-15T00:00:00.000Z",
      endDate: "2026-01-15T00:00:00.000Z",
    });
    expect(result.dateAwareCommittedQuantity).toBe(25);
  });

  it("T: boundary inclusive vs adjacent non-overlap", async () => {
    const { service } = createService({
      lines: [
        projection({
          reservedQuantity: 10,
          eventStartDate: d(2026, 1, 10),
          eventEndDate: d(2026, 1, 15),
        }),
      ],
    });

    const overlap = await service.execute({
      ...request,
      startDate: "2026-01-15T00:00:00.000Z",
      endDate: "2026-01-20T00:00:00.000Z",
    });
    expect(overlap.dateAwareCommittedQuantity).toBe(10);

    const adjacent = await service.execute({
      ...request,
      startDate: "2026-01-16T00:00:00.000Z",
      endDate: "2026-01-20T00:00:00.000Z",
    });
    expect(adjacent.dateAwareCommittedQuantity).toBe(0);
  });

  it("throws NotFound when inventory row missing", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    const inventory = new InMemoryInventoryRepository();
    const service = new GetDateAwareAvailabilityService(
      rentalOrders,
      inventory,
    );

    await expect(service.execute(request)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects invalid date range", async () => {
    const { service } = createService();
    await expect(
      service.execute({
        ...request,
        startDate: "2026-01-20T00:00:00.000Z",
        endDate: "2026-01-10T00:00:00.000Z",
      }),
    ).rejects.toThrow();
  });

  it("is read-only (no inventory mutations)", async () => {
    const { service, inventory } = createService({
      lines: [projection({ reservedQuantity: 10 })],
    });
    const reserveSpy = vi.spyOn(inventory, "reserveAvailableQuantity");
    const releaseSpy = vi.spyOn(inventory, "releaseReservedQuantity");
    const updateSpy = vi.spyOn(inventory, "update");

    await service.execute(request);

    expect(reserveSpy).not.toHaveBeenCalled();
    expect(releaseSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("loads commitment lines once (no N+1 loop API)", async () => {
    const { service, rentalOrders } = createService({
      lines: [
        projection({ reservedQuantity: 10 }),
        projection({ reservedQuantity: 20 }),
        projection({ reservedQuantity: 30 }),
      ],
    });
    const spy = vi.spyOn(rentalOrders, "findAvailabilityCommitmentLines");
    await service.execute(request);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
