/**
 * Catch up the accounting books with what already happened in the business
 * (2026-11-19 accounting audit).
 *
 * Adds the missing automatic entries for past records, each on the record's
 * own date, and takes voided documents out of the books:
 *   - issued / paid invoices, posted customer payments, paid expenses
 *   - received purchase orders, posted supplier payments
 *   - returned hire-ins (cost) and what has been paid on them
 * Safe to run more than once: anything already in the books is left alone.
 *
 * Usage (from rental-erp/), dry run first:
 *   DATABASE_URL=... BUSINESS=mt-service npx tsx scripts/accounting/catch-up-books.ts
 *   DATABASE_URL=... BUSINESS=mt-service APPLY=1 npx tsx scripts/accounting/catch-up-books.ts
 * BUSINESS=all runs every business. Take a backup before APPLY=1.
 */
import "dotenv/config";

import {
  postExpensePaidJournal,
  postHireInCostJournal,
  postHireInPaymentJournal,
  postPaymentReceivedJournal,
  postPurchaseReceivedJournal,
  postRentalInvoiceIssuedJournal,
  postSupplierPaymentJournal,
  voidOperationalJournals,
  type OperationalJournalPostingDeps,
} from "../../src/modules/accounting/application/services/operational-journal-posting.service";
import { createAccountRepositoryFromUnitOfWork } from "../../src/modules/accounting/infrastructure/factories/create-account.repository";
import { createJournalEntryRepositoryFromUnitOfWork } from "../../src/modules/accounting/infrastructure/factories/create-journal-entry.repository";
import prisma from "../../src/lib/prisma";
import type { UserId } from "../../src/shared/domain/ids";
import { runWithRepositoryUnitOfWork } from "../../src/shared/infrastructure/database/repository/unit-of-work/run-with-repository-unit-of-work";
import { createSharedDeps } from "../../src/shared/infrastructure/di/shared-deps";
import { runAsSystem, runInOrganization } from "../../src/shared/infrastructure/tenancy/organization-scope";

const APPLY = process.env.APPLY === "1";
const BUSINESS = process.env.BUSINESS?.trim();
const money = (value: unknown) => Number(String(value ?? 0));
const fmt = (value: number) => value.toLocaleString("en-PK", { maximumFractionDigits: 2 });

type Plan = {
  label: string;
  amount: number;
  run: (deps: OperationalJournalPostingDeps, tx: typeof prisma) => Promise<unknown>;
};

async function hasActiveJournal(db: typeof prisma, referenceType: string, referenceId: string) {
  return (
    (await db.journalEntry.count({
      where: { referenceType: referenceType as never, referenceId, status: { not: "VOID" } },
    })) > 0
  );
}

