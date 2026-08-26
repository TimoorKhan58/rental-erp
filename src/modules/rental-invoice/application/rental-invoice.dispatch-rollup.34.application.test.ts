import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const phase34Mocks = vi.hoisted(() => ({
  runWithRepositoryUnitOfWork: vi.fn(),
  createDispatchRepositoryFromUnitOfWork: vi.fn(),
  createReturnRepositoryFromUnitOfWork: vi.fn(),
  createRentalOrderRepositoryFromUnitOfWork: vi.fn(),
  createRentalInvoiceRepositoryFromUnitOfWork: vi.fn(),
  createProductRepositoryFromUnitOfWork: vi.fn(),
}));

vi.mock("@/shared/infrastructure/database", () => ({
  runWithRepositoryUnitOfWork: phase34Mocks.runWithRepositoryUnitOfWork,
}));

vi.mock("@/modules/dispatch/infrastructure/factories/create-dispatch.repository", () => ({
  createDispatchRepositoryFromUnitOfWork:
    phase34Mocks.createDispatchRepositoryFromUnitOfWork,
}));

vi.mock("@/modules/return/infrastructure/factories/create-return.repository", () => ({
  createReturnRepositoryFromUnitOfWork:
    phase34Mocks.createReturnRepositoryFromUnitOfWork,
}));

vi.mock("@/modules/rental-order/infrastructure/factories/create-rental-order.repository", () => ({
  createRentalOrderRepositoryFromUnitOfWork:
    phase34Mocks.createRentalOrderRepositoryFromUnitOfWork,
}));

vi.mock(
  "@/modules/rental-invoice/infrastructure/factories/create-rental-invoice.repository",
  () => ({
    createRentalInvoiceRepositoryFromUnitOfWork:
      phase34Mocks.createRentalInvoiceRepositoryFromUnitOfWork,
  }),
);

vi.mock("@/modules/product/infrastructure/factories/create-product.repository", () => ({
  createProductRepositoryFromUnitOfWork:
    phase34Mocks.createProductRepositoryFromUnitOfWork,
}));

