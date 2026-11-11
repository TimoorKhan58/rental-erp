import { afterEach, describe, expect, it, vi } from "vitest";

const phase55Mocks = vi.hoisted(() => ({
  runWithRepositoryUnitOfWork: vi.fn(),
  createDispatchRepositoryFromUnitOfWork: vi.fn(),
  createReturnRepositoryFromUnitOfWork: vi.fn(),
  createRentalOrderRepositoryFromUnitOfWork: vi.fn(),
  createRentalInvoiceRepositoryFromUnitOfWork: vi.fn(),
  createProductRepositoryFromUnitOfWork: vi.fn(),
  createCustomerRepositoryFromUnitOfWork: vi.fn(),
}));

vi.mock("@/shared/infrastructure/database", () => ({
  runWithRepositoryUnitOfWork: phase55Mocks.runWithRepositoryUnitOfWork,
}));

vi.mock("@/modules/dispatch/infrastructure/factories/create-dispatch.repository", () => ({
  createDispatchRepositoryFromUnitOfWork:
    phase55Mocks.createDispatchRepositoryFromUnitOfWork,
}));

vi.mock("@/modules/return/infrastructure/factories/create-return.repository", () => ({
  createReturnRepositoryFromUnitOfWork:
    phase55Mocks.createReturnRepositoryFromUnitOfWork,
}));

vi.mock("@/modules/rental-order/infrastructure/factories/create-rental-order.repository", () => ({
  createRentalOrderRepositoryFromUnitOfWork:
    phase55Mocks.createRentalOrderRepositoryFromUnitOfWork,
}));

vi.mock(
  "@/modules/rental-invoice/infrastructure/factories/create-rental-invoice.repository",
  () => ({
    createRentalInvoiceRepositoryFromUnitOfWork:
      phase55Mocks.createRentalInvoiceRepositoryFromUnitOfWork,
  }),
);

vi.mock("@/modules/product/infrastructure/factories/create-product.repository", () => ({
  createProductRepositoryFromUnitOfWork:
    phase55Mocks.createProductRepositoryFromUnitOfWork,
}));

vi.mock("@/modules/customer/infrastructure/factories/create-customer.repository", () => ({
  createCustomerRepositoryFromUnitOfWork:
    phase55Mocks.createCustomerRepositoryFromUnitOfWork,
}));

import { Prisma } from "@/generated/prisma/client";

import { createReplacementCost } from "@/modules/product/domain";
import { Product } from "@/modules/product/domain/product.entity";
import { buildCustomerEntity } from "@/modules/customer/tests/helpers/customer.fixtures";
import { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { buildProductEntity } from "@/modules/product/tests/helpers/product.fixtures";
import { InMemoryProductRepository } from "@/modules/product/tests/helpers/in-memory-product.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { PRODUCT_ID, USER_ID } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { GenerateRentalInvoiceFromOrderService } from "@/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service";
import { isInvoiceNumberConflict } from "@/modules/rental-invoice/application/services/is-invoice-number-conflict";
import * as createRentalInvoiceInScopeModule from "@/modules/rental-invoice/application/services/create-rental-invoice-in-scope";
import type { RentalInvoiceDto } from "@/modules/rental-invoice/application/dtos/rental-invoice.dto";
import { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import { seedMinimalGenerateFromOrderFixtures } from "@/modules/rental-invoice/tests/helpers/phase-37-active-guard.fixtures";
import { MockAuditLogger } from "@/modules/rental-invoice/tests/helpers/mock-audit-logger";
import { RENTAL_ORDER_ID } from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { ProductId } from "@/shared/domain/ids";
import {
  ConflictError,
  InternalError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { mapPrismaError } from "@/shared/infrastructure/database/prisma-error-mapper";

function buildPrismaInvoiceNumberP2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed on the fields: (`invoiceNumber`)",
    {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["invoiceNumber"] },
    },
  );
}

function buildMappedInvoiceNumberP2002Conflict(): ConflictError {
  return mapPrismaError(buildPrismaInvoiceNumberP2002()) as ConflictError;
}

function buildInvoiceDto(invoiceNumber: string): RentalInvoiceDto {
  return {
    id: "inv-1",
    invoiceNumber,
    rentalOrderId: RENTAL_ORDER_ID,
    customerId: "cust-1",
    invoiceDate: "2026-06-15T00:00:00.000Z",
    dueDate: "2026-06-22T00:00:00.000Z",
    subtotal: 100,
    discount: 0,
    tax: 0,
    grandTotal: 100,
    paidAmount: 0,
    balance: 100,
    status: "DRAFT",
    notes: null,
    issuedAt: null,
    voidedAt: null,
    createdById: USER_ID,
    items: [],
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  };
}

