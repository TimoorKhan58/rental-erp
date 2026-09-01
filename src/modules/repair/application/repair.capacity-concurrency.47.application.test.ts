import { beforeEach, describe, expect, it } from "vitest";

import { buildReservedRentalOrderEntity } from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { CreateRepairService } from "@/modules/repair/application/services/create-repair.service";
import { UpdateRepairService } from "@/modules/repair/application/services/update-repair.service";
import { resetRepairCapacityLockForTests } from "@/modules/repair/infrastructure/repair-capacity-lock";
import { buildPriorRepairedMap } from "@/modules/repair/application/services/repair-return.validation";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import type { CreateRepairInput } from "@/modules/repair/application/schemas/repair.schemas";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { UnprocessableError } from "@/shared/infrastructure/errors";

import { InMemoryRepairRepository } from "../tests/helpers/in-memory-repair.repository";
import {
  ITEM_ID,
  OTHER_REPAIR_ID,
  REPAIR_ID,
  RETURN_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  buildCompletedReturnForRepair,
  buildRepairEntity,
} from "../tests/helpers/repair.fixtures";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

const BASE_CREATE_INPUT = VALID_CREATE_INPUT as unknown as CreateRepairInput;

function createServices(
  repairRepository: InMemoryRepairRepository,
  returnRepository: InMemoryReturnRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
) {
  const transactionRunner = createPassThroughTransactionRunner({
    repairRepository,
    returnRepository,
    rentalOrderRepository,
    inventoryRepository: new InMemoryInventoryRepository(),
    stockMovementRepository: new InMemoryStockMovementRepository(),
    auditLogger: new MockAuditLogger(),
    userId: USER_ID,
  });

  return {
    createRepair: new CreateRepairService(
      transactionRunner,
      createMockNumberSequenceRepository(),
    ),
    updateRepair: new UpdateRepairService(transactionRunner),
  };
}

async function sumCommittedForReturnItem(
  repairRepository: InMemoryRepairRepository,
  returnItemId = ITEM_ID,
): Promise<number> {
  const priorRepairs = await repairRepository.findByReturnId(RETURN_ID);
  return buildPriorRepairedMap(priorRepairs).get(returnItemId) ?? 0;
}

