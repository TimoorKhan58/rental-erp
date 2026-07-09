import { describe, expect, it } from "vitest";

import { CreatePaymentService } from "@/modules/payment/application/services/create-payment.service";
import { GetPaymentByIdService } from "@/modules/payment/application/services/get-payment-by-id.service";
import { ListPaymentsService } from "@/modules/payment/application/services/list-payments.service";
import { PostPaymentService } from "@/modules/payment/application/services/post-payment.service";
import {
  PAYMENT_ENTITY_NAME,
  PAYMENT_MODULE,
} from "@/modules/payment/application/services/payment-service.constants";
import { UpdatePaymentService } from "@/modules/payment/application/services/update-payment.service";
import { VoidPaymentService } from "@/modules/payment/application/services/void-payment.service";
import type { CreatePaymentInput } from "@/modules/payment/application/schemas/payment.schemas";
import {
  RENTAL_INVOICE_ENTITY_NAME,
  RENTAL_INVOICE_MODULE,
} from "@/modules/rental-invoice/application/services/rental-invoice-service.constants";
import { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import {
  buildIssuedRentalInvoiceEntity,
  buildPartiallyPaidRentalInvoiceEntity,
  buildPaidRentalInvoiceEntity,
  buildRentalInvoiceEntity,
  buildVoidRentalInvoiceEntity,
  OTHER_CUSTOMER_ID,
  RENTAL_INVOICE_ID,
} from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import type { AuditEntry } from "@/shared/infrastructure/audit/audit-logger.interface";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";

import { InMemoryPaymentRepository } from "../tests/helpers/in-memory-payment.repository";
import {
  CUSTOMER_ID,
  OTHER_PAYMENT_ID,
  PAYMENT_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  buildPaymentEntity,
  buildPostedPaymentEntity,
  buildVoidPaymentEntity,
} from "../tests/helpers/payment.fixtures";
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
  paymentRepository: InMemoryPaymentRepository,
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    paymentRepository,
    rentalInvoiceRepository,
    auditLogger,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreatePaymentInput;

function createDefaultTestScope(
  auditLogger: MockAuditLogger = new MockAuditLogger(),
  userId: string | undefined = USER_ID,
) {
  const paymentRepository = new InMemoryPaymentRepository();
  const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
  rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);

  return {
    paymentRepository,
    rentalInvoiceRepository,
    auditLogger,
    transactionRunner: createWriteScope(
      paymentRepository,
      rentalInvoiceRepository,
      auditLogger,
      userId,
    ),
  };
}

