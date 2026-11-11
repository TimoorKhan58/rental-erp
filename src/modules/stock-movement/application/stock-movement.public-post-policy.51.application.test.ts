import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { UpdateInventorySchema } from "@/modules/inventory/application/schemas/inventory.schemas";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { CreateStockMovementService } from "@/modules/stock-movement/application/services/create-stock-movement.service";
import { assertPublicStockMovementCreateAllowed } from "@/modules/stock-movement/application/services/public-stock-movement-create.policy";
import { handleCreateStockMovement } from "@/modules/stock-movement/presentation/routes/stock-movement-api.routes";
import { mockSession } from "@/shared/infrastructure/auth/api-auth.test-helpers";
import { USER_ROLES } from "@/constants/roles";
import { createRequestContext } from "@/shared/application/context";
import { parseRequest } from "@/shared/application/validation";
import {
  ForbiddenError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";

vi.mock("@/lib/auth", async () =>
  (await import("@/shared/infrastructure/auth/api-auth.test-helpers")).createLibAuthMockModule(),
);

vi.mock("@/lib/prisma", async () =>
  (await import("@/shared/infrastructure/auth/api-auth.test-helpers")).createLibPrismaMockModule(),
);

import {
  INVENTORY_ID,
  USER_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { MockAuditLogger } from "@/modules/stock-movement/tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "@/modules/stock-movement/tests/helpers/transaction-test-runner";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/stock-movement/tests/helpers/api-request.factory";
import { GetStockMovementByIdService } from "@/modules/stock-movement/application/services/get-stock-movement-by-id.service";
import { ListStockMovementsService } from "@/modules/stock-movement/application/services/list-stock-movements.service";

function createStockMovementApplicationServices(
  inventoryRepository = new InMemoryInventoryRepository(),
  stockMovementRepository = new InMemoryStockMovementRepository(),
  auditLogger = new MockAuditLogger(),
) {
  inventoryRepository.seed([buildInventoryEntity()]);

  const runner = createPassThroughTransactionRunner({
    inventoryRepository,
    stockMovementRepository,
    auditLogger,
    userId: USER_ID,
  });

  return {
    inventoryRepository,
    stockMovementRepository,
    services: {
      createStockMovement: new CreateStockMovementService(runner),
      getStockMovementById: new GetStockMovementByIdService(runner),
      listStockMovements: new ListStockMovementsService(runner),
    },
  };
}

function workerContext() {
  return createRequestContext({
    requestId: "req-worker",
    role: USER_ROLES.WORKER,
    userId: USER_ID,
  });
}

function viewerContext() {
  return createRequestContext({
    requestId: "req-viewer",
    role: USER_ROLES.VIEWER,
    userId: USER_ID,
  });
}

describe("Phase 51 — F-33-03 public stock movement POST policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Policy unit — permission matrix", () => {
    it("T51.1 allows ADJUSTMENT when caller has both permissions", () => {
      expect(() =>
        assertPublicStockMovementCreateAllowed(workerContext(), {
          inventoryId: INVENTORY_ID,
          movementType: "ADJUSTMENT",
          quantity: 5,
        }),
      ).not.toThrow();
    });

    it("T51.2 rejects ADJUSTMENT without inventory.adjust", () => {
      const ctx = createRequestContext({
        requestId: "req-create-only",
        role: USER_ROLES.ACCOUNTANT,
        userId: USER_ID,
      });

      expect(() =>
        assertPublicStockMovementCreateAllowed(ctx, {
          inventoryId: INVENTORY_ID,
          movementType: "ADJUSTMENT",
          quantity: 5,
        }),
      ).toThrow(ForbiddenError);
    });

    it("T51.3 rejects ADJUSTMENT without stockMovements.create", () => {
      expect(() =>
        assertPublicStockMovementCreateAllowed(viewerContext(), {
          inventoryId: INVENTORY_ID,
          movementType: "ADJUSTMENT",
          quantity: 5,
        }),
      ).toThrow(ForbiddenError);
    });

    it.each([
      ["IN", 10],
      ["OUT", 10],
      ["RESERVE", 5],
      ["RELEASE", 5],
    ] as const)("T51.4–T51.7 rejects public POST for %s", (movementType, quantity) => {
      expect(() =>
        assertPublicStockMovementCreateAllowed(workerContext(), {
          inventoryId: INVENTORY_ID,
          movementType,
          quantity,
        }),
      ).toThrow(UnprocessableError);
    });
  });

  describe("Public API — persistence boundary", () => {
    beforeEach(() => {
      mockSession(USER_ROLES.WORKER);
    });

    it("T51.1 API ADJUSTMENT with both permissions creates one ledger entry", async () => {
      const { services, inventoryRepository, stockMovementRepository } =
        createStockMovementApplicationServices();

      const response = await handleCreateStockMovement(
        createMockNextRequest({
          method: "POST",
          json: {
            inventoryId: INVENTORY_ID,
            movementType: "ADJUSTMENT",
            quantity: 8,
            remarks: "Cycle count",
          },
        }),
        () => services,
      );

      const body = await readJsonResponse<{ data: { movementType: string } }>(
        response,
      );

      expect(response.status).toBe(200);
      expect(body.data.movementType).toBe("ADJUSTMENT");
      expect(stockMovementRepository.count()).toBe(1);
      expect((await inventoryRepository.findById(INVENTORY_ID))?.quantityOnHand).toBe(
        108,
      );
    });

    it("T51.3 API rejects ADJUSTMENT without stockMovements.create before persistence", async () => {
      mockSession(USER_ROLES.VIEWER);
      const { services, stockMovementRepository } =
        createStockMovementApplicationServices();

      const response = await handleCreateStockMovement(
        createMockNextRequest({
          method: "POST",
          json: {
            inventoryId: INVENTORY_ID,
            movementType: "ADJUSTMENT",
            quantity: 5,
          },
        }),
        () => services,
      );

      expect(response.status).toBe(403);
      expect(stockMovementRepository.count()).toBe(0);
    });

    it("T51.4 API rejects IN and does not create movement", async () => {
      const { services, stockMovementRepository } =
        createStockMovementApplicationServices();

      const response = await handleCreateStockMovement(
        createMockNextRequest({
          method: "POST",
          json: {
            inventoryId: INVENTORY_ID,
            movementType: "IN",
            quantity: 10,
          },
        }),
        () => services,
      );

      expect(response.status).toBe(422);
      expect(stockMovementRepository.count()).toBe(0);
    });

    it("T51.5 API rejects OUT and does not create movement", async () => {
      const { services, stockMovementRepository } =
        createStockMovementApplicationServices();

      const response = await handleCreateStockMovement(
        createMockNextRequest({
          method: "POST",
          json: {
            inventoryId: INVENTORY_ID,
            movementType: "OUT",
            quantity: 10,
          },
        }),
        () => services,
      );

      expect(response.status).toBe(422);
      expect(stockMovementRepository.count()).toBe(0);
    });

    it("T51.6 API rejects RESERVE and does not create movement", async () => {
      const { services, stockMovementRepository } =
        createStockMovementApplicationServices();

      const response = await handleCreateStockMovement(
        createMockNextRequest({
          method: "POST",
          json: {
            inventoryId: INVENTORY_ID,
            movementType: "RESERVE",
            quantity: 5,
          },
        }),
        () => services,
      );

      expect(response.status).toBe(422);
      expect(stockMovementRepository.count()).toBe(0);
    });

    it("T51.7 API rejects RELEASE and does not create movement", async () => {
      const { services, stockMovementRepository } =
        createStockMovementApplicationServices();

      const response = await handleCreateStockMovement(
        createMockNextRequest({
          method: "POST",
          json: {
            inventoryId: INVENTORY_ID,
            movementType: "RELEASE",
            quantity: 5,
          },
        }),
        () => services,
      );

      expect(response.status).toBe(422);
      expect(stockMovementRepository.count()).toBe(0);
    });
  });

  describe("Internal workflow preservation — executeCreateStockMovementInScope", () => {
    async function createScope() {
      const inventoryRepository = new InMemoryInventoryRepository();
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const auditLogger = new MockAuditLogger();
      inventoryRepository.seed([buildInventoryEntity()]);

      return {
        inventoryRepository,
        stockMovementRepository,
        scope: {
          inventoryRepository,
          stockMovementRepository,
          auditLogger,
          userId: USER_ID,
        },
      };
    }

    it("T51.8 internal IN still works", async () => {
      const { scope, inventoryRepository, stockMovementRepository } =
        await createScope();

      const movement = await executeCreateStockMovementInScope(scope, {
        inventoryId: INVENTORY_ID,
        movementType: "IN",
        quantity: 15,
      });

      expect(movement.movementType).toBe("IN");
      expect(stockMovementRepository.count()).toBe(1);
      expect((await inventoryRepository.findById(INVENTORY_ID))?.quantityOnHand).toBe(
        115,
      );
    });

    it("T51.9 internal OUT still works", async () => {
      const { scope, inventoryRepository, stockMovementRepository } =
        await createScope();

      await executeCreateStockMovementInScope(scope, {
        inventoryId: INVENTORY_ID,
        movementType: "OUT",
        quantity: 20,
      });

      expect(stockMovementRepository.count()).toBe(1);
      expect((await inventoryRepository.findById(INVENTORY_ID))?.quantityOnHand).toBe(
        80,
      );
    });

    it("T51.10 internal RESERVE still works", async () => {
      const { scope, inventoryRepository, stockMovementRepository } =
        await createScope();

      await executeCreateStockMovementInScope(scope, {
        inventoryId: INVENTORY_ID,
        movementType: "RESERVE",
        quantity: 5,
      });

      expect(stockMovementRepository.count()).toBe(1);
      expect(
        (await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity,
      ).toBe(15);
    });

    it("T51.11 internal RELEASE still works", async () => {
      const { scope, inventoryRepository, stockMovementRepository } =
        await createScope();

      await executeCreateStockMovementInScope(scope, {
        inventoryId: INVENTORY_ID,
        movementType: "RELEASE",
        quantity: 3,
      });

      expect(stockMovementRepository.count()).toBe(1);
      expect(
        (await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity,
      ).toBe(7);
    });
  });

  describe("T51.12 Phase 43 regression — PATCH metadata-only", () => {
    it("rejects quantityOnHand in UpdateInventorySchema", () => {
      expect(() =>
        parseRequest(UpdateInventorySchema, { quantityOnHand: 500 }),
      ).toThrow(ValidationError);
    });

    it("rejects reservedQuantity in UpdateInventorySchema", () => {
      expect(() =>
        parseRequest(UpdateInventorySchema, { reservedQuantity: 50 }),
      ).toThrow(ValidationError);
    });
  });
});