describe("Phase 47 N-46-01: repair capacity over-commitment integrity", () => {
  beforeEach(() => {
    resetRepairCapacityLockForTests();
  });

  it("T47.1: concurrent create within damaged capacity both succeed", async () => {
    const repairRepository = new InMemoryRepairRepository();
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair({ damagedQuantity: 10 })]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const { createRepair } = createServices(
      repairRepository,
      returnRepository,
      rentalOrderRepository,
    );

    const results = await Promise.allSettled([
      createRepair.execute({
        ...BASE_CREATE_INPUT,
        repairNumber: "RPR-T47-1-A",
        quantity: 4,
      }),
      createRepair.execute({
        ...BASE_CREATE_INPUT,
        repairNumber: "RPR-T47-1-B",
        quantity: 6,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(0);
    expect(await sumCommittedForReturnItem(repairRepository)).toBe(10);
  });

  it("T47.2: concurrent create exceeding damaged capacity allows one success", async () => {
    const repairRepository = new InMemoryRepairRepository();
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair({ damagedQuantity: 10 })]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const { createRepair } = createServices(
      repairRepository,
      returnRepository,
      rentalOrderRepository,
    );

    const results = await Promise.allSettled([
      createRepair.execute({
        ...BASE_CREATE_INPUT,
        repairNumber: "RPR-T47-2-A",
        quantity: 6,
      }),
      createRepair.execute({
        ...BASE_CREATE_INPUT,
        repairNumber: "RPR-T47-2-B",
        quantity: 6,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      rejected[0]?.status === "rejected" &&
        rejected[0].reason instanceof UnprocessableError,
    ).toBe(true);
    expect(await sumCommittedForReturnItem(repairRepository)).toBe(6);
  });

  it("T47.3: accepts create when existing repairs plus amount equals damaged capacity", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: REPAIR_ID,
        quantity: 6,
        status: "PENDING",
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair({ damagedQuantity: 10 })]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const { createRepair } = createServices(
      repairRepository,
      returnRepository,
      rentalOrderRepository,
    );

    await createRepair.execute({
      ...BASE_CREATE_INPUT,
      repairNumber: "RPR-T47-3",
      quantity: 4,
    });

    expect(await sumCommittedForReturnItem(repairRepository)).toBe(10);
  });

  it("T47.4: rejects create one unit over damaged capacity", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: REPAIR_ID,
        quantity: 6,
        status: "PENDING",
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair({ damagedQuantity: 10 })]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const { createRepair } = createServices(
      repairRepository,
      returnRepository,
      rentalOrderRepository,
    );

    await expect(
      createRepair.execute({
        ...BASE_CREATE_INPUT,
        repairNumber: "RPR-T47-4",
        quantity: 5,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect(await sumCommittedForReturnItem(repairRepository)).toBe(6);
    expect(repairRepository.count()).toBe(1);
  });

  it("T47.5: concurrent create and update never over-commit capacity", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: REPAIR_ID,
        quantity: 3,
        status: "PENDING",
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair({ damagedQuantity: 10 })]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const { createRepair, updateRepair } = createServices(
      repairRepository,
      returnRepository,
      rentalOrderRepository,
    );

    const results = await Promise.allSettled([
      createRepair.execute({
        ...BASE_CREATE_INPUT,
        repairNumber: "RPR-T47-5-NEW",
        quantity: 4,
      }),
      updateRepair.execute({ id: REPAIR_ID }, { quantity: 7 }),
    ]);

    expect(results.some((result) => result.status === "rejected")).toBe(true);
    expect(await sumCommittedForReturnItem(repairRepository)).toBeLessThanOrEqual(10);
  });

  it("T47.6: concurrent quantity updates never over-commit capacity", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: REPAIR_ID,
        quantity: 3,
        status: "PENDING",
      }),
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        quantity: 3,
        status: "PENDING",
        repairNumber: "RPR-T47-6-B",
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair({ damagedQuantity: 10 })]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const { updateRepair } = createServices(
      repairRepository,
      returnRepository,
      rentalOrderRepository,
    );

    const results = await Promise.allSettled([
      updateRepair.execute({ id: REPAIR_ID }, { quantity: 7 }),
      updateRepair.execute({ id: OTHER_REPAIR_ID }, { quantity: 7 }),
    ]);

    expect(results.some((result) => result.status === "rejected")).toBe(true);
    expect(await sumCommittedForReturnItem(repairRepository)).toBeLessThanOrEqual(10);
  });

  it("does not count CANCELLED repairs toward capacity", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: REPAIR_ID,
        quantity: 8,
        status: "CANCELLED",
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair({ damagedQuantity: 10 })]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const { createRepair } = createServices(
      repairRepository,
      returnRepository,
      rentalOrderRepository,
    );

    await createRepair.execute({
      ...BASE_CREATE_INPUT,
      repairNumber: "RPR-CANCELLED",
      quantity: 10,
    });

    expect(await sumCommittedForReturnItem(repairRepository)).toBe(10);
  });

  it("update excludes self from capacity sum and succeeds at exact boundary", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: REPAIR_ID,
        quantity: 4,
        status: "PENDING",
      }),
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        quantity: 3,
        status: "PENDING",
        repairNumber: "RPR-SELF-B",
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair({ damagedQuantity: 10 })]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const { updateRepair } = createServices(
      repairRepository,
      returnRepository,
      rentalOrderRepository,
    );

    await updateRepair.execute({ id: REPAIR_ID }, { quantity: 7 });

    expect(await sumCommittedForReturnItem(repairRepository)).toBe(10);
  });

  it("update excludes self and rejects one unit over capacity", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: REPAIR_ID,
        quantity: 4,
        status: "PENDING",
      }),
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        quantity: 3,
        status: "PENDING",
        repairNumber: "RPR-SELF-OVER-B",
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair({ damagedQuantity: 10 })]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const { updateRepair } = createServices(
      repairRepository,
      returnRepository,
      rentalOrderRepository,
    );

    await expect(
      updateRepair.execute({ id: REPAIR_ID }, { quantity: 8 }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect(await sumCommittedForReturnItem(repairRepository)).toBe(7);
  });
});
