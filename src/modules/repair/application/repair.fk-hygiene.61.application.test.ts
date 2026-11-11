import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Prisma } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";

import { buildReservedRentalOrderEntity } from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { CreateRepairService } from "@/modules/repair/application/services/create-repair.service";
import { toRepairCreateInput } from "@/modules/repair/infrastructure/mappers/repair.persistence.mapper";
import {
  VALID_CREATE_INPUT,
  buildCompletedReturnForRepair,
  buildCreateRepairData,
} from "@/modules/repair/tests/helpers/repair.fixtures";
import { InMemoryRepairRepository } from "@/modules/repair/tests/helpers/in-memory-repair.repository";
import { MockAuditLogger } from "@/modules/repair/tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "@/modules/repair/tests/helpers/transaction-test-runner";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { ITEM_ID, RETURN_ID } from "@/modules/return/tests/helpers/return.fixtures";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { USER_ID } from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import { mapPrismaError } from "@/shared/infrastructure/database/prisma-error-mapper";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import type { CreateRepairInput } from "@/modules/repair/application/schemas/repair.schemas";

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateRepairInput;

const MIGRATION_SQL = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260903120000_repair_return_inspection_item_fkey/migration.sql",
  ),
  "utf8",
);

const SCHEMA = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

function createWriteScope(
  repairRepository: InMemoryRepairRepository,
  returnRepository: InMemoryReturnRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  auditLogger: MockAuditLogger,
) {
  return createPassThroughTransactionRunner({
    repairRepository,
    returnRepository,
    rentalOrderRepository,
    inventoryRepository: new InMemoryInventoryRepository(),
    stockMovementRepository: new InMemoryStockMovementRepository(),
    auditLogger,
    userId: USER_ID,
  });
}

describe("F-09 repair returnInspectionItemId FK hygiene", () => {
  describe("schema and migration", () => {
    it("T61.3 migration adds ON DELETE RESTRICT foreign key", () => {
      expect(MIGRATION_SQL).toContain("repairs_returnInspectionItemId_fkey");
      expect(MIGRATION_SQL).toContain(
        'REFERENCES "return_inspection_items"("id")',
      );
      expect(MIGRATION_SQL).toContain("ON DELETE RESTRICT");
    });

    it("T61.3 Prisma schema models RESTRICT delete on returnInspectionItem", () => {
      expect(SCHEMA).toMatch(
        /returnInspectionItem\s+ReturnInspectionItem\s+@relation\(fields:\s*\[returnInspectionItemId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/,
      );
    });

    it("T61.4 returnInspectionItemId remains required on Repair", () => {
      const repairBlock = SCHEMA.slice(
        SCHEMA.indexOf("model Repair"),
        SCHEMA.indexOf("model RepairItem"),
      );

      expect(repairBlock).toMatch(
        /returnInspectionItemId\s+String\s+@db\.Uuid/,
      );
      expect(repairBlock).not.toMatch(/returnInspectionItemId\s+String\?/);
    });
  });

  describe("persistence mapping", () => {
    it("T61.1 maps valid returnInspectionItem via Prisma connect", () => {
      const input = toRepairCreateInput(buildCreateRepairData());

      expect(input.returnInspectionItem).toEqual({
        connect: { id: ITEM_ID },
      });
      expect(input).not.toHaveProperty("returnInspectionItemId");
    });
  });

  describe("application integrity", () => {
    it("T61.1 accepts repair referencing an existing return inspection item", async () => {
      const repairRepository = new InMemoryRepairRepository();
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildCompletedReturnForRepair()]);
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
      const auditLogger = new MockAuditLogger();
      const service = new CreateRepairService(
        createWriteScope(
          repairRepository,
          returnRepository,
          rentalOrderRepository,
          auditLogger,
        ),
        createMockNumberSequenceRepository(),
      );

      const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

      expect(result.returnItemId).toBe(ITEM_ID);
      expect(result.returnId).toBe(RETURN_ID);
    });

    it("T61.2 rejects repair referencing a nonexistent return inspection item", async () => {
      const repairRepository = new InMemoryRepairRepository();
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildCompletedReturnForRepair()]);
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
      const auditLogger = new MockAuditLogger();
      const service = new CreateRepairService(
        createWriteScope(
          repairRepository,
          returnRepository,
          rentalOrderRepository,
          auditLogger,
        ),
        createMockNumberSequenceRepository(),
      );

      await expect(
        service.execute({
          ...VALID_CREATE_SERVICE_INPUT,
          returnItemId: "dd0e8400-e29b-41d4-a716-446655440099",
        }),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/return item/i),
      });
    });

    it("T61.2 maps Prisma P2003 foreign-key failures to UnprocessableError", () => {
      const mapped = mapPrismaError(
        new Prisma.PrismaClientKnownRequestError(
          "Foreign key constraint failed",
          {
            code: "P2003",
            clientVersion: "test",
          },
        ),
      );

      expect(mapped).toBeInstanceOf(UnprocessableError);
      expect(mapped.message).toMatch(/related record does not exist/i);
      expect(mapped.message).not.toMatch(/PrismaClientKnownRequestError/i);
    });
  });
});
