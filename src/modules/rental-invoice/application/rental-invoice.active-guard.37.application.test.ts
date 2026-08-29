import { afterEach, describe, expect, it, vi } from "vitest";

const phase37Mocks = vi.hoisted(() => ({
  runWithRepositoryUnitOfWork: vi.fn(),
  createDispatchRepositoryFromUnitOfWork: vi.fn(),
  createReturnRepositoryFromUnitOfWork: vi.fn(),
  createRentalOrderRepositoryFromUnitOfWork: vi.fn(),
  createRentalInvoiceRepositoryFromUnitOfWork: vi.fn(),
  createProductRepositoryFromUnitOfWork: vi.fn(),
  createCustomerRepositoryFromUnitOfWork: vi.fn(),
}));

vi.mock("@/shared/infrastructure/database", () => ({
  runWithRepositoryUnitOfWork: phase37Mocks.runWithRepositoryUnitOfWork,
}));

vi.mock("@/modules/dispatch/infrastructure/factories/create-dispatch.repository", () => ({
  createDispatchRepositoryFromUnitOfWork:
    phase37Mocks.createDispatchRepositoryFromUnitOfWork,
}));

vi.mock("@/modules/return/infrastructure/factories/create-return.repository", () => ({
  createReturnRepositoryFromUnitOfWork:
    phase37Mocks.createReturnRepositoryFromUnitOfWork,
}));

vi.mock("@/modules/rental-order/infrastructure/factories/create-rental-order.repository", () => ({
  createRentalOrderRepositoryFromUnitOfWork:
    phase37Mocks.createRentalOrderRepositoryFromUnitOfWork,
}));

vi.mock(
  "@/modules/rental-invoice/infrastructure/factories/create-rental-invoice.repository",
  () => ({
    createRentalInvoiceRepositoryFromUnitOfWork:
      phase37Mocks.createRentalInvoiceRepositoryFromUnitOfWork,
  }),
);

vi.mock("@/modules/product/infrastructure/factories/create-product.repository", () => ({
  createProductRepositoryFromUnitOfWork:
    phase37Mocks.createProductRepositoryFromUnitOfWork,
}));

vi.mock("@/modules/customer/infrastructure/factories/create-customer.repository", () => ({
  createCustomerRepositoryFromUnitOfWork:
    phase37Mocks.createCustomerRepositoryFromUnitOfWork,
}));