async function planFor(db: typeof prisma): Promise<{ plans: Plan[]; voids: Array<{ label: string; type: string; id: string }> }> {
  const plans: Plan[] = [];
  const voids: Array<{ label: string; type: string; id: string }> = [];

  for (const invoice of await db.rentalInvoice.findMany({ orderBy: { invoiceDate: "asc" } })) {
    const live = ["ISSUED", "PARTIALLY_PAID", "PAID"].includes(invoice.status);
    const posted = await hasActiveJournal(db, "RENTAL_INVOICE", invoice.id);
    if (live && !posted) {
      plans.push({
        label: `invoice ${invoice.invoiceNumber}`,
        amount: money(invoice.grandTotal),
        run: (deps) => postRentalInvoiceIssuedJournal(deps, { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, invoiceDate: invoice.invoiceDate, amount: money(invoice.grandTotal) }),
      });
    }
    if (invoice.status === "VOID" && posted) voids.push({ label: `voided invoice ${invoice.invoiceNumber}`, type: "RENTAL_INVOICE", id: invoice.id });
  }

  for (const payment of await db.payment.findMany({ orderBy: { paymentDate: "asc" } })) {
    const posted = await hasActiveJournal(db, "PAYMENT", payment.id);
    if (payment.status === "POSTED" && !posted) {
      plans.push({
        label: `customer payment ${payment.paymentNumber} (${payment.paymentMethod})`,
        amount: money(payment.amount),
        run: (deps) => postPaymentReceivedJournal(deps, { paymentId: payment.id, paymentNumber: payment.paymentNumber, paymentDate: payment.paymentDate, amount: money(payment.amount), paymentMethod: payment.paymentMethod }),
      });
    }
    if (payment.status === "VOID" && posted) voids.push({ label: `voided payment ${payment.paymentNumber}`, type: "PAYMENT", id: payment.id });
  }

  for (const expense of await db.expense.findMany({ where: { status: "PAID" }, orderBy: { expenseDate: "asc" } })) {
    if (!(await hasActiveJournal(db, "OTHER", expense.id))) {
      plans.push({
        label: `expense ${expense.expenseNumber}`,
        amount: money(expense.amount),
        run: async (deps, tx) => {
          const entry = await postExpensePaidJournal(deps, { expenseId: expense.id, expenseNumber: expense.expenseNumber, expenseDate: expense.expenseDate, amount: money(expense.amount), paymentMethod: expense.paymentMethod });
          if (entry !== null) await tx.expense.update({ where: { id: expense.id }, data: { journalEntryId: entry.id } });
        },
      });
    }
  }

  const orders = await db.purchaseOrder.findMany({
    where: { status: { in: ["PARTIALLY_RECEIVED", "RECEIVED"] } },
    include: { items: true },
    orderBy: { orderDate: "asc" },
  });
  for (const po of orders) {
    if (await hasActiveJournal(db, "PURCHASE_ORDER", po.id)) continue;
    const value = Math.round(po.items.reduce((total: number, item: { receivedQuantity: number; unitCost: unknown }) => total + item.receivedQuantity * money(item.unitCost), 0) * 100) / 100;
    plans.push({
      label: `stock received ${po.poNumber}`,
      amount: value,
      run: (deps) => postPurchaseReceivedJournal(deps, { purchaseOrderId: po.id, poNumber: po.poNumber, receivedDate: po.updatedAt, amount: value }),
    });
  }

  for (const payment of await db.supplierPayment.findMany({ orderBy: { paymentDate: "asc" } })) {
    const posted = await hasActiveJournal(db, "SUPPLIER_PAYMENT", payment.id);
    if (payment.status === "POSTED" && !posted) {
      plans.push({
        label: `supplier payment ${payment.paymentNumber} (${payment.paymentMethod})`,
        amount: money(payment.amount),
        run: (deps) => postSupplierPaymentJournal(deps, { supplierPaymentId: payment.id, paymentNumber: payment.paymentNumber, paymentDate: payment.paymentDate, amount: money(payment.amount), paymentMethod: payment.paymentMethod }),
      });
    }
    if (payment.status === "VOID" && posted) voids.push({ label: `voided supplier payment ${payment.paymentNumber}`, type: "SUPPLIER_PAYMENT", id: payment.id });
  }

  for (const hire of await db.externalRentalAgreement.findMany({ orderBy: { hireStartDate: "asc" } })) {
    if (hire.status === "RETURNED" && !(await hasActiveJournal(db, "EXTERNAL_RENTAL", hire.id))) {
      plans.push({
        label: `hire-in cost ${hire.agreementNumber}`,
        amount: money(hire.totalHireInCost),
        run: (deps) => postHireInCostJournal(deps, { agreementId: hire.id, agreementNumber: hire.agreementNumber, date: hire.updatedAt, amount: money(hire.totalHireInCost) }),
      });
    }
    if (money(hire.amountPaid) > 0 && !(await hasActiveJournal(db, "SUPPLIER_PAYMENT", hire.id))) {
      plans.push({
        label: `hire-in paid ${hire.agreementNumber}`,
        amount: money(hire.amountPaid),
        run: (deps) => postHireInPaymentJournal(deps, { agreementId: hire.id, agreementNumber: hire.agreementNumber, date: hire.updatedAt, amount: money(hire.amountPaid) }),
      });
    }
  }

  return { plans, voids };
}

async function main() {
  if (!BUSINESS) throw new Error("Set BUSINESS=<slug> or BUSINESS=all");
  const businesses = await runAsSystem("accounting catch-up: list businesses", () =>
    prisma.organization.findMany({
      where: BUSINESS === "all" ? {} : { slug: BUSINESS },
      select: { id: true, slug: true },
    }),
  );
  if (businesses.length === 0) throw new Error(`No business "${BUSINESS}"`);
  console.log(APPLY ? "APPLYING changes" : "DRY RUN (nothing is written; add APPLY=1 to write)");

  for (const business of businesses) {
    await runInOrganization(business.id, async () => {
      const owner = await prisma.user.findFirst({ where: { role: { name: "owner" }, isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
      if (!owner) {
        console.log(`\n${business.slug}: no active owner, skipped`);
        return;
      }
      const { plans, voids } = await planFor(prisma);
      console.log(`\n${business.slug}: ${plans.length} entries to add, ${voids.length} voided documents to take out`);
      for (const plan of plans) console.log(`  + ${plan.label}: PKR ${fmt(plan.amount)}`);
      for (const item of voids) console.log(`  - ${item.label}`);
      if (!APPLY || (plans.length === 0 && voids.length === 0)) return;

      const deps = createSharedDeps();
      await runWithRepositoryUnitOfWork(deps, async (context) => {
        const postingDeps: OperationalJournalPostingDeps = {
          accountRepository: createAccountRepositoryFromUnitOfWork(context),
          journalEntryRepository: createJournalEntryRepositoryFromUnitOfWork(context),
          userId: owner.id as UserId,
        };
        for (const item of voids) await voidOperationalJournals(postingDeps.journalEntryRepository, item.type as never, item.id);
        for (const plan of plans) await plan.run(postingDeps, context.tx as unknown as typeof prisma);
      });
      console.log(`  done`);
    });
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
