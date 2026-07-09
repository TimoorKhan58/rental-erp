import { describe, expect, it } from "vitest";

import { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import { buildCustomerEntity } from "@/modules/customer/tests/helpers/customer.fixtures";
import { CreateRentalInvoiceService } from "@/modules/rental-invoice/application/services/create-rental-invoice.service";
import { GetRentalInvoiceByIdService } from "@/modules/rental-invoice/application/services/get-rental-invoice-by-id.service";
import { IssueRentalInvoiceService } from "@/modules/rental-invoice/application/services/issue-rental-invoice.service";
import { ListRentalInvoicesService } from "@/modules/rental-invoice/application/services/list-rental-invoices.service";
import {
  RENTAL_INVOICE_ENTITY_NAME,
  RENTAL_INVOICE_MODULE,
} from "@/modules/rental-invoice/application/services/rental-invoice-service.constants";
import { UpdateRentalInvoiceService } from "@/modules/rental-invoice/application/services/update-rental-invoice.service";
import { VoidRentalInvoiceService } from "@/modules/rental-invoice/application/services/void-rental-invoice.service";
import type { CreateRentalInvoiceInput } from "@/modules/rental-invoice/application/schemas/rental-invoice.schemas";
import type { AuditEntry } from "@/shared/infrastructure/audit/audit-logger.interface";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";

import {
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
  OTHER_RENTAL_INVOICE_ID,
  OTHER_RENTAL_ORDER_ID,
  RENTAL_INVOICE_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  buildIssuedRentalInvoiceEntity,
  buildPaidRentalInvoiceEntity,
  buildRentalInvoiceEntity,
  buildVoidRentalInvoiceEntity,
} from "../tests/helpers/rental-invoice.fixtures";
import { InMemoryRentalInvoiceRepository } from "../tests/helpers/in-memory-rental-invoice.repository";
import {
  createCompletedRentalOrderLookup,
  InMemoryRentalOrderInvoiceLookup,
} from "../tests/helpers/in-memory-rental-order-invoice.lookup";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

class ThrowingAuditLogger extends MockAuditLogger {
  async log(_entry: AuditEntry): Promise<void> {
    throw new Error("Audit failure");
  }
}

function createWriteScope(
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  rentalOrderInvoiceLookup: InMemoryRentalOrderInvoiceLookup,
  customerRepository: InMemoryCustomerRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    rentalInvoiceRepository,
    rentalOrderInvoiceLookup,
    customerRepository,
    auditLogger,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateRentalInvoiceInput;

function createDefaultTestScope(
  auditLogger: MockAuditLogger = new MockAuditLogger(),
  userId: string | undefined = USER_ID,
) {
  const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
  const rentalOrderInvoiceLookup = createCompletedRentalOrderLookup();
  const customerRepository = new InMemoryCustomerRepository();
  customerRepository.seed([buildCustomerEntity()]);

  return {
    rentalInvoiceRepository,
    rentalOrderInvoiceLookup,
    customerRepository,
    auditLogger,
    transactionRunner: createWriteScope(
      rentalInvoiceRepository,
      rentalOrderInvoiceLookup,
      customerRepository,
      auditLogger,
      userId,
    ),
  };
}

describe("CreateRentalInvoiceService", () => {
  it("creates a rental invoice and returns a DTO", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    const service = new CreateRentalInvoiceService(transactionRunner);

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.invoiceNumber).toBe("INV-2026-001");
    expect(result.status).toBe("DRAFT");
    expect(result.grandTotal).toBe(350);
    expect(rentalInvoiceRepository.count()).toBe(1);
  });

  it("rejects duplicate invoice number", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const service = new CreateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid input", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        items: [
          {
            lineType: "RENTAL_CHARGE",
            description: "Rental",
            quantity: 0,
            unitPrice: 100,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("writes audit log on create", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner } = createDefaultTestScope(auditLogger);
    const service = new CreateRentalInvoiceService(transactionRunner);

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: RENTAL_INVOICE_MODULE,
      entityName: RENTAL_INVOICE_ENTITY_NAME,
      action: "CREATE",
    });
  });

  it("rejects when rental order does not exist", async () => {
    const { transactionRunner, rentalOrderInvoiceLookup } =
      createDefaultTestScope();
    rentalOrderInvoiceLookup.seed([]);
    const service = new CreateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects when rental order is not completed", async () => {
    const { transactionRunner, rentalOrderInvoiceLookup } =
      createDefaultTestScope();
    rentalOrderInvoiceLookup.seed([
      {
        id: RENTAL_ORDER_ID,
        customerId: CUSTOMER_ID,
        status: "ACTIVE",
      },
    ]);
    const service = new CreateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects customer mismatch with rental order", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        customerId: OTHER_CUSTOMER_ID,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects when customer does not exist", async () => {
    const { transactionRunner, customerRepository } = createDefaultTestScope();
    customerRepository.seed([]);
    const service = new CreateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects inactive customer", async () => {
    const { transactionRunner, customerRepository } = createDefaultTestScope();
    customerRepository.seed([buildCustomerEntity({ isActive: false })]);
    const service = new CreateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects without user context", async () => {
    const auditLogger = new MockAuditLogger();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    const rentalOrderInvoiceLookup = createCompletedRentalOrderLookup();
    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.seed([buildCustomerEntity()]);
    const service = new CreateRentalInvoiceService(
      createWriteScope(
        rentalInvoiceRepository,
        rentalOrderInvoiceLookup,
        customerRepository,
        auditLogger,
        undefined,
      ),
    );

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rolls back create changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    const rentalOrderInvoiceLookup = createCompletedRentalOrderLookup();
    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.seed([buildCustomerEntity()]);
    const service = new CreateRentalInvoiceService(
      createRollbackTransactionRunner(
        rentalInvoiceRepository,
        rentalOrderInvoiceLookup,
        customerRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toThrow("Audit failure");

    expect(rentalInvoiceRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("UpdateRentalInvoiceService", () => {
  it("updates draft rental invoice", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const service = new UpdateRentalInvoiceService(transactionRunner);

    const result = await service.execute(
      { id: RENTAL_INVOICE_ID },
      { notes: "Updated notes" },
    );

    expect(result.notes).toBe("Updated notes");
  });

  it("rejects update when not draft", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = new UpdateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }, { notes: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when rental invoice does not exist", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new UpdateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }, { notes: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on update", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope(auditLogger);
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const service = new UpdateRentalInvoiceService(transactionRunner);

    await service.execute({ id: RENTAL_INVOICE_ID }, { notes: "Updated" });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
  });

  it("rejects invalid items on update", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const service = new UpdateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute(
        { id: RENTAL_INVOICE_ID },
        {
          items: [
            {
              lineType: "RENTAL_CHARGE",
              description: "Rental",
              quantity: 0,
              unitPrice: 100,
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rolls back update changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.seed([buildCustomerEntity()]);
    const service = new UpdateRentalInvoiceService(
      createRollbackTransactionRunner(
        rentalInvoiceRepository,
        createCompletedRentalOrderLookup(),
        customerRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }, { notes: "Updated" }),
    ).rejects.toThrow("Audit failure");

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.notes).toBe("Rental invoice for completed order");
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("IssueRentalInvoiceService", () => {
  it("issues draft rental invoice", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const service = new IssueRentalInvoiceService(transactionRunner);

    const result = await service.execute({ id: RENTAL_INVOICE_ID });

    expect(result.status).toBe("ISSUED");
    expect(result.issuedAt).not.toBeNull();
  });

  it("rejects issue when not draft", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = new IssueRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when rental invoice does not exist", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new IssueRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on issue", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope(auditLogger);
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const service = new IssueRentalInvoiceService(transactionRunner);

    await service.execute({ id: RENTAL_INVOICE_ID });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("APPROVE");
  });

  it("rolls back issue changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.seed([buildCustomerEntity()]);
    const service = new IssueRentalInvoiceService(
      createRollbackTransactionRunner(
        rentalInvoiceRepository,
        createCompletedRentalOrderLookup(),
        customerRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toThrow("Audit failure");

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.status).toBe("DRAFT");
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("VoidRentalInvoiceService", () => {
  it("voids issued rental invoice", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = new VoidRentalInvoiceService(transactionRunner);

    const result = await service.execute({ id: RENTAL_INVOICE_ID });

    expect(result.status).toBe("VOID");
    expect(result.voidedAt).not.toBeNull();
  });

  it("rejects void when paid", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildPaidRentalInvoiceEntity()]);
    const service = new VoidRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects void when already void", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildVoidRentalInvoiceEntity()]);
    const service = new VoidRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when rental invoice does not exist", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new VoidRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on void", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope(auditLogger);
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = new VoidRentalInvoiceService(transactionRunner);

    await service.execute({ id: RENTAL_INVOICE_ID });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CANCEL");
  });

  it("rolls back void changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.seed([buildCustomerEntity()]);
    const service = new VoidRentalInvoiceService(
      createRollbackTransactionRunner(
        rentalInvoiceRepository,
        createCompletedRentalOrderLookup(),
        customerRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toThrow("Audit failure");

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.status).toBe("ISSUED");
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("GetRentalInvoiceByIdService", () => {
  it("returns rental invoice by id", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([buildRentalInvoiceEntity()]);
    const service = new GetRentalInvoiceByIdService(repository);

    const result = await service.execute({ id: RENTAL_INVOICE_ID });

    expect(result.id).toBe(RENTAL_INVOICE_ID);
  });

  it("throws when rental invoice does not exist", async () => {
    const service = new GetRentalInvoiceByIdService(
      new InMemoryRentalInvoiceRepository(),
    );

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ListRentalInvoicesService", () => {
  it("returns paginated rental invoices", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([
      buildRentalInvoiceEntity(),
      buildRentalInvoiceEntity({
        id: OTHER_RENTAL_INVOICE_ID,
        rentalOrderId: OTHER_RENTAL_ORDER_ID,
      }),
    ]);
    const service = new ListRentalInvoicesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
  });

  it("filters by status", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([
      buildRentalInvoiceEntity(),
      buildIssuedRentalInvoiceEntity(),
    ]);
    const service = new ListRentalInvoicesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "ISSUED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("ISSUED");
  });

  it("filters by customer id", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([buildRentalInvoiceEntity()]);
    const service = new ListRentalInvoicesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      customerId: CUSTOMER_ID,
    });

    expect(result.items).toHaveLength(1);
  });
});

describe("CreateRentalInvoiceService domain validation", () => {
  it("rejects empty items before persistence", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreateRentalInvoiceService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        items: [],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
