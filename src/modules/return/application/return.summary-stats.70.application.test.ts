import { describe, expect, it } from "vitest";

import { GetReturnSummaryService } from "@/modules/return/application/services/get-return-summary.service";
import type { ReturnInspectionId } from "@/shared/domain/ids";

import {
  buildReturnEntity,
  OTHER_RETURN_ID,
  RETURN_ID,
} from "../tests/helpers/return.fixtures";
import { InMemoryReturnRepository } from "../tests/helpers/in-memory-return.repository";

function buildManyDraftReturns(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildReturnEntity({
      id: `ee0e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}` as ReturnInspectionId,
      status: "DRAFT",
      items: [
        {
          id: `dd0e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`,
          rentalOrderItemId: "cc0e8400-e29b-41d4-a716-446655440000",
          dispatchItemId: "cc0e8400-e29b-41d4-a716-446655440000",
          returnedQuantity: 2,
          ownedQuantity: 2,
          externalQuantity: 0,
          goodQuantity: 0,
          damagedQuantity: 0,
          lostQuantity: 0,
          missingQuantity: 0,
          ownedGoodQuantity: 0,
          ownedDamagedQuantity: 0,
          ownedLostQuantity: 0,
          externalGoodQuantity: 0,
          externalDamagedQuantity: 0,
          externalLostQuantity: 0,
          notes: null,
        },
      ],
    }),
  );
}

function createSeededReturnRepository(
  returns: ReturnType<typeof buildReturnEntity>[],
) {
  const repository = new InMemoryReturnRepository();
  repository.seed(returns);
  return repository;
}

describe("N-39-PATTERN-01 Batch 3 — return summary stats completeness", () => {
  it("returns correct summary for exactly 100 returns", async () => {
    const repository = createSeededReturnRepository(buildManyDraftReturns(100));
    const service = new GetReturnSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalReturns).toBe(100);
    expect(summary.stats.totalReturnedUnits).toBe(200);
  });

  it("returns correct summary for 101 returns (pagination boundary)", async () => {
    const repository = createSeededReturnRepository(buildManyDraftReturns(101));
    const service = new GetReturnSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalReturns).toBe(101);
    expect(summary.stats.totalReturnedUnits).toBe(202);
  });

  it("returns correct summary for 150 returns", async () => {
    const repository = createSeededReturnRepository(buildManyDraftReturns(150));
    const service = new GetReturnSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalReturns).toBe(150);
    expect(summary.stats.totalReturnedUnits).toBe(300);
  });

  it("applies status filter to summary units", async () => {
    const repository = createSeededReturnRepository([
      buildReturnEntity({
        id: RETURN_ID,
        status: "DRAFT",
        items: [
          {
            id: "dd0e8400-e29b-41d4-a716-446655440010",
            rentalOrderItemId: "cc0e8400-e29b-41d4-a716-446655440000",
            dispatchItemId: null,
            returnedQuantity: 5,
            ownedQuantity: 5,
            externalQuantity: 0,
            goodQuantity: 0,
            damagedQuantity: 0,
            lostQuantity: 0,
            missingQuantity: 0,
            ownedGoodQuantity: 0,
            ownedDamagedQuantity: 0,
            ownedLostQuantity: 0,
            externalGoodQuantity: 0,
            externalDamagedQuantity: 0,
            externalLostQuantity: 0,
            notes: null,
          },
        ],
      }),
      buildReturnEntity({
        id: OTHER_RETURN_ID,
        status: "COMPLETED",
        items: [
          {
            id: "dd0e8400-e29b-41d4-a716-446655440011",
            rentalOrderItemId: "cc0e8400-e29b-41d4-a716-446655440000",
            dispatchItemId: null,
            returnedQuantity: 9,
            ownedQuantity: 9,
            externalQuantity: 0,
            goodQuantity: 9,
            damagedQuantity: 0,
            lostQuantity: 0,
            missingQuantity: 0,
            ownedGoodQuantity: 0,
            ownedDamagedQuantity: 0,
            ownedLostQuantity: 0,
            externalGoodQuantity: 0,
            externalDamagedQuantity: 0,
            externalLostQuantity: 0,
            notes: null,
          },
        ],
      }),
    ]);
    const service = new GetReturnSummaryService(repository);

    const summary = await service.execute({ status: "DRAFT" });

    expect(summary.stats.totalReturns).toBe(1);
    expect(summary.stats.totalReturnedUnits).toBe(5);
  });

  it("returns zeroed summary for empty dataset", async () => {
    const repository = new InMemoryReturnRepository();
    repository.seed([]);
    const service = new GetReturnSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalReturns).toBe(0);
    expect(summary.stats.totalReturnedUnits).toBe(0);
  });
});