import { createReplacementCost } from "@/modules/product/domain";
import { Product } from "@/modules/product/domain/product.entity";
import { buildCustomerEntity } from "@/modules/customer/tests/helpers/customer.fixtures";
import { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { buildProductEntity } from "@/modules/product/tests/helpers/product.fixtures";
import { InMemoryProductRepository } from "@/modules/product/tests/helpers/in-memory-product.repository";
import {
  resetInvoiceCommandLockForTests,
  runWithInvoiceCommandLockScope,
} from "@/modules/rental-order/infrastructure/invoice-command-lock";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { buildRentalOrderEntity } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { PRODUCT_ID, USER_ID } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { CreateRentalInvoiceService } from "@/modules/rental-invoice/application/services/create-rental-invoice.service";
import { GenerateRentalInvoiceFromOrderService } from "@/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service";
import { IssueRentalInvoiceService } from "@/modules/rental-invoice/application/services/issue-rental-invoice.service";
import { VoidRentalInvoiceService } from "@/modules/rental-invoice/application/services/void-rental-invoice.service";
import type { CreateRentalInvoiceInput } from "@/modules/rental-invoice/application/schemas/rental-invoice.schemas";
import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import {
  createCompletedRentalOrderLookup,
} from "@/modules/rental-invoice/tests/helpers/in-memory-rental-order-invoice.lookup";
import { MockAuditLogger } from "@/modules/rental-invoice/tests/helpers/mock-audit-logger";
import {
  buildCreateRentalInvoiceData,
  buildIssuedRentalInvoiceEntity,
  buildRentalInvoiceEntity,
  buildVoidRentalInvoiceEntity,
  OTHER_RENTAL_INVOICE_ID,
  RENTAL_INVOICE_ID,
  RENTAL_ORDER_ID,
  USER_ID as INVOICE_USER_ID,
  VALID_CREATE_INPUT,
} from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import { seedMinimalGenerateFromOrderFixtures } from "@/modules/rental-invoice/tests/helpers/phase-37-active-guard.fixtures";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "@/modules/rental-invoice/tests/helpers/transaction-test-runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { ProductId, RentalInvoiceId } from "@/shared/domain/ids";
import type { AuditEntry } from "@/shared/infrastructure/audit/audit-logger.interface";
import { ConflictError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import { InMemoryAccountRepository } from "@/modules/accounting/tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateRentalInvoiceInput;

class ThrowingAuditLogger extends MockAuditLogger {
  async log(_entry: AuditEntry): Promise<void> {
    throw new Error("Audit failure");
  }
}

function createLockedRentalOrderRepository(): InMemoryRentalOrderRepository {
  const rentalOrderRepository = new InMemoryRentalOrderRepository();
  rentalOrderRepository.seed([
    buildRentalOrderEntity({ status: "COMPLETED" }),
  ]);
  return rentalOrderRepository;
}

function createDirectCreateHarness(
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
  const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
  const rentalOrderRepository = createLockedRentalOrderRepository();
  const rentalOrderInvoiceLookup = createCompletedRentalOrderLookup();
  const customerRepository = new InMemoryCustomerRepository();
  customerRepository.seed([buildCustomerEntity()]);

  const transactionRunner = createPassThroughTransactionRunner({
    rentalInvoiceRepository,
    rentalOrderRepository,
    rentalOrderInvoiceLookup,
    customerRepository,
    accountRepository: new InMemoryAccountRepository(),
    journalEntryRepository: new InMemoryJournalEntryRepository(),
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId: INVOICE_USER_ID,
  });

  return {
    rentalInvoiceRepository,
    rentalOrderRepository,
    service: new CreateRentalInvoiceService(transactionRunner),
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

  phase37Mocks.runWithRepositoryUnitOfWork.mockImplementation(
    async (_deps, operation) =>
      operation({
        deps: mockDeps,
      } as Parameters<typeof operation>[0]),
  );
  phase37Mocks.createDispatchRepositoryFromUnitOfWork.mockReturnValue(
    dispatchRepository,
  );
  phase37Mocks.createReturnRepositoryFromUnitOfWork.mockReturnValue(
    returnRepository,
  );
  phase37Mocks.createRentalOrderRepositoryFromUnitOfWork.mockReturnValue(
    rentalOrderRepository,
  );
  phase37Mocks.createRentalInvoiceRepositoryFromUnitOfWork.mockReturnValue(
    rentalInvoiceRepository,
  );
  phase37Mocks.createProductRepositoryFromUnitOfWork.mockReturnValue(
    productRepository,
  );
  phase37Mocks.createCustomerRepositoryFromUnitOfWork.mockReturnValue(
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

async function countNonVoidInvoices(
  repository: InMemoryRentalInvoiceRepository,
): Promise<number> {
  const page = await repository.findPaged({
    page: 1,
    pageSize: 100,
    rentalOrderId: RENTAL_ORDER_ID,
    sortOrder: "desc",
  });
  return page.items.filter((invoice) => invoice.status !== "VOID").length;
}

describe("Phase 37 rental invoice active-guard integrity", () => {
  afterEach(() => {
    resetInvoiceCommandLockForTests();
    vi.clearAllMocks();
  });

  describe("T37.1 concurrent generate ×2", () => {
    it("creates exactly one active invoice under parallel generate", async () => {
      const fixture = seedMinimalGenerateFromOrderFixtures();
      const {
        dispatchRepository,
        returnRepository,
        rentalOrderRepository,
        rentalInvoiceRepository,
        service,
      } = setupGenerateHarness();

      dispatchRepository.seed([fixture.dispatch]);
      returnRepository.seed([fixture.completedReturn]);
      rentalOrderRepository.seed([fixture.rentalOrder]);

      const results = await Promise.allSettled([
        runWithInvoiceCommandLockScope(() =>
          service.execute({ rentalOrderId: RENTAL_ORDER_ID }),
        ),
        runWithInvoiceCommandLockScope(() =>
          service.execute({ rentalOrderId: RENTAL_ORDER_ID }),
        ),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.status === "rejected" &&
        rejected[0].reason).toBeInstanceOf(ConflictError);

      expect(await countNonVoidInvoices(rentalInvoiceRepository)).toBe(1);
    });
  });

  describe("T37.2 concurrent direct create ×2", () => {
    it("allows one success and one ConflictError", async () => {
      const { rentalInvoiceRepository, service } = createDirectCreateHarness();

      const results = await Promise.allSettled([
        runWithInvoiceCommandLockScope(() =>
          service.execute(VALID_CREATE_SERVICE_INPUT),
        ),
        runWithInvoiceCommandLockScope(() =>
          service.execute({
            ...VALID_CREATE_SERVICE_INPUT,
            invoiceNumber: "INV-2026-002",
          }),
        ),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.status === "rejected" &&
        rejected[0].reason).toBeInstanceOf(ConflictError);
      expect(await countNonVoidInvoices(rentalInvoiceRepository)).toBe(1);
    });
  });

  describe("T37.3 concurrent generate ∥ direct create", () => {
    it("preserves one-active invariant across paths", async () => {
      const fixture = seedMinimalGenerateFromOrderFixtures();
      const generateHarness = setupGenerateHarness();
      generateHarness.dispatchRepository.seed([fixture.dispatch]);
      generateHarness.returnRepository.seed([fixture.completedReturn]);
      generateHarness.rentalOrderRepository.seed([fixture.rentalOrder]);

      const directHarness = createDirectCreateHarness();
      phase37Mocks.createRentalInvoiceRepositoryFromUnitOfWork.mockReturnValue(
        directHarness.rentalInvoiceRepository,
      );

      const results = await Promise.allSettled([
        runWithInvoiceCommandLockScope(() =>
          generateHarness.service.execute({ rentalOrderId: RENTAL_ORDER_ID }),
        ),
        runWithInvoiceCommandLockScope(() =>
          directHarness.service.execute({
            ...VALID_CREATE_SERVICE_INPUT,
            invoiceNumber: "INV-2026-DIRECT",
          }),
        ),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.status === "rejected" &&
        rejected[0].reason).toBeInstanceOf(ConflictError);
      expect(await countNonVoidInvoices(directHarness.rentalInvoiceRepository)).toBe(
        1,
      );
    });
  });

  describe("T37.4 more than 10 invoices with active outside first page", () => {
    it("finds active ISSUED invoice and rejects second create", async () => {
      const { rentalInvoiceRepository, service } = createDirectCreateHarness();
      const voidInvoices = Array.from({ length: 10 }, (_, index) => {
        const created = RentalInvoice.create(
          buildCreateRentalInvoiceData({
            invoiceNumber: `INV-VOID-${index + 1}`,
          }),
        );
        const now = new Date(`2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`);

        return RentalInvoice.reconstitute({
          id: `aa0e8400-e29b-41d4-a716-4466554400${String(index).padStart(2, "0")}` as RentalInvoiceId,
          ...created,
          status: "VOID",
          voidedAt: now,
          items: created.items.map((item, itemIndex) => ({
            ...item,
            id: `void-${index}-item-${itemIndex}`,
          })),
          createdAt: now,
          updatedAt: now,
        });
      });

      const issued = buildIssuedRentalInvoiceEntity();
      const issuedProps = issued.toProps();
      const oldestIssued = RentalInvoice.reconstitute({
        ...issuedProps,
        id: OTHER_RENTAL_INVOICE_ID,
        invoiceNumber: "INV-OLD-ISSUED",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      rentalInvoiceRepository.seed([...voidInvoices, oldestIssued]);

      await expect(
        service.execute({
          ...VALID_CREATE_SERVICE_INPUT,
          invoiceNumber: "INV-2026-NEW",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("T37.5 active DRAFT blocks second create", () => {
    it("rejects create when DRAFT invoice exists", async () => {
      const { rentalInvoiceRepository, service } = createDirectCreateHarness();
      rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);

      await expect(
        service.execute({
          ...VALID_CREATE_SERVICE_INPUT,
          invoiceNumber: "INV-2026-002",
        }),
      ).rejects.toMatchObject({
        message: "An active invoice already exists for this rental order",
      });
    });
  });

  describe("T37.6 void frees rental order", () => {
    it("allows new invoice after voiding active invoice", async () => {
      const auditLogger = new MockAuditLogger();
      const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
      const rentalOrderRepository = createLockedRentalOrderRepository();
      const rentalOrderInvoiceLookup = createCompletedRentalOrderLookup();
      const customerRepository = new InMemoryCustomerRepository();
      customerRepository.seed([buildCustomerEntity()]);

      const transactionRunner = createPassThroughTransactionRunner({
        rentalInvoiceRepository,
        rentalOrderRepository,
        rentalOrderInvoiceLookup,
        customerRepository,
        accountRepository: new InMemoryAccountRepository(),
        journalEntryRepository: new InMemoryJournalEntryRepository(),
        auditLogger,
        ...mockNotificationWriteScopeDeps,
        userId: INVOICE_USER_ID,
      });

      rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
      const createService = new CreateRentalInvoiceService(transactionRunner);
      const voidInvoiceService = new VoidRentalInvoiceService(transactionRunner);

      await voidInvoiceService.execute({ id: RENTAL_INVOICE_ID });

      const created = await createService.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        invoiceNumber: "INV-2026-REPLACEMENT",
      });

      expect(created.status).toBe("DRAFT");
      expect(await countNonVoidInvoices(rentalInvoiceRepository)).toBe(1);
    });
  });

  describe("T37.7 multiple VOID invoices allow new active invoice", () => {
    it("creates a new active invoice when only VOID history exists", async () => {
      const { rentalInvoiceRepository, service } = createDirectCreateHarness();
      rentalInvoiceRepository.seed([
        buildVoidRentalInvoiceEntity(),
        RentalInvoice.reconstitute({
          ...buildVoidRentalInvoiceEntity().toProps(),
          id: OTHER_RENTAL_INVOICE_ID,
          invoiceNumber: "INV-2026-VOID-2",
        }),
      ]);

      const created = await service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        invoiceNumber: "INV-2026-NEW",
      });

      expect(created.status).toBe("DRAFT");
      expect(await countNonVoidInvoices(rentalInvoiceRepository)).toBe(1);
    });
  });

  describe("T37.8 audit failure rolls back create", () => {
    it("leaves no invoice when audit logging fails", async () => {
      const auditLogger = new ThrowingAuditLogger();
      const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
      const rentalOrderRepository = createLockedRentalOrderRepository();
      const rentalOrderInvoiceLookup = createCompletedRentalOrderLookup();
      const customerRepository = new InMemoryCustomerRepository();
      customerRepository.seed([buildCustomerEntity()]);

      const service = new CreateRentalInvoiceService(
        createRollbackTransactionRunner(
          rentalInvoiceRepository,
          rentalOrderRepository,
          rentalOrderInvoiceLookup,
          customerRepository,
          auditLogger,
          INVOICE_USER_ID,
        ),
      );

      await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toThrow(
        "Audit failure",
      );

      expect(rentalInvoiceRepository.count()).toBe(0);
      expect(auditLogger.entries).toHaveLength(0);
    });
  });

  describe("T37.9 issue regression on surviving invoice", () => {
    it("issues the invoice created under active-guard enforcement", async () => {
      const auditLogger = new MockAuditLogger();
      const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
      const rentalOrderRepository = createLockedRentalOrderRepository();
      const rentalOrderInvoiceLookup = createCompletedRentalOrderLookup();
      const customerRepository = new InMemoryCustomerRepository();
      customerRepository.seed([buildCustomerEntity()]);

      const transactionRunner = createPassThroughTransactionRunner({
        rentalInvoiceRepository,
        rentalOrderRepository,
        rentalOrderInvoiceLookup,
        customerRepository,
        accountRepository: new InMemoryAccountRepository(),
        journalEntryRepository: new InMemoryJournalEntryRepository(),
        auditLogger,
        ...mockNotificationWriteScopeDeps,
        userId: INVOICE_USER_ID,
      });

      const createService = new CreateRentalInvoiceService(transactionRunner);
      const issueService = new IssueRentalInvoiceService(transactionRunner);

      const created = await createService.execute(VALID_CREATE_SERVICE_INPUT);
      const issued = await issueService.execute({ id: created.id });

      expect(issued.status).toBe("ISSUED");
      expect(issued.issuedAt).not.toBeNull();
    });
  });
});