import { createReplacementCost } from "@/modules/product/domain";
import { Product } from "@/modules/product/domain/product.entity";
import { buildProductEntity } from "@/modules/product/tests/helpers/product.fixtures";
import { InMemoryProductRepository } from "@/modules/product/tests/helpers/in-memory-product.repository";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type { CreateRentalInvoiceService } from "@/modules/rental-invoice/application/services/create-rental-invoice.service";
import { ConvertMissingToLossService } from "@/modules/rental-invoice/application/services/convert-missing-to-loss.service";
import { GenerateRentalInvoiceFromOrderService } from "@/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service";
import type { CreateRentalInvoiceInput } from "@/modules/rental-invoice/application/schemas/rental-invoice.schemas";
import type { RentalInvoiceDto } from "@/modules/rental-invoice/application/dtos/rental-invoice.dto";
import { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import {
  buildDraftInvoiceWithMissingQuantity,
  RENTAL_ORDER_ID,
  seedPhase34Beyond100DispatchRollupFixtures,
} from "@/modules/rental-invoice/tests/helpers/phase-34-dispatch-rollup.fixtures";
import { RENTAL_INVOICE_ID } from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { ProductId, ReturnInspectionId } from "@/shared/domain/ids";

import { PRODUCT_ID } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";

const RETURN_ON_DISPATCH_101_ID =
  "ee0e8400-e29b-41d4-a716-446655440101" as ReturnInspectionId;

describe("Phase 34 invoice dispatch rollup integrity", () => {
  let dispatchRepository: InMemoryDispatchRepository;
  let returnRepository: InMemoryReturnRepository;
  let rentalOrderRepository: InMemoryRentalOrderRepository;
  let rentalInvoiceRepository: InMemoryRentalInvoiceRepository;
  let productRepository: InMemoryProductRepository;
  let mockDeps: SharedDeps;

  beforeEach(() => {
    dispatchRepository = new InMemoryDispatchRepository();
    returnRepository = new InMemoryReturnRepository();
    rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    productRepository = new InMemoryProductRepository();

    productRepository.seed([
      Product.reconstitute({
        ...buildProductEntity().toProps(),
        id: PRODUCT_ID as ProductId,
        replacementCost: createReplacementCost(500),
      }),
    ]);

    mockDeps = {} as SharedDeps;

    phase34Mocks.runWithRepositoryUnitOfWork.mockImplementation(
      async (_deps, operation) =>
        operation({} as Parameters<typeof operation>[0]),
    );
    phase34Mocks.createDispatchRepositoryFromUnitOfWork.mockReturnValue(
      dispatchRepository,
    );
    phase34Mocks.createReturnRepositoryFromUnitOfWork.mockReturnValue(
      returnRepository,
    );
    phase34Mocks.createRentalOrderRepositoryFromUnitOfWork.mockReturnValue(
      rentalOrderRepository,
    );
    phase34Mocks.createRentalInvoiceRepositoryFromUnitOfWork.mockReturnValue(
      rentalInvoiceRepository,
    );
    phase34Mocks.createProductRepositoryFromUnitOfWork.mockReturnValue(
      productRepository,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("T34.1 invoice generation beyond 100 dispatches", () => {
    it("includes missing quantities from the return on dispatch index 0 when 101 completed dispatches exist", async () => {
      const fixture = seedPhase34Beyond100DispatchRollupFixtures({
        missingQuantity: 3,
        returnId: RETURN_ON_DISPATCH_101_ID,
        returnNumber: "RTN-DISPATCH-101-MISSING",
      });

      dispatchRepository.seed(fixture.dispatches);
      returnRepository.seed([fixture.targetReturn]);
      rentalOrderRepository.seed([fixture.rentalOrder]);

      let capturedInput: CreateRentalInvoiceInput | undefined;
      const createRentalInvoiceService = {
        execute: vi.fn(async (input: CreateRentalInvoiceInput) => {
          capturedInput = input;
          return {
            id: RENTAL_INVOICE_ID,
            invoiceNumber: input.invoiceNumber,
            rentalOrderId: input.rentalOrderId,
            customerId: input.customerId,
            status: "DRAFT",
            grandTotal: 0,
            balance: 0,
            paidAmount: 0,
            items: input.items,
          } as unknown as RentalInvoiceDto;
        }),
      };

      const service = new GenerateRentalInvoiceFromOrderService(
        mockDeps,
        createRentalInvoiceService as unknown as CreateRentalInvoiceService,
      );

      await service.execute({ rentalOrderId: RENTAL_ORDER_ID });

      expect(capturedInput).toBeDefined();
      const rentalLine = capturedInput!.items.find(
        (item) => item.lineType === "RENTAL_CHARGE",
      );
      expect(rentalLine?.missingQuantity).toBe(3);

      const missingChargeLine = capturedInput!.items.find(
        (item) =>
          item.lineType === "MANUAL_CHARGE" &&
          item.description.includes("Missing (pending return)"),
      );
      expect(missingChargeLine?.quantity).toBe(3);
      expect(missingChargeLine?.missingQuantity).toBe(3);
    });
  });

  describe("T34.2 missing-to-loss conversion beyond 100 dispatches", () => {
    it("mutates the return on dispatch index 0 and rebuilds lost charges when 101 completed dispatches exist", async () => {
      const fixture = seedPhase34Beyond100DispatchRollupFixtures({
        missingQuantity: 2,
        returnId: RETURN_ON_DISPATCH_101_ID,
        returnNumber: "RTN-DISPATCH-101-CONVERT",
      });

      dispatchRepository.seed(fixture.dispatches);
      returnRepository.seed([fixture.targetReturn]);
      rentalOrderRepository.seed([fixture.rentalOrder]);
      rentalInvoiceRepository.seed([
        buildDraftInvoiceWithMissingQuantity(2),
      ]);

      const service = new ConvertMissingToLossService(mockDeps);
      const result = await service.execute({ id: RENTAL_INVOICE_ID });

      const updatedReturn = await returnRepository.findByDispatchId(
        fixture.targetDispatch.id,
      );
      expect(updatedReturn).toHaveLength(1);
      expect(updatedReturn[0]?.items[0]?.missingQuantity).toBe(0);
      expect(updatedReturn[0]?.items[0]?.lostQuantity).toBe(2);

      const lostCharge = result.items.find(
        (item) => item.lineType === "LOST_ITEM_CHARGE",
      );
      expect(lostCharge?.quantity).toBe(2);
      expect(lostCharge?.lostQuantity).toBe(2);
      expect(lostCharge?.lineTotal).toBe(1000);

      const missingCharge = result.items.find(
        (item) =>
          item.lineType === "MANUAL_CHARGE" &&
          item.description.includes("Missing (pending return)"),
      );
      expect(missingCharge).toBeUndefined();
    });
  });
});