describe("CreatePaymentService", () => {
  it("creates a payment and returns a DTO", async () => {
    const { transactionRunner, paymentRepository } = createDefaultTestScope();
    const service = new CreatePaymentService(transactionRunner);

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.paymentNumber).toBe("PAY-2026-001");
    expect(result.status).toBe("PENDING");
    expect(result.amount).toBe(100);
    expect(paymentRepository.count()).toBe(1);
  });

  it("rejects duplicate payment number", async () => {
    const { transactionRunner, paymentRepository } = createDefaultTestScope();
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new CreatePaymentService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid input", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreatePaymentService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        amount: 0,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("writes audit log on create", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner } = createDefaultTestScope(auditLogger);
    const service = new CreatePaymentService(transactionRunner);

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: PAYMENT_MODULE,
      entityName: PAYMENT_ENTITY_NAME,
      action: "CREATE",
    });
  });

  it("rejects when rental invoice does not exist", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([]);
    const service = new CreatePaymentService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects draft invoice", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const service = new CreatePaymentService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects void invoice", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildVoidRentalInvoiceEntity()]);
    const service = new CreatePaymentService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects customer mismatch with invoice", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreatePaymentService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        customerId: OTHER_CUSTOMER_ID,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects amount exceeding invoice balance", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreatePaymentService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        amount: 500,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("accepts partially paid invoice", async () => {
    const { transactionRunner, rentalInvoiceRepository } =
      createDefaultTestScope();
    rentalInvoiceRepository.seed([buildPartiallyPaidRentalInvoiceEntity(100)]);
    const service = new CreatePaymentService(transactionRunner);

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.status).toBe("PENDING");
  });

  it("rejects without user context", async () => {
    const auditLogger = new MockAuditLogger();
    const paymentRepository = new InMemoryPaymentRepository();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = new CreatePaymentService(
      createWriteScope(
        paymentRepository,
        rentalInvoiceRepository,
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
    const paymentRepository = new InMemoryPaymentRepository();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = new CreatePaymentService(
      createRollbackTransactionRunner(
        paymentRepository,
        rentalInvoiceRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toThrow("Audit failure");

    expect(paymentRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("UpdatePaymentService", () => {
  it("updates pending payment", async () => {
    const { transactionRunner, paymentRepository } = createDefaultTestScope();
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new UpdatePaymentService(transactionRunner);

    const result = await service.execute(
      { id: PAYMENT_ID },
      { notes: "Updated notes" },
    );

    expect(result.notes).toBe("Updated notes");
  });

  it("rejects update when not pending", async () => {
    const { transactionRunner, paymentRepository } = createDefaultTestScope();
    paymentRepository.seed([buildPostedPaymentEntity()]);
    const service = new UpdatePaymentService(transactionRunner);

    await expect(
      service.execute({ id: PAYMENT_ID }, { notes: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when payment does not exist", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new UpdatePaymentService(transactionRunner);

    await expect(
      service.execute({ id: PAYMENT_ID }, { notes: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on update", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, paymentRepository } =
      createDefaultTestScope(auditLogger);
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new UpdatePaymentService(transactionRunner);

    await service.execute({ id: PAYMENT_ID }, { notes: "Updated" });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
  });

  it("rejects amount exceeding invoice balance on update", async () => {
    const { transactionRunner, paymentRepository } = createDefaultTestScope();
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new UpdatePaymentService(transactionRunner);

    await expect(
      service.execute({ id: PAYMENT_ID }, { amount: 500 }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects invalid update input", async () => {
    const { transactionRunner, paymentRepository } = createDefaultTestScope();
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new UpdatePaymentService(transactionRunner);

    await expect(
      service.execute({ id: PAYMENT_ID }, {}),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rolls back update changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const paymentRepository = new InMemoryPaymentRepository();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new UpdatePaymentService(
      createRollbackTransactionRunner(
        paymentRepository,
        rentalInvoiceRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: PAYMENT_ID }, { notes: "Updated" }),
    ).rejects.toThrow("Audit failure");

    const payment = await paymentRepository.findById(PAYMENT_ID);
    expect(payment?.notes).toBe("Partial payment for invoice");
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("PostPaymentService", () => {
  it("posts pending payment and updates invoice", async () => {
    const { transactionRunner, paymentRepository, rentalInvoiceRepository } =
      createDefaultTestScope();
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new PostPaymentService(transactionRunner);

    const result = await service.execute({ id: PAYMENT_ID });

    expect(result.status).toBe("POSTED");
    expect(result.postedAt).not.toBeNull();

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(100);
    expect(invoice?.balance).toBe(250);
    expect(invoice?.status).toBe("PARTIALLY_PAID");
  });

  it("marks invoice as paid when full balance paid", async () => {
    const { transactionRunner, paymentRepository, rentalInvoiceRepository } =
      createDefaultTestScope();
    paymentRepository.seed([
      buildPaymentEntity({ amount: 350 }),
    ]);
    const service = new PostPaymentService(transactionRunner);

    await service.execute({ id: PAYMENT_ID });

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.status).toBe("PAID");
    expect(invoice?.balance).toBe(0);
  });

  it("rejects post when not pending", async () => {
    const { transactionRunner, paymentRepository } = createDefaultTestScope();
    paymentRepository.seed([buildPostedPaymentEntity()]);
    const service = new PostPaymentService(transactionRunner);

    await expect(
      service.execute({ id: PAYMENT_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when payment does not exist", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new PostPaymentService(transactionRunner);

    await expect(
      service.execute({ id: PAYMENT_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit logs for payment and invoice on post", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, paymentRepository } =
      createDefaultTestScope(auditLogger);
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new PostPaymentService(transactionRunner);

    await service.execute({ id: PAYMENT_ID });

    expect(auditLogger.entries).toHaveLength(2);
    expect(auditLogger.entries[0]).toMatchObject({
      module: PAYMENT_MODULE,
      entityName: PAYMENT_ENTITY_NAME,
      action: "PAYMENT_RECEIVED",
    });
    expect(auditLogger.entries[1]).toMatchObject({
      module: RENTAL_INVOICE_MODULE,
      entityName: RENTAL_INVOICE_ENTITY_NAME,
      action: "UPDATE",
    });
  });

  it("rejects post when invoice no longer eligible", async () => {
    const { transactionRunner, paymentRepository, rentalInvoiceRepository } =
      createDefaultTestScope();
    paymentRepository.seed([buildPaymentEntity()]);
    rentalInvoiceRepository.seed([buildPaidRentalInvoiceEntity()]);
    const service = new PostPaymentService(transactionRunner);

    await expect(
      service.execute({ id: PAYMENT_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rolls back post changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const paymentRepository = new InMemoryPaymentRepository();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new PostPaymentService(
      createRollbackTransactionRunner(
        paymentRepository,
        rentalInvoiceRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: PAYMENT_ID }),
    ).rejects.toThrow("Audit failure");

    const payment = await paymentRepository.findById(PAYMENT_ID);
    expect(payment?.status).toBe("PENDING");

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("VoidPaymentService", () => {
  it("voids pending payment without invoice change", async () => {
    const { transactionRunner, paymentRepository, rentalInvoiceRepository } =
      createDefaultTestScope();
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new VoidPaymentService(transactionRunner);

    const result = await service.execute({ id: PAYMENT_ID });

    expect(result.status).toBe("VOID");
    expect(result.voidedAt).not.toBeNull();

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(0);
    expect(invoice?.balance).toBe(350);
  });

  it("voids posted payment and reverses invoice", async () => {
    const { transactionRunner, paymentRepository, rentalInvoiceRepository } =
      createDefaultTestScope();
    const posted = buildPostedPaymentEntity();
    paymentRepository.seed([posted]);
    rentalInvoiceRepository.seed([
      buildPartiallyPaidRentalInvoiceEntity(posted.amount),
    ]);
    const service = new VoidPaymentService(transactionRunner);

    const result = await service.execute({ id: PAYMENT_ID });

    expect(result.status).toBe("VOID");

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(0);
    expect(invoice?.balance).toBe(350);
    expect(invoice?.status).toBe("ISSUED");
  });

  it("rejects void when already void", async () => {
    const { transactionRunner, paymentRepository } = createDefaultTestScope();
    paymentRepository.seed([buildVoidPaymentEntity()]);
    const service = new VoidPaymentService(transactionRunner);

    await expect(
      service.execute({ id: PAYMENT_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when payment does not exist", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new VoidPaymentService(transactionRunner);

    await expect(
      service.execute({ id: PAYMENT_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on void pending payment", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, paymentRepository } =
      createDefaultTestScope(auditLogger);
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new VoidPaymentService(transactionRunner);

    await service.execute({ id: PAYMENT_ID });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: PAYMENT_MODULE,
      action: "CANCEL",
    });
  });

  it("writes audit logs for payment and invoice on void posted", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, paymentRepository, rentalInvoiceRepository } =
      createDefaultTestScope(auditLogger);
    const posted = buildPostedPaymentEntity();
    paymentRepository.seed([posted]);
    rentalInvoiceRepository.seed([
      buildPartiallyPaidRentalInvoiceEntity(posted.amount),
    ]);
    const service = new VoidPaymentService(transactionRunner);

    await service.execute({ id: PAYMENT_ID });

    expect(auditLogger.entries).toHaveLength(2);
    expect(auditLogger.entries[0]).toMatchObject({
      module: RENTAL_INVOICE_MODULE,
      action: "UPDATE",
    });
    expect(auditLogger.entries[1]).toMatchObject({
      module: PAYMENT_MODULE,
      action: "CANCEL",
    });
  });

  it("rolls back void changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const paymentRepository = new InMemoryPaymentRepository();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new VoidPaymentService(
      createRollbackTransactionRunner(
        paymentRepository,
        rentalInvoiceRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: PAYMENT_ID }),
    ).rejects.toThrow("Audit failure");

    const payment = await paymentRepository.findById(PAYMENT_ID);
    expect(payment?.status).toBe("PENDING");
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("GetPaymentByIdService", () => {
  it("returns payment DTO by id", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new GetPaymentByIdService(paymentRepository);

    const result = await service.execute({ id: PAYMENT_ID });

    expect(result.id).toBe(PAYMENT_ID);
    expect(result.paymentNumber).toBe("PAY-2026-001");
  });

  it("throws when payment does not exist", async () => {
    const service = new GetPaymentByIdService(new InMemoryPaymentRepository());

    await expect(
      service.execute({ id: PAYMENT_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ListPaymentsService", () => {
  it("returns paginated payment DTOs", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPaymentEntity(),
      buildPaymentEntity({ id: OTHER_PAYMENT_ID }),
    ]);
    const service = new ListPaymentsService(paymentRepository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it("filters by status", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPaymentEntity(),
      buildPostedPaymentEntity(),
    ]);
    const service = new ListPaymentsService(paymentRepository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "POSTED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("POSTED");
  });

  it("filters by customer id", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPaymentEntity()]);
    const service = new ListPaymentsService(paymentRepository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      customerId: CUSTOMER_ID,
    });

    expect(result.items).toHaveLength(1);
  });
});
