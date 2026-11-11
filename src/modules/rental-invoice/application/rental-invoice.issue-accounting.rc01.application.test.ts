import { describe, expect, it } from "vitest";

import { DEFAULT_ACCOUNT_CODES } from "@/modules/accounting/domain/default-account-codes.constants";
import type { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import { buildAccountEntity } from "@/modules/accounting/tests/helpers/account.fixtures";
import { InMemoryAccountRepository } from "@/modules/accounting/tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import { FailingJournalEntryRepository } from "@/modules/expense/tests/helpers/failing-journal-entry.repository";
import { GetProfitLossService } from "@/modules/financial-report/application/services/get-profit-loss.service";
import type { FixtureJournal } from "@/modules/financial-report/tests/helpers/financial-report.fixtures";
import { InMemoryFinancialReportRepository } from "@/modules/financial-report/tests/helpers/in-memory-financial-report.repository";
import { PostPaymentService } from "@/modules/payment/application/services/post-payment.service";
import { InMemoryPaymentRepository } from "@/modules/payment/tests/helpers/in-memory-payment.repository";
import {
  PAYMENT_ID,
  buildPaymentEntity,
} from "@/modules/payment/tests/helpers/payment.fixtures";
import { createPassThroughTransactionRunner as createPaymentTransactionRunner } from "@/modules/payment/tests/helpers/transaction-test-runner";
import { IssueRentalInvoiceService } from "@/modules/rental-invoice/application/services/issue-rental-invoice.service";
import { buildCustomerEntity } from "@/modules/customer/tests/helpers/customer.fixtures";
import { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import { buildRentalOrderEntity } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type { AccountId } from "@/shared/domain/ids";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import {
  RENTAL_INVOICE_ID,
  USER_ID,
  buildRentalInvoiceEntity,
} from "../tests/helpers/rental-invoice.fixtures";
import { InMemoryRentalInvoiceRepository } from "../tests/helpers/in-memory-rental-invoice.repository";
import { createCompletedRentalOrderLookup } from "../tests/helpers/in-memory-rental-order-invoice.lookup";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

const AR_ACCOUNT_ID =
  "bb0e8400-e29b-41d4-a716-446655440010" as AccountId;
const REVENUE_ACCOUNT_ID =
  "bb0e8400-e29b-41d4-a716-446655440011" as AccountId;
const CASH_ACCOUNT_ID =
  "bb0e8400-e29b-41d4-a716-446655440012" as AccountId;

function seedOperationalAccounts(
  accountRepository: InMemoryAccountRepository,
): void {
  accountRepository.seed([
    buildAccountEntity({
      id: CASH_ACCOUNT_ID,
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
      name: "Cash",
      accountType: "ASSET",
    }),
    buildAccountEntity({
      id: AR_ACCOUNT_ID,
      accountCode: DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
      name: "Accounts Receivable",
      accountType: "ASSET",
    }),
    buildAccountEntity({
      id: REVENUE_ACCOUNT_ID,
      accountCode: DEFAULT_ACCOUNT_CODES.RENTAL_REVENUE,
      name: "Rental Revenue",
      accountType: "INCOME",
    }),
  ]);
}

function createLockedRentalOrderRepository(): InMemoryRentalOrderRepository {
  const rentalOrderRepository = new InMemoryRentalOrderRepository();
  rentalOrderRepository.seed([
    buildRentalOrderEntity({ status: "COMPLETED" }),
  ]);
  return rentalOrderRepository;
}

function createAccountingIssueScope(
  journalEntryRepository:
    | InMemoryJournalEntryRepository
    | FailingJournalEntryRepository = new InMemoryJournalEntryRepository(),
) {
  const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
  const rentalOrderRepository = createLockedRentalOrderRepository();
  const rentalOrderInvoiceLookup = createCompletedRentalOrderLookup();
  const customerRepository = new InMemoryCustomerRepository();
  customerRepository.seed([buildCustomerEntity()]);
  const accountRepository = new InMemoryAccountRepository();
  seedOperationalAccounts(accountRepository);
  const auditLogger = new MockAuditLogger();

  const transactionRunner = createPassThroughTransactionRunner({
    rentalInvoiceRepository,
    paymentRepository: new InMemoryPaymentRepository(),
    rentalOrderRepository,
    rentalOrderInvoiceLookup,
    customerRepository,
    accountRepository,
    journalEntryRepository,
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  });

  return {
    rentalInvoiceRepository,
    accountRepository,
    journalEntryRepository,
    transactionRunner,
    auditLogger,
    rentalOrderRepository,
    rentalOrderInvoiceLookup,
    customerRepository,
  };
}

function journalEntryToFixture(entry: JournalEntry): FixtureJournal {
  const props = entry.toProps();

  return {
    id: props.id,
    journalNumber: props.journalNumber,
    journalDate: props.journalDate,
    description: props.description,
    referenceType: props.referenceType,
    referenceId: props.referenceId,
    status: props.status,
    createdAt: props.createdAt,
    lines: props.lines.map((line, index) => ({
      id: line.id ?? `line-${index + 1}`,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
      sortOrder: line.sortOrder,
    })),
  };
}

function fixtureAccountsForProfitLoss() {
  return [
    {
      id: CASH_ACCOUNT_ID,
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
      name: "Cash",
      accountType: "ASSET" as const,
      isActive: true,
    },
    {
      id: AR_ACCOUNT_ID,
      accountCode: DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
      name: "Accounts Receivable",
      accountType: "ASSET" as const,
      isActive: true,
    },
    {
      id: REVENUE_ACCOUNT_ID,
      accountCode: DEFAULT_ACCOUNT_CODES.RENTAL_REVENUE,
      name: "Rental Revenue",
      accountType: "INCOME" as const,
      isActive: true,
    },
  ];
}

describe("RC-01 — rental invoice issue accounting", () => {
  it("T-RC01.1 issue posts rental invoice journal (DR AR / CR revenue)", async () => {
    const {
      rentalInvoiceRepository,
      journalEntryRepository,
      transactionRunner,
    } = createAccountingIssueScope();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const draft = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(draft?.grandTotal).toBe(350);

    const service = new IssueRentalInvoiceService(transactionRunner);
    const result = await service.execute({ id: RENTAL_INVOICE_ID });

    expect(result.status).toBe("ISSUED");

    const journals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "RENTAL_INVOICE",
      referenceId: RENTAL_INVOICE_ID,
    });

    expect(journals.items).toHaveLength(1);
    const journal = journals.items[0]!;
    expect(journal.status).toBe("POSTED");
    expect(journal.referenceType).toBe("RENTAL_INVOICE");
    expect(journal.referenceId).toBe(RENTAL_INVOICE_ID);
    expect(journal.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: AR_ACCOUNT_ID,
          debit: 350,
          credit: 0,
        }),
        expect.objectContaining({
          accountId: REVENUE_ACCOUNT_ID,
          debit: 0,
          credit: 350,
        }),
      ]),
    );
  });

  it("T-RC01.2 re-issue does not duplicate rental invoice journal", async () => {
    const { rentalInvoiceRepository, journalEntryRepository, transactionRunner } =
      createAccountingIssueScope();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const service = new IssueRentalInvoiceService(transactionRunner);

    await service.execute({ id: RENTAL_INVOICE_ID });

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const journals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "RENTAL_INVOICE",
      referenceId: RENTAL_INVOICE_ID,
    });

    expect(journals.items).toHaveLength(1);
  });

  it("T-RC01.3 issue then payment posts AR revenue and cash settlement journals", async () => {
    const {
      rentalInvoiceRepository,
      journalEntryRepository,
      transactionRunner,
      accountRepository,
    } = createAccountingIssueScope();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);

    await new IssueRentalInvoiceService(transactionRunner).execute({
      id: RENTAL_INVOICE_ID,
    });

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPaymentEntity()]);

    const paymentRunner = createPaymentTransactionRunner({
      paymentRepository,
      rentalInvoiceRepository,
      accountRepository,
      journalEntryRepository,
      auditLogger: new MockAuditLogger(),
      ...mockNotificationWriteScopeDeps,
      userId: USER_ID,
    });

    await new PostPaymentService(paymentRunner).execute({ id: PAYMENT_ID });

    const invoiceJournals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "RENTAL_INVOICE",
      referenceId: RENTAL_INVOICE_ID,
    });
    const paymentJournals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "PAYMENT",
      referenceId: PAYMENT_ID,
    });

    expect(invoiceJournals.items).toHaveLength(1);
    expect(invoiceJournals.items[0]?.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: AR_ACCOUNT_ID, debit: 350, credit: 0 }),
        expect.objectContaining({
          accountId: REVENUE_ACCOUNT_ID,
          debit: 0,
          credit: 350,
        }),
      ]),
    );

    expect(paymentJournals.items).toHaveLength(1);
    expect(paymentJournals.items[0]?.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: CASH_ACCOUNT_ID, debit: 100, credit: 0 }),
        expect.objectContaining({ accountId: AR_ACCOUNT_ID, debit: 0, credit: 100 }),
      ]),
    );
  });

  it("T-RC01.4 profit and loss includes rental revenue after issue journal", async () => {
    const { rentalInvoiceRepository, journalEntryRepository, transactionRunner } =
      createAccountingIssueScope();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);

    await new IssueRentalInvoiceService(transactionRunner).execute({
      id: RENTAL_INVOICE_ID,
    });

    const invoiceJournal = (
      await journalEntryRepository.findPaged({
        page: 1,
        pageSize: 10,
        referenceType: "RENTAL_INVOICE",
        referenceId: RENTAL_INVOICE_ID,
      })
    ).items[0]!;

    const financialReportRepository = new InMemoryFinancialReportRepository();
    financialReportRepository.seed({
      accounts: fixtureAccountsForProfitLoss(),
      journals: [journalEntryToFixture(invoiceJournal)],
    });

    const profitLoss = await new GetProfitLossService(
      financialReportRepository,
    ).execute({});

    expect(profitLoss.totalRevenue).toBe(350);
    expect(profitLoss.revenue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: REVENUE_ACCOUNT_ID,
          accountCode: DEFAULT_ACCOUNT_CODES.RENTAL_REVENUE,
          amount: 350,
        }),
      ]),
    );
  });

  it("T-RC01.5 journal posting failure rolls back issued invoice state", async () => {
    const journalEntryRepository = new FailingJournalEntryRepository();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const rentalOrderRepository = createLockedRentalOrderRepository();
    const rentalOrderInvoiceLookup = createCompletedRentalOrderLookup();
    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.seed([buildCustomerEntity()]);
    const accountRepository = new InMemoryAccountRepository();
    seedOperationalAccounts(accountRepository);
    const auditLogger = new MockAuditLogger();

    const service = new IssueRentalInvoiceService(
      createRollbackTransactionRunner(
        rentalInvoiceRepository,
        rentalOrderRepository,
        rentalOrderInvoiceLookup,
        customerRepository,
        auditLogger,
        USER_ID,
        new InMemoryPaymentRepository(),
        accountRepository,
        journalEntryRepository,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toThrow("Simulated accounting failure");

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.status).toBe("DRAFT");
    expect(auditLogger.entries).toHaveLength(0);

    const journals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "RENTAL_INVOICE",
      referenceId: RENTAL_INVOICE_ID,
    });
    expect(journals.items).toHaveLength(0);
  });
});
