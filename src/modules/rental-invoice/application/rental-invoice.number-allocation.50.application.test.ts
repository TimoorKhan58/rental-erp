import { describe, expect, it } from "vitest";

import { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import { buildCustomerEntity } from "@/modules/customer/tests/helpers/customer.fixtures";
import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import {
  buildInvoiceNumberPrefix,
  formatInvoiceNumberFromSequence,
  parseInvoiceNumberSequence,
} from "@/modules/rental-invoice/domain/rental-invoice-number.rules";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { buildRentalOrderEntity } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import type { RentalInvoiceId, RentalOrderId } from "@/shared/domain/ids";
import { ConflictError } from "@/shared/infrastructure/errors";

import { generateNextInvoiceNumber } from "./services/generate-invoice-number";
import { createRentalInvoiceInWriteScope } from "./services/create-rental-invoice-in-scope";
import {
  buildCreateRentalInvoiceData,
  RENTAL_ORDER_ID,
  USER_ID,
} from "../tests/helpers/rental-invoice.fixtures";
import { InMemoryRentalInvoiceRepository } from "../tests/helpers/in-memory-rental-invoice.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createRollbackTransactionRunner } from "../tests/helpers/transaction-test-runner";
import { InMemoryRentalOrderInvoiceLookup } from "../tests/helpers/in-memory-rental-order-invoice.lookup";
import { CUSTOMER_ID } from "../tests/helpers/rental-invoice.fixtures";
import { CreateRentalInvoiceService } from "./services/create-rental-invoice.service";
import type { CreateRentalInvoiceInput } from "./schemas/rental-invoice.schemas";

const REFERENCE_DATE = new Date("2026-06-15T12:00:00.000Z");
const PREFIX_2026 = buildInvoiceNumberPrefix(REFERENCE_DATE);
const PREFIX_2025 = buildInvoiceNumberPrefix(new Date("2025-12-01T00:00:00.000Z"));

function buildSeededInvoice(options: {
  sequence: number;
  prefix?: string;
  rentalOrderId?: RentalOrderId;
  status?: RentalInvoice["status"];
}): RentalInvoice {
  const prefix = options.prefix ?? PREFIX_2026;
  const created = RentalInvoice.create(
    buildCreateRentalInvoiceData({
      invoiceNumber: formatInvoiceNumberFromSequence(prefix, options.sequence),
      rentalOrderId: options.rentalOrderId ?? RENTAL_ORDER_ID,
    }),
  );
  const now = new Date("2026-01-15T10:00:00.000Z");

  return RentalInvoice.reconstitute({
    id: crypto.randomUUID() as RentalInvoiceId,
    ...created,
    status: options.status ?? "DRAFT",
    items: created.items.map((item, index) => ({
      ...item,
      id: `item-${options.sequence}-${index}`,
    })),
    createdAt: now,
    updatedAt: now,
  });
}

function seedSequenceRange(
  repository: InMemoryRentalInvoiceRepository,
  prefix: string,
  from: number,
  to: number,
): void {
  const invoices: RentalInvoice[] = [];

  for (let sequence = from; sequence <= to; sequence += 1) {
    invoices.push(
      buildSeededInvoice({
        sequence,
        prefix,
        rentalOrderId: crypto.randomUUID() as RentalOrderId,
      }),
    );
  }

  repository.seed(invoices);
}

async function legacyBoundedMaxSequence(
  repository: InMemoryRentalInvoiceRepository,
  prefix: string,
  pageSize = 500,
): Promise<number> {
  const page = await repository.findPaged({
    page: 1,
    pageSize,
    sortBy: "invoiceNumber",
    sortOrder: "desc",
  });

  let max = 0;

  for (const invoice of page.items) {
    const sequence = parseInvoiceNumberSequence(invoice.invoiceNumber, prefix);
    if (sequence !== null) {
      max = Math.max(max, sequence);
    }
  }

  return max;
}


async function allocateAndCommitInvoiceNumber(
  repository: InMemoryRentalInvoiceRepository,
  rentalOrderId: RentalOrderId,
  referenceDate: Date,
): Promise<string> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const invoiceNumber = await generateNextInvoiceNumber(repository, referenceDate);

    try {
      await repository.create(
        buildCreateRentalInvoiceData({
          invoiceNumber,
          rentalOrderId,
        }),
      );
      return invoiceNumber;
    } catch (error) {
      if (
        error instanceof ConflictError &&
        error.message === "Invoice number already exists"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to allocate invoice number");
}

class ThrowingAuditLogger extends MockAuditLogger {
  async log(): Promise<void> {
    throw new Error("Audit failure");
  }
}

describe("Phase 50 — F-33-01 invoice number monotonic allocation", () => {
  describe("T50.1 normal allocation", () => {
    it("returns the next sequence after the current max for the prefix", async () => {
      const repository = new InMemoryRentalInvoiceRepository();
      repository.seed([
        buildSeededInvoice({ sequence: 1 }),
        buildSeededInvoice({ sequence: 2 }),
      ]);

      await expect(
        generateNextInvoiceNumber(repository, REFERENCE_DATE),
      ).resolves.toBe("INV-2026-003");
    });
  });

  describe("T50.2 boundary beyond legacy 500-row scan", () => {
    it("findMaxSequence sees high sequences hidden from the legacy global scan window", async () => {
      const repository = new InMemoryRentalInvoiceRepository();
      const crowdingInvoices = Array.from({ length: 500 }, (_, index) =>
        buildSeededInvoice({
          sequence: index + 1,
          prefix: "INV-2027-",
          rentalOrderId: crypto.randomUUID() as RentalOrderId,
        }),
      );
      repository.seed([
        ...crowdingInvoices,
        buildSeededInvoice({ sequence: 550, prefix: PREFIX_2026 }),
      ]);

      const legacyMax = await legacyBoundedMaxSequence(repository, PREFIX_2026);
      const authoritativeMax =
        await repository.findMaxSequenceForInvoicePrefix(PREFIX_2026);

      expect(legacyMax).toBe(0);
      expect(authoritativeMax).toBe(550);
      await expect(
        generateNextInvoiceNumber(repository, REFERENCE_DATE),
      ).resolves.toBe("INV-2026-551");
    });

    it("allocates 551 when 550 invoices already exist for the same prefix", async () => {
      const repository = new InMemoryRentalInvoiceRepository();
      seedSequenceRange(repository, PREFIX_2026, 1, 550);

      await expect(
        generateNextInvoiceNumber(repository, REFERENCE_DATE),
      ).resolves.toBe("INV-2026-551");
    });
  });

  describe("T50.3 large invoice population", () => {
    it("remains correct with one thousand committed numbers for the prefix", async () => {
      const repository = new InMemoryRentalInvoiceRepository();
      seedSequenceRange(repository, PREFIX_2026, 1, 1000);

      await expect(
        generateNextInvoiceNumber(repository, REFERENCE_DATE),
      ).resolves.toBe("INV-2026-1001");
    });
  });

  describe("T50.4 existing gaps", () => {
    it("uses max-plus-one rather than filling gaps", async () => {
      const repository = new InMemoryRentalInvoiceRepository();
      repository.seed([
        buildSeededInvoice({ sequence: 1 }),
        buildSeededInvoice({ sequence: 10 }),
      ]);

      await expect(
        generateNextInvoiceNumber(repository, REFERENCE_DATE),
      ).resolves.toBe("INV-2026-011");
    });
  });

  describe("T50.5 concurrent invoice number allocation", () => {
    it("assigns unique numbers under parallel allocation with retry", async () => {
      const repository = new InMemoryRentalInvoiceRepository();
      seedSequenceRange(repository, PREFIX_2026, 1, 10);

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          allocateAndCommitInvoiceNumber(
            repository,
            crypto.randomUUID() as RentalOrderId,
            REFERENCE_DATE,
          ),
        ),
      );

      expect(new Set(results).size).toBe(5);
      expect(results.sort()).toEqual([
        "INV-2026-011",
        "INV-2026-012",
        "INV-2026-013",
        "INV-2026-014",
        "INV-2026-015",
      ]);
    });
  });

  describe("T50.6 transaction rollback", () => {
    it("does not consume a number when create rolls back after audit failure", async () => {
      const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
      const rollbackOrderId = crypto.randomUUID() as RentalOrderId;
      rentalInvoiceRepository.seed([
        buildSeededInvoice({
          sequence: 5,
          rentalOrderId: crypto.randomUUID() as RentalOrderId,
        }),
      ]);

      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildRentalOrderEntity({ id: rollbackOrderId, status: "COMPLETED" }),
      ]);

      const customerRepository = new InMemoryCustomerRepository();
      customerRepository.seed([buildCustomerEntity()]);

      const rentalOrderInvoiceLookup = new InMemoryRentalOrderInvoiceLookup();
      rentalOrderInvoiceLookup.seed([
        {
          id: rollbackOrderId,
          customerId: CUSTOMER_ID,
          status: "COMPLETED",
        },
      ]);

      const auditLogger = new ThrowingAuditLogger();
      const transactionRunner = createRollbackTransactionRunner(
        rentalInvoiceRepository,
        rentalOrderRepository,
        rentalOrderInvoiceLookup,
        customerRepository,
        auditLogger,
        USER_ID,
      );

      const service = new CreateRentalInvoiceService(transactionRunner);
      const input = {
        ...buildCreateRentalInvoiceData({
          invoiceNumber: "INV-2026-006",
          rentalOrderId: rollbackOrderId,
        }),
        invoiceDate: "2026-02-15T00:00:00.000Z",
        dueDate: "2026-03-15T00:00:00.000Z",
      } as unknown as CreateRentalInvoiceInput;

      await expect(service.execute(input)).rejects.toThrow("Audit failure");
      expect(await rentalInvoiceRepository.findByInvoiceNumber("INV-2026-006")).toBeNull();
      await expect(
        generateNextInvoiceNumber(rentalInvoiceRepository, REFERENCE_DATE),
      ).resolves.toBe("INV-2026-006");
    });
  });

  describe("T50.7 prefix / period scope", () => {
    it("scopes max sequence by calendar-year prefix", async () => {
      const repository = new InMemoryRentalInvoiceRepository();
      repository.seed([
        buildSeededInvoice({ sequence: 8, prefix: PREFIX_2025 }),
        buildSeededInvoice({ sequence: 12, prefix: PREFIX_2026 }),
      ]);

      await expect(
        generateNextInvoiceNumber(repository, REFERENCE_DATE),
      ).resolves.toBe("INV-2026-013");

      await expect(
        generateNextInvoiceNumber(repository, new Date("2025-06-01T00:00:00.000Z")),
      ).resolves.toBe("INV-2025-009");
    });
  });
});

describe("Phase 50 — create scope invoice-number conflict guard", () => {
  it("rejects duplicate invoice numbers before persistence", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildSeededInvoice({ sequence: 1 })]);

    const otherOrderId = crypto.randomUUID() as RentalOrderId;
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildRentalOrderEntity({
        id: otherOrderId,
        status: "COMPLETED",
      }),
    ]);

    await expect(
      createRentalInvoiceInWriteScope(
        {
          rentalInvoiceRepository,
          rentalOrderRepository,
          auditLogger: new MockAuditLogger(),
        },
        buildCreateRentalInvoiceData({
          invoiceNumber: "INV-2026-001",
          rentalOrderId: otherOrderId,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