function setupGenerateHarness() {
  const dispatchRepository = new InMemoryDispatchRepository();
  const returnRepository = new InMemoryReturnRepository();
  const rentalOrderRepository = new InMemoryRentalOrderRepository();
  const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
  const productRepository = new InMemoryProductRepository();
  const customerRepository = new InMemoryCustomerRepository();
  customerRepository.seed([buildCustomerEntity()]);

  productRepository.seed([
    Product.reconstitute({
      ...buildProductEntity().toProps(),
      id: PRODUCT_ID as ProductId,
      replacementCost: createReplacementCost(500),
    }),
  ]);

  const mockDeps = {
    auditLogger: new MockAuditLogger(),
  } as unknown as SharedDeps;

  phase55Mocks.runWithRepositoryUnitOfWork.mockImplementation(
    async (_deps, operation) =>
      operation({
        deps: mockDeps,
      } as Parameters<typeof operation>[0]),
  );
  phase55Mocks.createDispatchRepositoryFromUnitOfWork.mockReturnValue(
    dispatchRepository,
  );
  phase55Mocks.createReturnRepositoryFromUnitOfWork.mockReturnValue(
    returnRepository,
  );
  phase55Mocks.createRentalOrderRepositoryFromUnitOfWork.mockReturnValue(
    rentalOrderRepository,
  );
  phase55Mocks.createRentalInvoiceRepositoryFromUnitOfWork.mockReturnValue(
    rentalInvoiceRepository,
  );
  phase55Mocks.createProductRepositoryFromUnitOfWork.mockReturnValue(
    productRepository,
  );
  phase55Mocks.createCustomerRepositoryFromUnitOfWork.mockReturnValue(
    customerRepository,
  );

  return {
    dispatchRepository,
    returnRepository,
    rentalOrderRepository,
    rentalInvoiceRepository,
    service: new GenerateRentalInvoiceFromOrderService(mockDeps, USER_ID),
  };
}

describe("Phase 55 N-51-01: invoice P2002 conflict retry message gap", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("isInvoiceNumberConflict", () => {
    it("T55.1: recognizes application pre-check invoice number conflict", () => {
      const error = new ConflictError({
        message: "Invoice number already exists",
        details: { invoiceNumber: "INV-2026-001" },
      });

      expect(isInvoiceNumberConflict(error)).toBe(true);
    });

    it("T55.1: recognizes Prisma P2002 mapped conflict on invoiceNumber", () => {
      const error = buildMappedInvoiceNumberP2002Conflict();

      expect(isInvoiceNumberConflict(error)).toBe(true);
      expect(error.message).toBe(
        "A record with the same unique value already exists",
      );
    });

    it("T55.2: mapped P2002 conflict does not expose raw Prisma identifiers in message", () => {
      const error = buildMappedInvoiceNumberP2002Conflict();

      expect(error.message).not.toMatch(/PrismaClientKnownRequestError/i);
      expect(error.message).not.toMatch(/\bP2002\b/);
      expect(JSON.stringify(error.details)).not.toMatch(
        /rental_invoices_invoiceNumber_key/i,
      );
    });

    it("T55.3: does not treat unrelated ConflictError as invoice number conflict", () => {
      const error = new ConflictError({
        message: "An active invoice already exists for this rental order",
        details: { invoiceId: "abc" },
      });

      expect(isInvoiceNumberConflict(error)).toBe(false);
    });

    it("T55.3: does not treat P2002 on another unique field as invoice number conflict", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "test",
          meta: { target: ["agreementNumber"] },
        },
      );
      const error = mapPrismaError(prismaError);

      expect(isInvoiceNumberConflict(error)).toBe(false);
    });

    it("T55.3: does not treat non-conflict database errors as invoice number conflict", () => {
      const error = new InternalError({
        code: ERROR_CODES.DATABASE_ERROR,
        cause: new Error("connection reset"),
      });

      expect(isInvoiceNumberConflict(error)).toBe(false);
    });
  });

  describe("GenerateRentalInvoiceFromOrderService retry loop", () => {
    it("T55.4/T55.7: retries after P2002-mapped conflict and succeeds on next attempt", async () => {
      const fixture = seedMinimalGenerateFromOrderFixtures();
      const {
        dispatchRepository,
        returnRepository,
        rentalOrderRepository,
        service,
      } = setupGenerateHarness();

      dispatchRepository.seed([fixture.dispatch]);
      returnRepository.seed([fixture.completedReturn]);
      rentalOrderRepository.seed([fixture.rentalOrder]);

      const mappedP2002 = buildMappedInvoiceNumberP2002Conflict();
      const successDto = buildInvoiceDto("INV-2026-099");

      const createSpy = vi
        .spyOn(createRentalInvoiceInScopeModule, "createRentalInvoiceInWriteScope")
        .mockRejectedValueOnce(mappedP2002)
        .mockResolvedValueOnce(successDto);

      const result = await service.execute({ rentalOrderId: RENTAL_ORDER_ID });

      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(result.invoiceNumber).toBe("INV-2026-099");
      createSpy.mockRestore();
    });

    it("T55.4: returns exhausted-allocation message after repeated invoice number conflicts", async () => {
      const fixture = seedMinimalGenerateFromOrderFixtures();
      const {
        dispatchRepository,
        returnRepository,
        rentalOrderRepository,
        service,
      } = setupGenerateHarness();

      dispatchRepository.seed([fixture.dispatch]);
      returnRepository.seed([fixture.completedReturn]);
      rentalOrderRepository.seed([fixture.rentalOrder]);

      const mappedP2002 = buildMappedInvoiceNumberP2002Conflict();

      const createSpy = vi
        .spyOn(createRentalInvoiceInScopeModule, "createRentalInvoiceInWriteScope")
        .mockRejectedValue(mappedP2002);

      await expect(
        service.execute({ rentalOrderId: RENTAL_ORDER_ID }),
      ).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof UnprocessableError &&
          /Unable to allocate a unique invoice number after multiple attempts/i.test(
            error.message,
          ),
      );

      expect(createSpy).toHaveBeenCalledTimes(5);
      createSpy.mockRestore();
    });

    it("T55.5: rejects generate when user context is missing", async () => {
      setupGenerateHarness();
      const unauthorizedService = new GenerateRentalInvoiceFromOrderService(
        {} as SharedDeps,
        undefined,
      );

      await expect(
        unauthorizedService.execute({ rentalOrderId: RENTAL_ORDER_ID }),
      ).rejects.toMatchObject({
        message: "User context is required to create rental invoice",
      });
    });
  });
});
